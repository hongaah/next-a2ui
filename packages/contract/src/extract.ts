import type { ComponentContract, JsonSchema, SemanticEvent } from "@next-a2ui/core";
import { VALID_MAX_ITEMS, VALID_MIN_ITEMS } from "@next-a2ui/core";
import {
  type ArrowFunction,
  type FunctionDeclaration,
  type FunctionExpression,
  type Node,
  type Project,
  SymbolFlags,
  SyntaxKind,
  type Type,
} from "ts-morph";

export interface ContractDeclaration {
  readonly component: string;
  /** 承载数据的 prop 名。 */
  readonly data: string;
  readonly semantics: { readonly use: string; readonly avoid: string };
  readonly density: "compact" | "normal" | "rich";
  /** 是否是容器组件（能接子节点）。 */
  readonly acceptsChildren?: boolean;
  /**
   * 数量约束。TS 类型表达不了"这个组件只接空列表"或"最多五条"，
   * 但候选集必须知道——否则空态组件会匹配上有内容的列表。
   */
  readonly cardinality?: { readonly min?: number; readonly max?: number };
}

export interface ExtractionError {
  readonly component: string;
  readonly kind:
    | "component-not-found"
    | "data-prop-not-found"
    | "unsupported-data-type"
    | "cardinality-on-non-array"
    | "cardinality-not-aligned";
  readonly detail: string;
}

export interface ExtractionResult {
  readonly contracts: readonly ComponentContract[];
  readonly errors: readonly ExtractionError[];
}

type ComponentFunction = FunctionDeclaration | ArrowFunction | FunctionExpression;

/**
 * 数量约束必须落在长度分桶的边界上。
 *
 * 候选集判定要求「约束完整覆盖数据所在分桶」，所以一个落在桶中间的阈值
 * （minItems: 3 在 2-5 桶里）永远无法被满足——组件会从所有候选集里静默消失。
 * 这类失配极难排查，必须在构建期就拦下来。
 */
function cardinalityError(
  component: string,
  cardinality: { readonly min?: number; readonly max?: number },
): ExtractionError | null {
  const { min, max } = cardinality;
  if (min !== undefined && !VALID_MIN_ITEMS.includes(min)) {
    return {
      component,
      kind: "cardinality-not-aligned",
      detail: `min=${min} 不在分桶边界上，可用值：${VALID_MIN_ITEMS.join("、")}`,
    };
  }
  if (max !== undefined && !VALID_MAX_ITEMS.includes(max)) {
    return {
      component,
      kind: "cardinality-not-aligned",
      detail: `max=${max} 不在分桶边界上，可用值：${VALID_MAX_ITEMS.join("、")}`,
    };
  }
  return null;
}

/** React 里 `function X()` 与 `const X = () => {}` 都常见，两种都要认。 */
function findComponent(project: Project, name: string): ComponentFunction | undefined {
  for (const sourceFile of project.getSourceFiles()) {
    const declared = sourceFile.getFunction(name);
    if (declared !== undefined) return declared;

    const initializer = sourceFile.getVariableDeclaration(name)?.getInitializer();
    const asArrow = initializer?.asKind(SyntaxKind.ArrowFunction);
    if (asArrow !== undefined) return asArrow;
    const asExpression = initializer?.asKind(SyntaxKind.FunctionExpression);
    if (asExpression !== undefined) return asExpression;
  }
  return undefined;
}

/** 必需字段 = 非可选属性。可选属性无法保证每条数据都有，不该进 required。 */
function requiredFieldsOf(type: Type): string[] {
  return type
    .getProperties()
    .filter((property) => !property.hasFlags(SymbolFlags.Optional))
    .map((property) => property.getName())
    .sort();
}

function toSchema(type: Type, at: Node): JsonSchema | null {
  const bare = type.getNonNullableType();

  if (bare.isArray()) {
    const element = bare.getArrayElementType();
    if (element === undefined) return null;
    return { type: "array", items: { type: "object", required: requiredFieldsOf(element) } };
  }

  if (bare.isObject()) {
    return { type: "object", required: requiredFieldsOf(bare) };
  }

  void at;
  return null;
}

/**
 * 从 `on*` 回调 prop 推导语义事件。
 *
 * 名字要落到语义而非 DOM：`onSelect` → `select`，不是 `click`。§5.2 要求契约
 * 里不得出现任何平台概念，否则多端扩展就永久回不来了。
 *
 * 可选回调的类型是 `((...) => void) | undefined` 联合，必须先剥掉 undefined
 * 才拿得到调用签名；只按名字前缀判断则会把 `onlyFavorites: boolean` 这类
 * 普通 prop 误当成事件。
 */
function emitsOf(propsType: Type, at: Node): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  for (const property of propsType.getProperties()) {
    const name = property.getName();
    if (!/^on[A-Z]/.test(name)) continue;

    const bare = property.getTypeAtLocation(at).getNonNullableType();
    if (bare.getCallSignatures().length === 0) continue;

    const eventName = name.slice(2);
    events.push({ name: `${eventName[0]?.toLowerCase() ?? ""}${eventName.slice(1)}` });
  }
  return events.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * 从现有组件的 TS 类型旁挂抽取契约。**不修改任何组件源码**——
 * 一旦要求给 200 个稳定组件加装饰器，渐进式迁移就死了。
 */
export function extractContracts(options: {
  project: Project;
  declarations: readonly ContractDeclaration[];
}): ExtractionResult {
  const contracts: ComponentContract[] = [];
  const errors: ExtractionError[] = [];

  for (const declaration of options.declarations) {
    const fn = findComponent(options.project, declaration.component);
    if (fn === undefined) {
      errors.push({
        component: declaration.component,
        kind: "component-not-found",
        detail: declaration.component,
      });
      continue;
    }

    const propsParam = fn.getParameters()[0];
    const dataProp = propsParam?.getType().getProperty(declaration.data);
    // 漂移检测：prop 被改名却没同步契约，是最容易悄悄产出悬空绑定的路径。
    // 必须在构建期炸掉，而不是等运行时。
    if (propsParam === undefined || dataProp === undefined) {
      errors.push({
        component: declaration.component,
        kind: "data-prop-not-found",
        detail: declaration.data,
      });
      continue;
    }

    if (declaration.cardinality !== undefined) {
      const misaligned = cardinalityError(declaration.component, declaration.cardinality);
      if (misaligned !== null) {
        errors.push(misaligned);
        continue;
      }
    }

    const derived = toSchema(dataProp.getTypeAtLocation(propsParam), propsParam);
    if (derived !== null && declaration.cardinality !== undefined && derived.type !== "array") {
      errors.push({
        component: declaration.component,
        kind: "cardinality-on-non-array",
        detail: declaration.data,
      });
      continue;
    }

    const accepts =
      derived === null || declaration.cardinality === undefined
        ? derived
        : {
            ...derived,
            ...(declaration.cardinality.min === undefined
              ? {}
              : { minItems: declaration.cardinality.min }),
            ...(declaration.cardinality.max === undefined
              ? {}
              : { maxItems: declaration.cardinality.max }),
          };

    if (accepts === null) {
      errors.push({
        component: declaration.component,
        kind: "unsupported-data-type",
        detail: declaration.data,
      });
      continue;
    }

    contracts.push({
      id: declaration.component,
      dataProp: declaration.data,
      accepts,
      emits: emitsOf(propsParam.getType(), propsParam),
      semantics: declaration.semantics,
      density: declaration.density,
      ...(declaration.acceptsChildren === undefined
        ? {}
        : { acceptsChildren: declaration.acceptsChildren }),
    });
  }

  return { contracts, errors };
}

/**
 * 契约漂移的 CI 闸门。
 *
 * 检测到却没人看等于没检测——抽取失败必须让构建失败，否则漂移会一路滑到
 * 运行时变成悬空绑定。
 */
export function assertNoDrift(result: ExtractionResult): readonly ComponentContract[] {
  if (result.errors.length === 0) return result.contracts;

  const lines = result.errors.map(
    (error) => `  ✗ ${error.component}: ${error.kind} (${error.detail})`,
  );
  throw new Error(`契约与组件源码已漂移，共 ${result.errors.length} 处：\n${lines.join("\n")}`);
}
