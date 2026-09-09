import {
  actionCandidates,
  type Catalog,
  type CompileEvent,
  Compiler,
  candidates,
  describeShape,
  type IntentClass,
  type LLMClient,
  MemoryCacheStore,
  type ToolCall,
} from "@next-a2ui/core";

export interface GoldCase {
  readonly name: string;
  readonly toolCall: ToolCall;
  readonly data: unknown;
  readonly intentClass: IntentClass;
  readonly variantId?: string;
  /** 结构断言：候选集必须包含这些组件。 */
  readonly expectComponents?: readonly string[];
  /** 结构断言：候选集必须包含这些动作。 */
  readonly expectActions?: readonly string[];
}

export interface CaseFailure {
  readonly case: string;
  readonly kind: "missing-component" | "missing-action";
  readonly detail: string;
}

export interface EvalReport {
  readonly total: number;
  readonly hits: number;
  readonly hitRate: number;
  readonly gaps: number;
  readonly degraded: number;
  /**
   * 只统计真正算过候选集的用例（L2 与 gap）。命中 L0 时压根不计算候选集——
   * 那正是命中的意义——把它当 0 计入平均会凭空稀释这个指标。
   */
  readonly avgComponentCandidates: number;
  /**
   * 不同意图签名的数量。
   *
   * gold set 是刻意构造的**多样性**集合，不是**流量形状**的集合，所以它的
   * hitRate 会严重低估稳态表现。真实流量是同样这几个意图被反复打，稳态命中率
   * 趋近 (N - uniqueIntents) / N。要测真实命中率需要另一份按流量分布回放的集合。
   */
  readonly uniqueIntents: number;
  readonly failures: readonly CaseFailure[];
}

/**
 * 结构断言：候选集是否覆盖 gold set 的期望。
 *
 * 纯函数判定——免费、瞬时、永不 flake。这一层能表达的都不要交给 LLM judge。
 */
function assertCandidates(goldCase: GoldCase, catalog: Catalog): CaseFailure[] {
  const shape = describeShape(goldCase.data);
  const componentIds = new Set(candidates(catalog.components, shape).map((c) => c.id));
  const actionIds = new Set(
    actionCandidates(catalog.actions ?? [], Object.keys(goldCase.toolCall.args)).map((a) => a.id),
  );

  const failures: CaseFailure[] = [];
  for (const expected of goldCase.expectComponents ?? []) {
    if (!componentIds.has(expected)) {
      failures.push({ case: goldCase.name, kind: "missing-component", detail: expected });
    }
  }
  for (const expected of goldCase.expectActions ?? []) {
    if (!actionIds.has(expected)) {
      failures.push({ case: goldCase.name, kind: "missing-action", detail: expected });
    }
  }
  return failures;
}

export async function runEval(
  cases: readonly GoldCase[],
  options: { catalog: Catalog; llm: LLMClient },
): Promise<EvalReport> {
  const events: CompileEvent[] = [];
  const compiler = new Compiler({
    cache: new MemoryCacheStore(),
    llm: options.llm,
    telemetry: { compiled: (event) => events.push(event), interacted: () => {} },
  });

  const failures: CaseFailure[] = [];
  for (const goldCase of cases) {
    failures.push(...assertCandidates(goldCase, options.catalog));
    await compiler.compile({
      toolCall: goldCase.toolCall,
      data: goldCase.data,
      intentClass: goldCase.intentClass,
      catalog: options.catalog,
      ...(goldCase.variantId === undefined ? {} : { variantId: goldCase.variantId }),
    });
  }

  const count = events.length;
  const hits = events.filter((event) => event.source === "L0").length;
  const computed = events.filter((event) => event.source !== "L0");
  const totalCandidates = computed.reduce((sum, event) => sum + event.componentCandidates, 0);

  return {
    total: count,
    hits,
    hitRate: count === 0 ? 0 : hits / count,
    gaps: events.filter((event) => event.source === "gap").length,
    degraded: events.filter((event) => event.source === "fallback").length,
    avgComponentCandidates: computed.length === 0 ? 0 : totalCandidates / computed.length,
    uniqueIntents: new Set(events.map((event) => event.cacheKey)).size,
    failures,
  };
}
