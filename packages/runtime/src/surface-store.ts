export interface WireComponent {
  readonly id: string;
  readonly component: string;
  readonly children?: readonly string[];
  readonly [prop: string]: unknown;
}

export interface ResolvedSurface {
  readonly surfaceId: string;
  readonly catalogId: string;
  readonly components: ReadonlyMap<string, WireComponent>;
  readonly dataModel: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 按 JSON Pointer 写入数据模型，路径上缺失的层级按需创建。 */
function writeAtPath(root: unknown, path: string, value: unknown): unknown {
  const segments = path.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return value;

  const next: Record<string, unknown> = isRecord(root) ? { ...root } : {};
  let cursor = next;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i] as string;
    const child = cursor[key];
    const copied: Record<string, unknown> = isRecord(child) ? { ...child } : {};
    cursor[key] = copied;
    cursor = copied;
  }
  cursor[segments[segments.length - 1] as string] = value;
  return next;
}

function indexComponents(components: readonly WireComponent[]): Map<string, WireComponent> {
  return new Map(components.map((node) => [node.id, node] as const));
}

/**
 * A2UI v1.0 消息的最小状态机。
 *
 * 只实现本引擎会产出的那部分协议：建面、换组件、换数据、删面。客户端函数、
 * checks 校验、双向绑定、模板容器一概不做——编译器刻意不生成它们（见 spec §13.3）。
 *
 * 关键性质：`updateDataModel` **不重建组件树**，沿用同一个 Map 实例。这是
 * "结构可缓存"在运行时的体现，也让 React 侧的重渲染范围能收到最小。
 */
export class SurfaceStore {
  readonly #surfaces = new Map<string, ResolvedSurface>();

  apply(message: Record<string, unknown>): void {
    const created = message.createSurface;
    if (isRecord(created)) {
      const surfaceId = String(created.surfaceId);
      this.#surfaces.set(surfaceId, {
        surfaceId,
        catalogId: String(created.catalogId ?? ""),
        components: indexComponents((created.components ?? []) as WireComponent[]),
        dataModel: created.dataModel ?? {},
      });
      return;
    }

    const updatedComponents = message.updateComponents;
    if (isRecord(updatedComponents)) {
      const existing = this.#surfaces.get(String(updatedComponents.surfaceId));
      if (existing === undefined) return;
      const merged = new Map(existing.components);
      for (const node of (updatedComponents.components ?? []) as WireComponent[]) {
        merged.set(node.id, node);
      }
      this.#surfaces.set(String(updatedComponents.surfaceId), {
        ...existing,
        components: merged,
      });
      return;
    }

    const updatedData = message.updateDataModel;
    if (isRecord(updatedData)) {
      const surfaceId = String(updatedData.surfaceId);
      const existing = this.#surfaces.get(surfaceId);
      // 未知 surface 的更新静默忽略：消息乱序或 slot 已卸载都是正常情况，
      // 不该让宿主页面崩掉。
      if (existing === undefined) return;
      this.#surfaces.set(surfaceId, {
        ...existing,
        // 刻意复用同一个 components Map 实例
        dataModel: writeAtPath(
          existing.dataModel,
          String(updatedData.path ?? "/"),
          updatedData.value,
        ),
      });
      return;
    }

    const deleted = message.deleteSurface;
    if (isRecord(deleted)) {
      this.#surfaces.delete(String(deleted.surfaceId));
    }
  }

  get(surfaceId: string): ResolvedSurface | undefined {
    return this.#surfaces.get(surfaceId);
  }
}
