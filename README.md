# next-a2ui

把**现有 app 渐进式迁移到生成式 UI** 的编译引擎，基于 [A2UI](https://a2ui.org/) v1.0 协议。

不取代手写 UI。高频页面被访问上亿次，值得工程师精雕，运行成本为 0，应当永远手写。
生成式 UI 的战场是长尾——三个月才有人用一次的功能、排不上期的需求、每个客户都要一点
不一样的界面。

## 核心范式

> **UI 是编译产物，不是模型产物。**

市面方案都是「生成器」——每次请求现场生成。本项目是「编译器 + JIT 缓存」——热路径
0 次模型调用。

```
agent（零改动，正常调 tool，输出 0 个 UI token）
   │  AG-UI 事件流
   ▼
编译中间件
   ├─ tool 签名 + 数据形状 + 意图 → cacheKey
   ├─ L0 命中  → 取模板，绑数据            0 次模型调用
   ├─ L2 未命中 → 类型算候选集 → 受约束解码 → 验证 → 回写 L0
   └─ 失败      → 降级链
   ▼
A2UI v1.0 消息 → <GenerativeSlot> 嵌进现有页面
```

## 五个机制

| 机制 | 解决 |
|---|---|
| tool 签名作缓存 key，结构与数据分离 | 低成本 · 快 |
| 类型算候选集，模型只在几个候选里排序 | 准 · 快 |
| JIT 晋升：L2 产物验证后回写 L0 | 系统自己变好 |
| 变体池 + 埋点 | 个性化，成本 ×变体数而非 ×用户数 |
| 降级链 + slot 局部隔离 | 敢上生产 |

## 包结构

```
packages/core       编译器 · cacheKey · 候选集 · 缓存 · 降级 · 变体池
                    零 I/O、零框架依赖，可脱离浏览器与网络跑 eval
packages/contract   从 TS 类型旁挂抽取契约（构建期）· 漂移检测
packages/llm        受约束解码 · 分层模型（本地小模型跑意图，大模型跑编译）
packages/adapter    AG-UI 中间件 · A2UI v1.0 消息与 catalog 生成
packages/runtime    薄 v1.0 渲染层 · GenerativeSlot · 宿主桥接
packages/eval       gold set · 命中率/候选集/合规指标
apps/movie          影视 demo
```

## 跑起来

模型分层：本地 Ollama 跑意图分类（高频），网关大模型跑 L2 编译（低频）。

```bash
bun install
bun run verify          # catalog + typecheck + lint + test + eval

# 内网网关与 localhost 都不能走代理
env -u http_proxy -u https_proxy -u all_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY \
  NO_PROXY='localhost,127.0.0.1,::1,aiproxy.ugreencloud.com' \
  no_proxy='localhost,127.0.0.1,::1,aiproxy.ugreencloud.com' \
  bun run smoke         # 端到端：真模型 → 编译 → A2UI 消息 → HTML

cd apps/movie && bun run dev    # http://localhost:3210
```

环境变量：`AICONSOLE_OPENAI_HTTP_BASE_URL`、`NEXT_A2UI_LARGE_MODEL`、
`NEXT_A2UI_SMALL_BASE_URL`、`NEXT_A2UI_SMALL_MODEL`。

## 设计文档

`docs/superpowers/specs/2026-09-09-generative-ui-engine-design.md`

## 参考

- [A2UI Protocol v1.0](https://a2ui.org/specification/v1.0-a2ui/)
- [AG-UI](https://docs.ag-ui.com/)

## License

MIT
