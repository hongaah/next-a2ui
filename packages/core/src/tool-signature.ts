export interface ToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export interface ToolSignatureOptions {
  /**
   * 会改变 UI 结构的参数名。这些参数的**取值**进入签名，其余参数只有名字进入。
   * 典型例子：`getReport(format: "chart" | "table")` —— 数据相同但界面完全不同。
   */
  readonly structuralParams?: readonly string[];
}

/**
 * 把一次 tool 调用规范化成稳定的意图签名。
 *
 * 默认只取参数名集合，不取参数值：`getMovies(genre="sci-fi")` 与
 * `getMovies(genre="horror")` 的 UI 结构完全相同，应当共用同一个缓存条目。
 * 数据量差异由 dataShape 的长度分桶承担，不在这里区分。
 */
export function toolSignature(call: ToolCall, options: ToolSignatureOptions = {}): string {
  const structural = new Set(options.structuralParams ?? []);
  const parts = Object.entries(call.args)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => (structural.has(name) ? `${name}=${JSON.stringify(value)}` : name));
  return `${call.name}:${parts.join(",")}`;
}
