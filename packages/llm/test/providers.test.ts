import { describe, expect, test } from "bun:test";
import { normalizeBaseUrl } from "../src/providers.ts";

describe("normalizeBaseUrl", () => {
  test("剥掉误传的 /models 列表端点后缀", () => {
    expect(normalizeBaseUrl("http://aiproxy.ugreencloud.com/qwen35/v1/models")).toBe(
      "http://aiproxy.ugreencloud.com/qwen35/v1",
    );
  });

  test("已经是 /v1 时原样返回", () => {
    expect(normalizeBaseUrl("http://aiproxy.ugreencloud.com/qwen35/v1")).toBe(
      "http://aiproxy.ugreencloud.com/qwen35/v1",
    );
  });

  test("去掉末尾斜杠", () => {
    expect(normalizeBaseUrl("http://localhost:11434/v1/")).toBe("http://localhost:11434/v1");
  });
});
