import type { GenerativeUIEvent } from "@next-a2ui/adapter";
import type { ActionInvocation, InteractionEvent } from "@next-a2ui/core";
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef } from "react";
import { partitionActions } from "./action-policy.ts";
import { SurfaceStore } from "./surface-store.ts";
import { A2UISurfaceView, type ComponentRegistry, type SurfaceEvent } from "./surface-view.tsx";

export interface GenerativeSlotProps {
  readonly event: GenerativeUIEvent | null;
  readonly registry: ComponentRegistry;
  /** 宿主兜底：尚未编译、编译降级、能力缺口、或用户切回经典视图时渲染它。 */
  readonly fallback: ReactNode;
  /** 用户主动切回经典视图。任何 slot 都必须能一键切回老实现。 */
  readonly classic?: boolean;
  /** 生成界面里的语义事件回传宿主。 */
  readonly onEvent?: (event: SurfaceEvent) => void;
  /** 可逆动作，自动派发给宿主执行。 */
  readonly onAction?: (action: ActionInvocation) => void;
  /** 不可逆动作，交给宿主去向用户确认，绝不自动执行。 */
  readonly onConfirmAction?: (action: ActionInvocation) => void;
  readonly onInteraction?: (event: InteractionEvent) => void;
}

/**
 * 把生成界面嵌进现有页面的一块。
 *
 * 渐进式迁移的最小单位：老页面骨架不动，某个区域换成这个 slot。它必须满足
 * 三件事，缺一件团队就不敢开第一个口子——
 *
 * 1. 失败时渲染宿主兜底，而不是空白或崩溃
 * 2. 任何时候能一键切回经典视图
 * 3. 不可逆动作绝不自动执行
 */
export function GenerativeSlot({
  event,
  registry,
  fallback,
  classic = false,
  onEvent,
  onAction,
  onConfirmAction,
  onInteraction,
}: GenerativeSlotProps): ReactElement {
  const storeRef = useRef<SurfaceStore>(undefined);
  storeRef.current ??= new SurfaceStore();
  const store = storeRef.current;

  const surface = useMemo(() => {
    if (event === null) return undefined;
    for (const message of event.value.messages) store.apply(message);
    return store.get(event.value.surfaceId);
  }, [event, store]);

  const actions = event?.value.actions ?? [];
  useEffect(() => {
    const { auto, needsConfirmation } = partitionActions(actions);
    for (const action of auto) onAction?.(action);
    for (const action of needsConfirmation) onConfirmAction?.(action);
  }, [actions, onAction, onConfirmAction]);

  const templateId = event?.value.surfaceId;
  const rendering = !classic && surface !== undefined;
  useEffect(() => {
    if (rendering && templateId !== undefined) {
      onInteraction?.({ templateId, variantId: "default", kind: "impression" });
    }
  }, [rendering, templateId, onInteraction]);

  if (!rendering) return <>{fallback}</>;

  return <A2UISurfaceView surface={surface} registry={registry} {...(onEvent && { onEvent })} />;
}
