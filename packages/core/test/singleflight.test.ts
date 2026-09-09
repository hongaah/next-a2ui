import { describe, expect, test } from "bun:test";
import { Singleflight } from "../src/singleflight.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Singleflight", () => {
  test("同一 key 的并发调用只执行一次底层函数", async () => {
    const gate = deferred<string>();
    let executions = 0;
    const compile = () => {
      executions += 1;
      return gate.promise;
    };
    const sf = new Singleflight();

    const first = sf.run("k", compile);
    const second = sf.run("k", compile);
    gate.resolve("surface");

    expect(await first).toBe("surface");
    expect(await second).toBe("surface");
    expect(executions).toBe(1);
  });
});

describe("Singleflight 完成后的清理", () => {
  test("前一次完成后，同 key 的新调用会重新执行", async () => {
    let executions = 0;
    const compile = async () => {
      executions += 1;
      return "surface";
    };
    const sf = new Singleflight();

    await sf.run("k", compile);
    await sf.run("k", compile);

    expect(executions).toBe(2);
  });

  test("失败不会毒化同 key 的后续调用", async () => {
    const sf = new Singleflight();

    const failing = sf.run("k", () => Promise.reject(new Error("编译失败")));
    await expect(failing).rejects.toThrow("编译失败");

    await expect(sf.run("k", async () => "surface")).resolves.toBe("surface");
  });
});
