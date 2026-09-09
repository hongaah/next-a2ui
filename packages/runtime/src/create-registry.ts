import type { ComponentContract } from "@next-a2ui/core";
import type { ComponentType } from "react";
import type { ComponentRegistry, RegisteredComponent } from "./surface-view.tsx";

/**
 * 由契约 + 宿主组件实现拼出注册表。
 *
 * 语义事件从契约来，不用在这里重复声明——契约已经是唯一事实源。宿主没提供
 * 实现的组件不进注册表，渲染时会走未注册降级并把名字露出来，而不是静默变空。
 */
export function createRegistry(
  contracts: readonly ComponentContract[],
  components: Readonly<Record<string, ComponentType<never>>>,
): ComponentRegistry {
  const registry: Record<string, RegisteredComponent> = {};
  for (const contract of contracts) {
    const implementation = components[contract.id];
    if (implementation === undefined) continue;
    registry[contract.id] = {
      component: implementation as ComponentType<Record<string, unknown>>,
      emits: contract.emits.map((event) => event.name),
    };
  }
  return registry;
}
