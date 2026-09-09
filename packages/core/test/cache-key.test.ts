import { describe, expect, test } from "bun:test";
import { type CacheKeyInput, cacheKeyOf } from "../src/cache-key.ts";

const base: CacheKeyInput = {
  toolSig: "getMovies:genre",
  dataShape: "array:len=6-20:fields=id,poster,rating,title",
  intentClass: "browse",
  variantId: "default",
  flowContext: null,
  catalogId: "movie-web",
  catalogVersion: "1.0.0",
};

describe("cacheKeyOf", () => {
  test("七个维度中任一变化都产生不同的 key", () => {
    const variants: CacheKeyInput[] = [
      { ...base, toolSig: "getMovies:genre,year" },
      { ...base, dataShape: "array:len=1:fields=id,title" },
      { ...base, intentClass: "compare" },
      { ...base, variantId: "cover-flow" },
      { ...base, flowContext: "booking:step2" },
      { ...base, catalogId: "movie-mobile" },
      { ...base, catalogVersion: "1.1.0" },
    ];

    const keys = new Set([cacheKeyOf(base), ...variants.map(cacheKeyOf)]);

    expect(keys.size).toBe(8);
  });
});
