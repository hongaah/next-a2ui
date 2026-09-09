import { describe, expect, test } from "bun:test";
import { toolSignature } from "../src/tool-signature.ts";

describe("toolSignature", () => {
  test("参数取值不同但参数名相同时，签名相同", () => {
    const sciFi = toolSignature({ name: "getMovies", args: { genre: "sci-fi" } });
    const horror = toolSignature({ name: "getMovies", args: { genre: "horror" } });

    expect(sciFi).toBe(horror);
  });
});

describe("toolSignature 未提供的参数", () => {
  test("值为 undefined 的参数视为未提供", () => {
    const explicit = toolSignature({
      name: "getMovies",
      args: { genre: "sci-fi", sort: undefined },
    });
    const omitted = toolSignature({ name: "getMovies", args: { genre: "sci-fi" } });

    expect(explicit).toBe(omitted);
  });
});

describe("toolSignature 结构性参数", () => {
  test("被声明为结构性的参数，其取值进入签名", () => {
    const chart = toolSignature(
      { name: "getReport", args: { period: "2026Q1", format: "chart" } },
      { structuralParams: ["format"] },
    );
    const table = toolSignature(
      { name: "getReport", args: { period: "2026Q1", format: "table" } },
      { structuralParams: ["format"] },
    );

    expect(chart).not.toBe(table);
  });

  test("未被声明为结构性的参数，其取值仍不进入签名", () => {
    const q1 = toolSignature(
      { name: "getReport", args: { period: "2026Q1", format: "chart" } },
      { structuralParams: ["format"] },
    );
    const q2 = toolSignature(
      { name: "getReport", args: { period: "2026Q2", format: "chart" } },
      { structuralParams: ["format"] },
    );

    expect(q1).toBe(q2);
  });
});
