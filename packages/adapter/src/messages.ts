import type { A2UIComponent, CompileResult, SurfaceTemplate } from "@next-a2ui/core";

export type A2UIMessage = Record<string, unknown>;

export interface MessageOptions {
  readonly surfaceId: string;
  readonly catalogId: string;
  readonly data: unknown;
  /**
   * 该 slot 上已有的模板 id。
   * - 未提供：surface 还不存在，发 createSurface
   * - 与本次相同：只发 updateDataModel
   * - 与本次不同：模板换了，发 updateComponents + updateDataModel
   */
  readonly existingTemplateId?: string | null;
}

const VERSION = "v1.0";
const ROOT_ID = "root";

/**
 * A2UI 的根数据模型必须是**对象**，不能直接是数组。tool 结果因此统一挂在
 * 这个键下面，内部的根路径 `/` 相应翻译成 `/data`。
 */
const DATA_ROOT = "data";

function toWirePath(path: string): string {
  if (!path.startsWith("/")) return path; // 子作用域路径原样保留
  return path === "/" ? `/${DATA_ROOT}` : `/${DATA_ROOT}${path}`;
}

/**
 * 把内部 IR 的组件翻译成线格式。
 *
 * A2UI 把绑定**内联成组件的属性**——`bindings` 子对象是我们的内部结构，
 * 规范的 unevaluatedProperties 会直接拒收它。
 */
function toWireComponent(node: A2UIComponent): Record<string, unknown> {
  const { bindings, actions, ...rest } = node;
  const inlined: Record<string, unknown> = { ...rest };
  for (const [prop, binding] of Object.entries(bindings ?? {})) {
    inlined[prop] = { path: toWirePath(binding.path) };
  }
  // 交互声明与绑定在线格式里是同一层的普通属性
  for (const [prop, action] of Object.entries(actions ?? {})) {
    inlined[prop] = action;
  }
  return inlined;
}

function renameIds(
  components: readonly A2UIComponent[],
  mapping: ReadonlyMap<string, string>,
): A2UIComponent[] {
  return components.map((node) => {
    const id = mapping.get(node.id) ?? node.id;
    const children = node.children?.map((child) => mapping.get(child) ?? child);
    return { ...node, id, ...(children === undefined ? {} : { children }) };
  });
}

/**
 * A2UI v1.0 强制要求组件列表里有一个 id 为 `root` 的节点作为树根——
 * `rootId` 只是我们的内部概念，线格式里并不存在这个字段。
 *
 * 因此发线之前必须把推导出的根节点改名为 `root`，并同步改写所有指向它的
 * children 引用。若已有别的节点占着这个 id，先把它让开，否则会撞成同一个节点。
 */
function normalizeRoot(surface: SurfaceTemplate): A2UIComponent[] {
  if (surface.rootId === ROOT_ID) return [...surface.components];

  const mapping = new Map<string, string>();
  const occupied = surface.components.some((node) => node.id === ROOT_ID);
  if (occupied) {
    const taken = new Set(surface.components.map((node) => node.id));
    let renamed = `${ROOT_ID}-1`;
    for (let i = 2; taken.has(renamed); i += 1) renamed = `${ROOT_ID}-${i}`;
    mapping.set(ROOT_ID, renamed);
  }
  mapping.set(surface.rootId, ROOT_ID);

  return renameIds(surface.components, mapping);
}

/**
 * 把编译产物翻译成 A2UI 线格式。
 *
 * 协议自带的 `updateComponents` / `updateDataModel` 之分，正是整套设计的立足点：
 * 结构可缓存、数据不可缓存。slot 上已有 surface 时只发数据消息——这是"结构
 * 可缓存"在协议层面的体现，也是省下大部分传输量的地方。
 */
export function toA2UIMessages(result: CompileResult, options: MessageOptions): A2UIMessage[] {
  if (result.surface === null) return [];

  const dataMessage: A2UIMessage = {
    version: VERSION,
    updateDataModel: {
      surfaceId: options.surfaceId,
      path: `/${DATA_ROOT}`,
      value: options.data,
    },
  };

  const existing = options.existingTemplateId;
  if (existing === undefined || existing === null) {
    return [
      {
        version: VERSION,
        createSurface: {
          surfaceId: options.surfaceId,
          catalogId: options.catalogId,
          components: normalizeRoot(result.surface).map(toWireComponent),
          dataModel: { [DATA_ROOT]: options.data },
        },
      },
    ];
  }

  if (existing === result.templateId) return [dataMessage];

  // 模板换了。规范禁止对已存在的 surface 再发 createSurface
  // （"It is an error to try to create a surface with an existing ID"），
  // 必须走 updateComponents。
  return [
    {
      version: VERSION,
      updateComponents: {
        surfaceId: options.surfaceId,
        components: normalizeRoot(result.surface).map(toWireComponent),
      },
    },
    dataMessage,
  ];
}
