import type { CompileResult } from "@next-a2ui/core";

export type A2UIMessage = Record<string, unknown>;

export interface MessageOptions {
  readonly surfaceId: string;
  readonly catalogId: string;
  readonly data: unknown;
  /** 该 slot 上已经渲染过一个 surface，只需换数据。 */
  readonly existingSurface?: boolean;
}

const VERSION = "v1.0";

/**
 * 把编译产物翻译成 A2UI 线格式。
 *
 * 协议自带的 `updateComponents` / `updateDataModel` 之分，正是整套设计的立足点：
 * 结构可缓存、数据不可缓存。slot 上已有 surface 时只发数据消息——这是"结构
 * 可缓存"在协议层面的体现，也是省下大部分传输量的地方。
 */
export function toA2UIMessages(result: CompileResult, options: MessageOptions): A2UIMessage[] {
  if (result.surface === null) return [];

  if (options.existingSurface === true) {
    return [
      {
        version: VERSION,
        updateDataModel: { surfaceId: options.surfaceId, path: "/", value: options.data },
      },
    ];
  }

  return [
    {
      version: VERSION,
      createSurface: {
        surfaceId: options.surfaceId,
        catalogId: options.catalogId,
        components: result.surface.components,
        dataModel: options.data,
      },
    },
  ];
}
