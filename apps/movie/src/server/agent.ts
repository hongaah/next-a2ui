import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getMovies } from "../data/movies.ts";
import { tiers } from "./models.ts";

export interface ObservedCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly result: unknown;
}

/**
 * demo 的 agent：一个最小 tool loop。
 *
 * 它**完全不知道 UI 的存在**——不产出任何 UI token，prompt 里也没有一个字提到
 * 界面。编译中间件在事件流后面观察它的 tool 调用。这正是"agent 侧零改动"
 * 要证明的东西（spec §13.4）。
 */
export async function runAgent(userQuery: string): Promise<{
  text: string;
  calls: ObservedCall[];
}> {
  const calls: ObservedCall[] = [];

  const { text } = await generateText({
    model: tiers.large,
    stopWhen: stepCountIs(3),
    prompt: userQuery,
    system: [
      "你是一个影视应用的助手。用户想找片子时，调用 getMovies 查询。",
      "查到结果后用一句话简短回应即可，不要罗列片名。",
    ].join("\n"),
    tools: {
      getMovies: tool({
        description: "按条件查询影片",
        inputSchema: z.object({
          genre: z
            .enum(["sci-fi", "horror", "comedy", "documentary", "action"])
            .optional()
            .describe("题材"),
          yearGte: z.number().optional().describe("最早年份"),
          ratingGte: z.number().optional().describe("最低评分"),
          sortBy: z.enum(["rating", "year"]).optional().describe("排序依据"),
        }),
        execute: async (args) => {
          const result = getMovies(args);
          const defined = Object.fromEntries(
            Object.entries(args).filter(([, value]) => value !== undefined),
          );
          calls.push({ name: "getMovies", args: defined, result });
          return result;
        },
      }),
    },
  });

  return { text, calls };
}
