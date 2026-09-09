export type ShapeDescriptor =
  | {
      readonly kind: "array";
      readonly lengthBucket: string;
      /** 该分桶覆盖的长度区间（闭区间，上界可为 Infinity）。 */
      readonly lengthRange: readonly [number, number];
      readonly fields: readonly string[];
    }
  | { readonly kind: "object"; readonly fields: readonly string[] }
  | { readonly kind: "scalar"; readonly type: string };

/**
 * 长度分桶。基数是 UI 结构的强信号——空态、单条、短列表、长列表是四种不同的界面——
 * 但精确长度不是：11 条和 12 条必须共用同一个缓存条目，否则命中率会崩。
 */
export const LENGTH_BUCKETS: ReadonlyArray<{ label: string; range: readonly [number, number] }> = [
  { label: "0", range: [0, 0] },
  { label: "1", range: [1, 1] },
  { label: "2-5", range: [2, 5] },
  { label: "6-20", range: [6, 20] },
  { label: "21-100", range: [21, 100] },
  { label: "100+", range: [101, Number.POSITIVE_INFINITY] },
];

function lengthBucket(length: number): { label: string; range: readonly [number, number] } {
  for (const bucket of LENGTH_BUCKETS) {
    if (length <= bucket.range[1]) return bucket;
  }
  // LENGTH_BUCKETS 最后一档上界是 Infinity，循环必定命中
  throw new Error(`无法为长度 ${length} 分桶`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 所有元素都保证存在的字段（交集）。
 *
 * 取交集而非并集：候选集匹配要回答"这个组件能安全渲染这批数据吗"。
 * 只出现在部分行上的字段无法保证渲染成功，不该参与匹配。
 */
function guaranteedFields(items: readonly unknown[]): string[] {
  let common: Set<string> | null = null;
  for (const item of items) {
    if (!isPlainObject(item)) return [];
    const keys = new Set(Object.keys(item));
    if (common === null) {
      common = keys;
    } else {
      for (const key of common) {
        if (!keys.has(key)) common.delete(key);
      }
    }
  }
  return common === null ? [] : [...common].sort();
}

/**
 * 从一次 tool 返回值推导结构描述。
 *
 * 记录基数与字段集合，**绝不记录取值**——取值属于 dataModel，由运行时绑定，
 * 不参与缓存键。否则每个业务对象都会占一个缓存条目（Google async A2UI 的做法）。
 */
export function describeShape(value: unknown): ShapeDescriptor {
  if (Array.isArray(value)) {
    const bucket = lengthBucket(value.length);
    return {
      kind: "array",
      lengthBucket: bucket.label,
      lengthRange: bucket.range,
      fields: guaranteedFields(value),
    };
  }
  if (isPlainObject(value)) {
    return { kind: "object", fields: Object.keys(value).sort() };
  }
  return { kind: "scalar", type: value === null ? "null" : typeof value };
}

/** 结构描述的稳定序列化，用作缓存键的一维。 */
export function serializeShape(shape: ShapeDescriptor): string {
  switch (shape.kind) {
    case "array":
      return `array:len=${shape.lengthBucket}:fields=${shape.fields.join(",")}`;
    case "object":
      return `object:fields=${shape.fields.join(",")}`;
    case "scalar":
      return `scalar:${shape.type}`;
  }
}

export function dataShape(value: unknown): string {
  return serializeShape(describeShape(value));
}

/**
 * 数量约束只能取分桶的边界值。
 *
 * 候选集用「约束必须完整覆盖数据所在分桶」来判定，因此一个不落在边界上的
 * 阈值（比如 minItems: 3 落在 2-5 桶中间）永远无法被满足——组件会静默地
 * 从所有候选集里消失。抽取器据此在构建期报错，而不是让它悄悄失配。
 */
export const VALID_MIN_ITEMS: readonly number[] = LENGTH_BUCKETS.map((b) => b.range[0]);
export const VALID_MAX_ITEMS: readonly number[] = LENGTH_BUCKETS.map((b) => b.range[1]).filter(
  (value) => Number.isFinite(value),
);
