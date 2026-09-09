/**
 * 同一 key 的并发执行只跑一次，其余等待复用结果。
 *
 * 不做的话，两个用户同时触发同一个未命中意图会重复付费，并可能为同一个 key
 * 写入两份不同的模板——缓存一旦不确定就不可信了。
 */
export class Singleflight {
  readonly #inflight = new Map<string, Promise<unknown>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.#inflight.get(key);
    if (existing !== undefined) return existing as Promise<T>;

    // 无论成功失败都要清理：singleflight 只去重"正在进行的"调用，不是缓存。
    // 失败的条目若留在表里，会毒化这个 key 上的所有后续编译。
    const started = fn().finally(() => {
      this.#inflight.delete(key);
    });
    this.#inflight.set(key, started);
    return started;
  }
}
