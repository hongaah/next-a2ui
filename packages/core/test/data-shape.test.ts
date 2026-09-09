import { describe, expect, test } from "bun:test";
import { dataShape } from "../src/data-shape.ts";

const movie = (id: number) => ({ id, title: `M${id}`, poster: "p.jpg", rating: 8.1 });
const movies = (n: number) => Array.from({ length: n }, (_, i) => movie(i));

describe("dataShape 长度分桶", () => {
  test("同一桶内的不同长度产生相同 shape", () => {
    expect(dataShape(movies(11))).toBe(dataShape(movies(12)));
  });
});

describe("dataShape 字段集合", () => {
  test("元素字段不同则 shape 不同", () => {
    const withPoster = dataShape([{ id: 1, title: "M", poster: "p.jpg" }]);
    const withoutPoster = dataShape([{ id: 1, title: "M" }]);

    expect(withPoster).not.toBe(withoutPoster);
  });

  test("元素字段顺序不影响 shape", () => {
    const a = dataShape([{ id: 1, title: "M", rating: 8.1 }]);
    const b = dataShape([{ rating: 8.1, title: "M", id: 1 }]);

    expect(a).toBe(b);
  });
});

describe("dataShape 异构数组", () => {
  test("元素字段不一致时，shape 与元素顺序无关", () => {
    const posterFirst = dataShape([{ id: 1, poster: "p.jpg" }, { id: 2 }]);
    const posterLast = dataShape([{ id: 2 }, { id: 1, poster: "p.jpg" }]);

    expect(posterFirst).toBe(posterLast);
  });

  test("只出现在部分元素上的字段不计入 shape", () => {
    const partial = dataShape([{ id: 1, poster: "p.jpg" }, { id: 2 }]);
    const guaranteed = dataShape([{ id: 1 }, { id: 2 }]);

    expect(partial).toBe(guaranteed);
  });
});

describe("dataShape 单个对象", () => {
  test("取值不同但字段相同的对象产生相同 shape", () => {
    const dune = dataShape({ id: 1, title: "Dune", rating: 8.1 });
    const blade = dataShape({ id: 2, title: "Blade Runner", rating: 8.9 });

    expect(dune).toBe(blade);
  });

  test("单个对象与含单个元素的数组 shape 不同", () => {
    const single = dataShape({ id: 1, title: "Dune" });
    const list = dataShape([{ id: 1, title: "Dune" }]);

    expect(single).not.toBe(list);
  });
});
