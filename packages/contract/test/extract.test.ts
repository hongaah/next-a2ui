import { describe, expect, test } from "bun:test";
import { assertNoDrift, createInMemoryProject, extractContracts } from "../src/index.ts";

const movieTypes = `
export interface Movie {
  id: number;
  title: string;
  poster: string;
  rating?: number;
}
`;

const movieGrid = `
import type { Movie } from "./movie.ts";

export interface MovieGridProps {
  movies: Movie[];
  onSelect?: (movie: Movie) => void;
}

export function MovieGrid(props: MovieGridProps) {
  return null;
}
`;

function project() {
  return createInMemoryProject({ "movie.ts": movieTypes, "MovieGrid.tsx": movieGrid });
}

const gridDeclaration = {
  component: "MovieGrid",
  data: "movies",
  semantics: { use: "封面优先的影片网格", avoid: "缺封面时不要用" },
  density: "rich" as const,
};

describe("extractContracts 数据契约", () => {
  test("从数组 prop 推导 accepts，可选字段不进 required", () => {
    const result = extractContracts({
      project: project(),
      declarations: [gridDeclaration],
    });

    expect(result.errors).toEqual([]);
    expect(result.contracts[0]?.accepts).toEqual({
      type: "array",
      items: { type: "object", required: ["id", "poster", "title"] },
    });
  });
});

describe("extractContracts 动作契约", () => {
  test("从 on* 回调 prop 推导语义事件，可选回调同样计入", () => {
    const result = extractContracts({
      project: project(),
      declarations: [gridDeclaration],
    });

    // onSelect 是可选 prop，其类型是 `((m: Movie) => void) | undefined` 联合，
    // 必须先剥掉 undefined 才拿得到调用签名
    expect(result.contracts[0]?.emits).toEqual([{ name: "select" }]);
  });

  test("非回调 prop 不计入 emits", () => {
    const withNoise = createInMemoryProject({
      "movie.ts": movieTypes,
      "MovieList.tsx": `
        import type { Movie } from "./movie.ts";
        export interface MovieListProps {
          movies: Movie[];
          onSelect: (movie: Movie) => void;
          onlyFavorites: boolean;
          title: string;
        }
        export function MovieList(props: MovieListProps) { return null; }
      `,
    });

    const result = extractContracts({
      project: withNoise,
      declarations: [
        {
          component: "MovieList",
          data: "movies",
          semantics: { use: "信息密集的影片行列表", avoid: "" },
          density: "compact",
        },
      ],
    });

    // onlyFavorites 以 on 开头但不是回调，不能被当成事件
    expect(result.contracts[0]?.emits).toEqual([{ name: "select" }]);
  });
});

describe("extractContracts 漂移检测", () => {
  test("data prop 被改名时报错，而不是静默产出坏契约", () => {
    const result = extractContracts({
      project: project(),
      // 组件里的 prop 叫 movies，契约还写着 items —— 典型的重构漂移
      declarations: [{ ...gridDeclaration, data: "items" }],
    });

    expect(result.contracts).toEqual([]);
    expect(result.errors).toEqual([
      { component: "MovieGrid", kind: "data-prop-not-found", detail: "items" },
    ]);
  });

  test("组件被删除或改名时报错", () => {
    const result = extractContracts({
      project: project(),
      declarations: [{ ...gridDeclaration, component: "MovieMasonry" }],
    });

    expect(result.errors).toEqual([
      { component: "MovieMasonry", kind: "component-not-found", detail: "MovieMasonry" },
    ]);
  });

  test("一个契约漂移不阻断其它契约的抽取", () => {
    const result = extractContracts({
      project: project(),
      declarations: [{ ...gridDeclaration, component: "Gone" }, gridDeclaration],
    });

    expect(result.errors).toHaveLength(1);
    expect(result.contracts.map((contract) => contract.id)).toEqual(["MovieGrid"]);
  });
});

describe("extractContracts 组件声明形式", () => {
  test("箭头函数组件同样能被抽取", () => {
    const arrowProject = createInMemoryProject({
      "movie.ts": movieTypes,
      "MovieDetail.tsx": `
        import type { Movie } from "./movie.ts";
        export interface MovieDetailProps {
          movie: Movie;
          onPlay: () => void;
        }
        export const MovieDetail = (props: MovieDetailProps) => null;
      `,
    });

    const result = extractContracts({
      project: arrowProject,
      declarations: [
        {
          component: "MovieDetail",
          data: "movie",
          semantics: { use: "单部影片的详情主体", avoid: "列表场景不要用" },
          density: "rich",
        },
      ],
    });

    expect(result.errors).toEqual([]);
    expect(result.contracts[0]).toMatchObject({
      id: "MovieDetail",
      dataProp: "movie",
      accepts: { type: "object", required: ["id", "poster", "title"] },
      emits: [{ name: "play" }],
    });
  });
});

describe("extractContracts 数量约束", () => {
  test("声明里的数量约束合并进 accepts", () => {
    const result = extractContracts({
      project: project(),
      declarations: [{ ...gridDeclaration, cardinality: { min: 1, max: 20 } }],
    });

    expect(result.contracts[0]?.accepts).toEqual({
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: { type: "object", required: ["id", "poster", "title"] },
    });
  });

  test("数量约束用在非数组数据上时报错", () => {
    const detailProject = createInMemoryProject({
      "movie.ts": movieTypes,
      "MovieDetail.tsx": `
        import type { Movie } from "./movie.ts";
        export const MovieDetail = (props: { movie: Movie }) => null;
      `,
    });

    const result = extractContracts({
      project: detailProject,
      declarations: [
        {
          component: "MovieDetail",
          data: "movie",
          semantics: { use: "详情", avoid: "" },
          density: "rich",
          cardinality: { max: 5 },
        },
      ],
    });

    expect(result.errors).toEqual([
      { component: "MovieDetail", kind: "cardinality-on-non-array", detail: "movie" },
    ]);
  });
});

describe("assertNoDrift", () => {
  test("无漂移时返回契约", () => {
    const result = extractContracts({ project: project(), declarations: [gridDeclaration] });

    expect(assertNoDrift(result).map((contract) => contract.id)).toEqual(["MovieGrid"]);
  });

  test("有漂移时抛出，消息里点名组件与漂移类型", () => {
    const result = extractContracts({
      project: project(),
      declarations: [{ ...gridDeclaration, data: "items" }],
    });

    expect(() => assertNoDrift(result)).toThrow(/MovieGrid.*data-prop-not-found.*items/s);
  });
});
