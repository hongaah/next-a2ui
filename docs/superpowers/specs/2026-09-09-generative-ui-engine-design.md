# next-a2ui：渐进式生成式 UI 编译引擎

**日期**：2026-09-09
**状态**：设计已确认，待写实现计划

---

## 1. 定位

把**现有 app 渐进式迁移到生成式 UI** 的编译引擎。

不取代手写 UI。高频页面（首页、列表、详情）被访问上亿次，值得工程师精雕，运行成本为 0，应当永远手写。生成式 UI 的战场是**长尾**：三个月才有人用一次的功能、排不上期的需求、每个客户都要一点不一样的界面——手写 ROI 最低、积压最多的那部分。

因此"低成本"有两层含义：

1. token 成本低（热路径 0 次模型调用）
2. **新功能的边际开发成本趋近于零**

第二层才是这个项目真正的卖点。

## 2. 核心范式

> **UI 是编译产物，不是模型产物。**

市面上所有方案（Thesys、Vercel AI SDK 的 generative UI、v0）都是**生成器**——每次请求现场生成。本项目是**编译器 + JIT 缓存**——热路径 0 次模型调用。

这是范式差异，不是优化差异。所有设计决策都从这一条推导。

### 2.1 关键杠杆：结构与数据分离

A2UI 协议自带这条缝：`updateComponents`（结构）与 `updateDataModel`（数据）是两条独立消息。

- **结构可缓存**：同一意图 + 同一 catalog，surface 骨架每次都一样
- **数据不由模型生成**：数据来自 tool/API，模型只输出绑定路径 `{"path": "/movies/0/rating"}`

模型复述数据是当前生成式 UI 最大的成本浪费，也是幻觉的主要来源。本引擎中模型**永不输出数据**。

### 2.2 与 Google async A2UI 的差异

Flutter 团队的 [async A2UI](https://flutter.dev/blog/speeding-up-generative-ui-with-async-a2ui) 也做预生成缓存，但缓存的是「按业务对象 ID 存的、数据已填死的完整 surface」（key = `jobId`）。文章自承三个未解问题：多用户并发、缓存失效、实时数据更新。

这三个问题是该缓存粒度的必然结果：

| | Google async A2UI | 本项目 |
|---|---|---|
| 缓存 key | `jobId`（每个业务对象一份） | 意图签名（每类意图一份） |
| 缓存内容 | 完整 surface，数据已填死 | **无数据的结构模板** |
| 10 万个订单 | 10 万份缓存 | 1 份模板 |
| 数据变化 | 缓存失效，重新调 LLM | 模板不动，只换绑定 |
| 多用户 | 每人一份 | 共享模板，变体池 ×N |

结构/数据分离是 A2UI 协议本来就有的能力，Google 自己的缓存实践没用上。这个缝是本项目的位置。

## 3. 架构总览

```
用户 query
   │
   ▼
agent（零改动，正常调 tool 干活，输出 0 个 UI token）
   │  AG-UI 事件流：TOOL_CALL / TOOL_RESULT / STATE
   ▼
┌──────────────────────────────────────────────┐
│  编译中间件（本项目的全部资产）                 │
│                                              │
│  1. 从 tool 事件算 cacheKey                   │
│  2. L0 命中 → 取模板，绑数据       0 次调用    │
│     L1 半命中 → 小模型填槽位      ~100 token  │
│     L2 未命中 → 候选集 + 约束解码  ~800 token  │
│                 验证通过 → 回写 L0             │
│  3. 失败 → 降级链                             │
│  4. 候选集为空 → capability gap 上报           │
│                                              │
│  产出 { actions[], surface? }                 │
│  经 AG-UI CUSTOM event 下发                   │
└──────────────────────────────────────────────┘
   │
   ▼
CopilotKit 前端 + <GenerativeSlot> + @a2ui/react
```

**关键点：agent 不知道 UI 存在。** 它正常调 tool、正常拿数据，编译器在事件流后面观察并决定 UI。好处：

- 成本下限——agent 产出 0 个 UI token
- 同一份 tool 结果可编译成多端 UI
- 可套在任何现成 agent 上，不改 prompt、不加 tool、不换模型

代价：agent 失去 UI 主动控制权。这个代价该付——**让模型决定布局正是当前生成式 UI 又慢又贵又不一致的根因**。留 `uiHint` 逃生口即可。

## 4. 核心机制

### 4.1 tool 签名即意图签名

意图签名不做 embedding 语义检索（不可靠、不可解释、难调试）。agent 调了哪个 tool、传了什么参数、返回了什么类型的数据——这三件事结构化、精确、可 hash。

```ts
interface CacheKey {
  toolSig: string           // "getMovies:genre=sci-fi,yearGte=2024" 规范化后 hash
  dataShape: string         // "Movie[]:len=10-50:fields=id,title,poster,rating"
  intentClass: IntentClass  // 唯一需要模型的部分，5-8 分类，~10 token
  variantId: string         // 'default' | 'cover-flow' | 'dense-list' | ...
  flowContext: string | null   // 预留给流程编排，MVP 恒为 null
  catalogId: string
  catalogVersion: string
}

type IntentClass =
  | 'browse' | 'detail' | 'compare' | 'filter'
  | 'confirm' | 'edit' | 'explain'
```

前两项**免费**——agent 本来就要调 tool，不额外花 token。`intentClass` 是唯一需要模型判断的。MVP 用小模型 + 结构化输出实现（约 10 token）；微调分类器作为后续优化，接口不变。

**关键细节**：`dataShape` 的长度必须**分桶**（`len=10-50`）而非精确值，否则 `len=11` 与 `len=12` 是两个 key，命中率崩溃。

对比：微软 [GenCache](https://arxiv.org/pdf/2511.17565) 用模糊语义 key 做到 83% 命中率、省 35% 成本。本方案 key 是结构化精确匹配，命中率上限应显著更高，且**可解释、可写单测、可在 dashboard 上看出哪个意图没命中**。

### 4.2 类型驱动候选集：把「生成」降级成「选择」

组件的数据契约 + API 返回类型 ⇒ 能渲染这份数据的组件**可静态计算**。

```
candidates(dataShape) = { c ∈ catalog | schemaCompatible(c.accepts, dataShape) }
```

`schemaCompatible` 是结构子类型判断：`MovieCard.accepts = {title, poster, rating}`，数据为 `{id, title, poster, rating, director}` → 兼容（数据是超集）。

模型面对的不再是"从 80 个组件里组合界面"，而是"这 3 个候选里排序"。

这一招把 L2 搜索空间砍掉约 99%，**快与准同时解决**（不是 trade-off）。并且顺带消灭两类事故：引用不存在的组件、绑定不存在的字段——因为候选集从真实类型推出，物理上不可能悬空。

`candidates` 为空 → 触发 capability gap 上报（见 4.6）。

### 4.3 JIT 晋升

L2 编译产物经验证后**参数化回写 L0**，成为可复用模板。系统跑得越久命中率越高。

与 JIT 编译同构：先解释执行，profiling 出热路径，编译，之后全走编译产物。

**"低成本又快"因此从模型能力问题变成缓存命中率问题**——后者可纯工程解决。

### 4.4 变体池与个性化

个性化与缓存看似矛盾。解法是把个性化放在正确的层：

| 层 | 个性化程度 | 缓存性 | 成本 |
|---|---|---|---|
| 结构（组件树） | 几乎不变 | 极高 | 0 |
| 变体（同一意图的不同呈现） | 小基数离散，N≈3-8 | 高，条目 ×N | 0 |
| 数据 | 完全个性化 | 不缓存也不需要 | 0，来自推荐 API |

**个性化成本 = 缓存条目数 × N，而非 × 用户数。** 按用户画像簇缓存，不按用户缓存。

L2 的职责由此改变：不是"为这个用户生成 UI"，而是**"为这个意图扩充变体池"**。

变体选择用 **multi-armed bandit，不用 LLM**——毫秒级、可度量、可 A/B、可归因。这把"个性化 UI"从模糊的 AI 卖点变成可优化的推荐问题：能拿出"变体 C 对这批用户完成率高 18%"这种数字。

MVP 只做变体池结构 + 手动切换 + 交互埋点，bandit 算法后置（见 §7）。

### 4.5 降级链

**敢不敢上生产，不取决于生成得多好，取决于生成失败时会怎样。** 降级是产品的一部分，不是异常处理。

```
L2 编译失败 / 超时 / 验证不通过
  → 同 key 上一个成功模板（stale-while-revalidate）
  → 同 intentClass 的通用兜底模板
  → 宿主提供的静态兜底组件
  → 纯文字 + "用经典视图打开"
```

**降级作用域**为 `slot | flow`（flow 预留）。一个 slot 挂掉，页面其余部分完好。任何 slot 都能一键切回老实现。

### 4.6 capability gap 上报

候选集为空、或编译连续失败时，记录结构化的"编译不出来"事件进待办队列。

没有这个，JIT 晋升的反馈回路是断的——你不知道 catalog 该往哪长。这是**本引擎不做 open-ended 生成的前提条件**：不靠运行时生成 HTML 补长尾，靠离线补 catalog。一次投入永久受益，且不破坏缓存、类型安全、设计一致性、降级这四条。

### 4.7 singleflight

同 cacheKey 的并发 L2 编译只执行一次，其余等待复用。

不做则：重复付费，且同一 key 可能写入不同模板，缓存变得不可信。约 20 行代码。

## 5. 契约层

### 5.1 硬约束：旁挂，不改组件源码

catalog 里的 `MovieCard` **就是**老页面正在用的那个 `MovieCard`，同一个文件。设计一致性因此是物理保证的，老组件改了生成式 UI 自动跟着改。

推论：**契约必须旁挂**。一旦要求"给每个组件加装饰器/加 props"，渐进式就死了——没人愿意为一个实验功能改 200 个稳定组件。

实现：独立 `*.contract.ts` 文件 + 从 TS 类型自动抽取（TypeScript Compiler API / ts-morph），组件源码零改动。

### 5.2 硬约束：契约不得包含平台概念

契约只描述「吃什么数据 / 发什么语义事件」。事件叫 `onSelect` 不叫 `onClick`；尺寸叫 `density` 不叫 `width`；禁止出现 `className`、`ReactNode`、DOM 相关类型。

一旦污染，多端扩展就永久回不来了。成本为零，纯纪律问题。

### 5.3 数据结构

```ts
// 组件契约 —— 决定「生成什么」
interface ComponentContract {
  id: string
  accepts: JSONSchema              // 数据契约 → 候选集计算
  emits: SemanticEvent[]           // 语义事件（非 DOM 事件）
  semantics: {
    use: string                    // "展示单部影片，强调封面与评分"
    avoid: string                  // "不要用于超过 20 条的列表"
  }
  density: 'compact' | 'normal' | 'rich'
}

// 动作契约 —— 决定「控制什么」
interface ActionContract {
  id: string                       // "setFilter"
  params: JSONSchema
  semantics: { use: string; avoid: string }
  scope: 'page' | 'app'
  reversible: boolean              // 不可逆动作需用户确认后执行
}
```

两者共用同一条抽取管线。`semantics` 字段必须人写或模型写+人审——**它的质量上限就是整个系统准确率的上限**，也是最难被抄走的资产。

`reversible` 决定 agent 能否自主执行：不可逆动作（下单、删除）必须先渲染确认 surface。

## 6. 分层与依赖纪律

```
packages/contract   契约抽取（ts-morph）
                    构建期工具，不进运行时

packages/core       编译器 · cacheKey · 候选集 · 缓存 · 降级链 · 变体池 · singleflight
                    依赖仅限纯数据处理库（zod / ajv）
                    LLM 经注入的 LLMClient 接口调用，core 不绑定任何 provider SDK
                    禁止依赖：CopilotKit · React · A2UI 传输 · 任何网络 I/O
                    ← 全部价值在此，可脱离浏览器与网络跑 eval

packages/llm        LLMClient 的 Vercel AI SDK 实现
                    薄，可替换

packages/adapter    AG-UI 中间件 · A2UI 消息生成
                    薄，可替换

packages/runtime    <GenerativeSlot> · host bridge · 降级 UI
                    基于 CopilotKit + @a2ui/react
```

拆出 `packages/contract` 与 `packages/llm` 的理由：契约抽取是构建期行为，LLM 调用是 I/O 边界，两者都不该混进编译器内核。core 因此可以在无网络、无浏览器的环境下完整跑测试与 eval——这是 §13.4 的 CI gate 能成立的前提。

### 6.1 为什么基于 CopilotKit

它白送四样东西，自写至少两个月且无差异化：

1. **Action registry**（`useFrontendTool` / in-app actions）= 阶梯 1 的现成实现
2. **AG-UI 传输层**：双向流、tool call 事件、输出流
3. **Shared state**（typed store + event-sourced diffs）= host bridge 的宿主上下文注入
4. **A2UI 渲染管线**：`createA2UIMessageRenderer` 直接可用

### 6.2 必须解决的心智冲突

CopilotKit 的模型是「把组件/动作作为 tool 暴露给 agent，**agent 自己决定调哪个**」，与本项目的「agent 不知道 UI 存在」相反。顺着它的默认用法写，会退化成"又一个 CopilotKit 应用"。

解法：**AG-UI 是事件流协议，我们做事件流的中间件**。拦截 tool 事件 → 编译 → 通过 AG-UI **CUSTOM event**（官方定义为"协议未覆盖需求的开放数据交换"）注入编译产物。agent 侧不变、前端侧不变，我们插在中间。CopilotKit 运行时本身有中间件概念（`MCPAppsMiddleware` 为证）。

### 6.3 依赖纪律（不可破）

**`packages/core` 不得 import CopilotKit、React、A2UI 传输层、任何 LLM provider SDK，或任何执行网络 I/O 的代码。**

允许的依赖仅限纯数据处理库（zod、ajv）。LLM 能力通过构造时注入的 `LLMClient` 接口获得，实现放在 `packages/llm`。

破了这条，本项目就从"一个引擎"降级为"CopilotKit 的一个插件"。AG-UI 生态仍在快速变化（v0.9 才发布，transport 层还在扩），守住这条线则换生态只需重写 adapter。

### 6.4 已确认的空白点

翻查 [CopilotKit/generative-ui](https://github.com/CopilotKit/generative-ui) 全部示例，生成式 UI **全部活在 chat 消息流里**（`renderActivityMessages`），无一嵌入现有页面。`<GenerativeSlot>` 必须自研。

## 7. 渐进阶梯与 MVP 范围

### 7.1 五级阶梯

每级独立可用、独立有价值、随时可停。

```
阶段 0  agent 只会说话                        ← 今天所有人的位置
阶段 1  agent 操控现有 UI（action-only）       ← 零 UI 改造
阶段 2  agent 在 slot 里选组件（controlled）   ← 注册几个组件
阶段 3  agent 在 slot 里自由组合（declarative）← catalog 成型
阶段 4  agent 生成整页                        ← slot 密度拉满
```

阶段 1 是入口：一天接完、立刻见效、风险接近零。没有这一级，团队迈不出第一步。

CopilotKit 画的[生成式 UI 光谱](https://www.copilotkit.ai/generative-ui-spectrum)最低只到 Controlled，**漏掉了 action-only 这一级**——它最便宜、最快、最准、零改造。

### 7.2 编译器输出统一三种模式

```ts
interface CompileResult {
  actions: ActionInvocation[]        // 阶段 1
  surface: A2UISurface | null        // 阶段 2+
  source: 'L0' | 'L1' | 'L2' | 'fallback'
  templateId: string
  degraded: DegradeReason | null
  capabilityGap: CapabilityGap | null
}
```

纯动作 / 动作+slot / 纯生成三种模式共用一个编译器。传输载体用 A2UI 的 `callRendererFunction`，无需发明新协议。

### 7.3 整页生成 = 布局 + N 个 slot

整页**不能**做成"一个巨大的 slot"——缓存粒度回到整页则命中率崩溃、首屏变慢。

```
Page = 布局模板（很小，易缓存）+ [slot_a, slot_b, slot_c] 引用
                                    ↓ 各自独立缓存、独立命中、并行编译
```

1. **缓存复用**：`slot_影片摘要` 在详情页和首页是同一条目。页面越多命中率越高。
2. **流式首屏**：布局先出骨架，各 slot 并行填充。某 slot 走 L2 慢路径时其余已可交互。
3. **降级局部化**：一个 slot 挂掉不影响页面其余部分。

渐进式迁移与整页生成因此是同一套原语，只是 slot 密度不同。

### 7.4 MVP 范围（阶梯 1+2）

**做**

- 契约抽取管线（TS 类型 → ComponentContract / ActionContract）
- 编译器核心：cacheKey 计算、候选集、约束解码、L0/L2 两级缓存、JIT 晋升
- singleflight
- 降级链（作用域字段支持 `slot | flow`，flow 不实现）
- capability gap 上报 + 待办列表页
- 变体池数据结构 + 手动切换 + 交互事件埋点（曝光/点击/完成/停留，**只记录不使用**）
- AG-UI 中间件 adapter
- `<GenerativeSlot>` + host bridge（上下文注入 + action 回路由）
- 影视 demo
- eval harness

**不做**

| 不做的 | 缺失能力 | 为什么安全 |
|---|---|---|
| 流程编排实现（状态机、跨 slot 通信） | 多步骤流程 | `flowContext` 字段与 flow 降级作用域已在数据结构中预留 |
| 第二个 catalog | 多端复用 | A2UI 自带 `catalogId`；靠 §5.2 纪律守住 |
| open-ended HTML 生成 | catalog 外的长尾 | **长期不做**；靠 capability gap → 离线补 catalog 替代 |
| bandit 算法 | 自动个性化 | 变体池结构与埋点已就位，接上即有历史数据 |

**预留字段是硬要求，不是可选项。** `flowContext` 与 flow 降级作用域若不在 MVP 写死进 core 数据结构，后期补要改 cacheKey、slot 生命周期、host bridge 三处核心。

## 8. 影视 demo

作为"已有 app"的真实形态，同时承担对外展示。选它是因为它天生能演三件难演的事。

### 8.1 演示场景

| 场景 | 用户说 | 系统做 | 演什么 |
|---|---|---|---|
| action-only | "只看 2024 年以后的" | `setFilter({yearGte:2024})`，现有列表页自己动 | 零 UI 改造、~20 token |
| slot 选组件 | "《沙丘3》怎么样" | 详情 slot 渲染 `MovieDetailCard` | 类型驱动候选集 |
| 变体 | 同一"推荐"意图 | 手动切三种呈现 | 个性化，成本不随用户数涨 |
| capability gap | "按年份画个时间轴" | 记录 gap，降级到文字 | 系统知道自己不会什么 |
| 缓存 | 重复同类查询 | L0 命中，0 次模型调用 | 命中率与成本硬数据 |

### 8.2 结构

- 一个**手写**的经典影视列表页（迁移的起点，永远保留）
- 页面内嵌 1-2 个 `<GenerativeSlot>`
- 一条整页生成的路由（阶段 4 的最小演示：布局 + 3 个 slot）
- 每个 slot 都有「切回经典视图」入口

## 9. 技术栈

- **Bun 1.3.14**：包管理（workspace）、测试（`bun test`）、TS 运行时
- **API 服务**：`Bun.serve` + `bun:sqlite`（影视数据）
- **Web**：Next.js App Router（README 既有承诺），通过 Bun 运行
- **协议**：A2UI v0.9+、AG-UI
- **前端运行时**：CopilotKit + `@a2ui/react`

依赖纪律见 §6.3：`packages/core` 不依赖 Next.js、React、CopilotKit 或任何 provider SDK；具体库选型见 §13.2。

## 10. 成功指标

MVP 必须能拿出硬数据，否则"低成本又快又准"不可证。

| 指标 | MVP 目标 | 稳态目标 |
|---|---|---|
| L0 命中率 | > 70% | > 90% |
| 每次交互平均 output token | 对比"模型直出 UI"基线降低 > 10× | > 50× |
| 首屏 P50（L0 命中） | < 100ms | < 50ms |
| schema 合法率 | 100% | 100% |
| 绑定悬空率 | 0 | 0 |
| 意图匹配率（人工标注集） | > 85% | > 95% |
| capability gap 率 | 有基线即可 | 单调下降 |

前两项是"低成本"，第三项是"快"，四至六项是"准"。schema 合法率与绑定悬空率的目标是绝对值，由两道机制共同保证：provider 原生约束解码使模型在 token 层面无法产出非法结构（§13.2），候选集由真实类型推导使悬空引用不可能构造（§4.2）。若测出非零，说明实现有 bug，而非模型能力不足。

## 11. 竞品格局（2026-09）

| 项目 | 解决什么 | 关系 |
|---|---|---|
| [AG-UI](https://docs.ag-ui.com/)（CopilotKit + LangChain） | 传输层，"怎么说"。Google/微软/AWS/Oracle 已采纳 | **地基** |
| [A2UI](https://github.com/a2ui-project/a2ui)（Google） | UI 描述规范，"说什么"。v0.9，多端 renderer 齐备 | **地基** |
| Vercel AI SDK | tool call → 手写组件，20M+ 月下载 | 停在 Controlled 级，覆盖不了长尾 |
| Thesys C1 / Crayon | 模型直出 UI JSON tree（2026-01，13K stars） | **最接近的竞品**，但每次现生成，无编译无缓存 |
| v0 类 | 直出 HTML/SVG | Open-ended，贵、慢、不稳 |

**没有人在做编译器/缓存这一层。**

三点独特性：

1. **UI 是编译产物而非模型产物**——范式差异
2. **类型系统算候选集**，把生成降级成选择——未见任何一家在做
3. **action-first 渐进阶梯 + slot 嵌入现有页面**——所有人的接入方式都是"新建一个 chat 界面"

附加优势：后置编译层意味着 **agent 侧零改动**，接入成本在推广上是决定性的。

## 12. 主要风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| L0 命中率不达标 | 核心赌注失效 | eval harness 先行；`dataShape` 分桶粒度可调；命中率按意图归因，可定位 |
| `semantics` 标注质量差 | 准确率上限被锁死 | MVP 组件数控制在 15-20 个，人工精写；建立标注规范 |
| CopilotKit 中间件插不进去 | adapter 层需自写传输 | core 零依赖使损失被隔离在 adapter；已确认 AG-UI 有 CUSTOM event |
| `flowContext` 预留不足 | 流程编排仍需改 core | 实现前用一个真实多步场景（订票）做数据结构走查 |
| 契约抽取被 TS 复杂类型卡住 | 管线退化为手写 | 允许手写 fallback；抽取覆盖率作为可观测指标而非阻塞项 |

## 13. 工程标准与选型原则

### 13.1 原则

**优先社区成熟方案，一开始就按高标准建，后续只做渐进式补能力。**

项目的差异化在编译器、缓存、契约三层，不在基础设施。任何自写的通用能力（schema 校验、TS 类型抽取、LLM provider 抽象、可观测性）都是无差异化的苦活，还会拖慢核心。

同时地基一旦立低，"渐进式补能力"会退化成"渐进式还债"——而渐进式正是本项目的整个卖点，地基必须一路撑到阶段 4（整页生成）。

**自写需要明确理由**：要么是差异化资产，要么确无可用方案。

### 13.2 选型

| 用途 | 选型 | 理由 |
|---|---|---|
| Schema 单一事实源 | **Zod v4** | 2026 TS 事实标准；`z.toJSONSchema()` 直出 A2UI catalog 需要的 JSON Schema；与 AI SDK 一行对接 |
| 结构化生成 / provider 抽象 | **Vercel AI SDK**（`generateObject`） | 仅用其结构化生成与 provider 抽象，**不用其 generative UI**（那是竞品面） |
| 约束解码 | **provider 原生 strict mode** | OpenAI / Anthropic / Gemini 2026 均支持，模型在 token 层面无法产出非法 JSON；边界处再用 Zod 兜一次 |
| 第三方 catalog 校验 | **ajv** | A2UI catalog 是裸 JSON Schema，外部 catalog 需运行时校验 |
| 契约抽取 | **ts-morph** | 封装 TS Compiler API，避免直接操作底层 |
| A2UI 协议与渲染 | **@a2ui/web_core** + **@a2ui/react** | 官方包已实现 3000+ 行协议、状态管理与校验，不重造 |
| 传输与前端运行时 | **CopilotKit** + **AG-UI** | 见 §6.1 |
| 缓存存储 / demo 数据 | **bun:sqlite** | Bun 内置零依赖；置于 `CacheStore` 接口之后，后期可换 Redis |
| 可观测性 | **OpenTelemetry** | 命中率、成本、延迟、gap 率四类指标从第一天就位 |
| Lint + Format | **Biome** | 单一工具覆盖两件事，速度足够 |

**不引入依赖的**：singleflight（约 20 行）、bandit（MVP 不做）。

### 13.3 agent 框架：core 不用，demo 用两个

**core / llm / adapter 不引入 LangChain / LangGraph。** core 是确定性管线加一次结构化输出调用，没有图、没有检查点、没有工具循环——LangGraph 的全部价值我们一样都用不上。更硬的理由是它会拖进 provider SDK 与网络 I/O，直接违反 §6.3，使 core 无法离线跑 eval，§13.4 的 CI gate 随之失效。L2 那一次调用的正确形状是 `generateObject`。

**demo 侧刻意接两个不同的 agent**，顺序如下：

1. 最小 TS tool-loop agent（AI SDK，几十行），先把 adapter 跑通
2. 再接 LangGraph agent —— AG-UI 与 LangGraph 是一方集成（`CopilotKitMiddleware` 让 graph 直接说 AG-UI wire protocol）

顺序不能反。核心主张是"能套在任何现成 agent 上，agent 零改动"，而证明它最有力的方式不是用某个框架，是**接两个完全不同的 agent 而 adapter 一行不改**。先上 LangGraph 会让我们不自觉地照着它的形状设计 adapter，"支持任何 agent"就成了空话。

务实提示：AG-UI × LangGraph 的成熟路径目前是 Python 优先（`ag-ui-langgraph` 在 PyPI）。走 LangGraph JS 还是单起 Python agent 服务，留到第 2 步再定。

未来 `flowContext` 那条线做流程编排时 LangGraph 确实合适，但那属于宿主 agent 的职责，仍不进 compiler。

### 13.4 eval 策略

遵循"从最便宜的工具开始"，但**高标准体现在流程而非框架**：

- **gold set 进版本库**：意图 → 期望候选集 / 期望 action，人工标注，可 diff、可 review
- **判定函数分层**：结构断言（schema 合法、绑定不悬空、候选集包含期望组件）优先——免费、瞬时、不 flaky；LLM judge 只用于结构断言表达不了的"意图匹配度"
- **CI gate**：typecheck + `bun test` + gold set 回归，命中率与 token 成本回归超阈值即失败

暂不引入 Evalite / promptfoo。等 case 数上百、多人并行跑 eval 时再接——那时接入成本仍然很低，而现在引入会把简单问题复杂化。

### 13.5 代码标准（第一天即生效，不列为"以后补"）

- TS `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`
- `packages/core` 关键路径（cacheKey 计算、候选集、降级链、singleflight）必须有测试
- 所有编译决策产出结构化日志：cacheKey、命中层级、候选集大小、耗时、token 数、降级原因
- §5.2（契约无平台概念）与 §6.3（core 零依赖）作为 CI 可检查的约束，不靠自觉
