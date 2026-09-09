/**
 * 长度分桶。基数是 UI 结构的强信号——空态、单条、短列表、长列表是四种不同的界面——
 * 但精确长度不是：11 条和 12 条必须共用同一个缓存条目，否则命中率会崩。
 */
function lengthBucket(length: number): string {
  if (length === 0) return "0";
  if (length === 1) return "1";
  if (length <= 5) return "2-5";
  if (length <= 20) return "6-20";
  if (length <= 100) return "21-100";
  return "100+";
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
 * 从一次 tool 返回值推导结构指纹。
 *
 * 记录基数与字段集合，**绝不记录取值**——取值属于 dataModel，由运行时绑定，
 * 不参与缓存键。否则每个业务对象都会占一个缓存条目（Google async A2UI 的做法）。
 */
export function dataShape(value: unknown): string {
  if (Array.isArray(value)) {
    const fields = guaranteedFields(value).join(",");
    return `array:len=${lengthBucket(value.length)}:fields=${fields}`;
  }
  if (isPlainObject(value)) {
    return `object:fields=${Object.keys(value).sort().join(",")}`;
  }
  return `scalar:${value === null ? "null" : typeof value}`;
}
