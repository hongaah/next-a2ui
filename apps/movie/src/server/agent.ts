import { generateText, type ModelMessage, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getMovie, getMovies, searchMovies } from "../data/movies.ts";
import { tiers } from "./models.ts";

export interface ObservedCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly result: unknown;
}

const SYSTEM = [
  "你是一个影视中心的助手。三个工具各有分工，不要混用：",
  "- 用户按条件找片（题材、年份、评分、标签、排序）→ getMovies",
  "- 用户提到具体片名、导演或演员 → searchMovies，参数是原始关键词",
  "- 已经知道影片 id、需要详情或用户想播放 → getMovie",
  "想播放某部片时：先 searchMovies 找到它，再 getMovie 取详情，界面会自动开始播放。",
  "始终用一句话简短回应，不要罗列片名，界面会展示。找不到时直接说找不到。",
].join("\n");

const TOOLS = {
  getMovies: tool({
    description: "按条件查询影片列表",
    inputSchema: z.object({
      genre: z.enum(["sci-fi", "horror", "comedy", "documentary", "action"]).optional(),
      yearGte: z.number().optional().describe("最早年份"),
      ratingGte: z.number().optional().describe("最低评分"),
      tag: z.string().optional().describe("标签，如 赛博朋克 / 非遗 / 太空"),
      sortBy: z.enum(["rating", "year", "runtime"]).optional(),
    }),
    execute: async (args) => getMovies(args),
  }),
  searchMovies: tool({
    description: "按片名、导演、演员等关键词搜索影片",
    inputSchema: z.object({ query: z.string().describe("原始关键词，不要加书名号") }),
    execute: async ({ query }) => searchMovies(query),
  }),
  getMovie: tool({
    description: "取一部影片的完整详情",
    inputSchema: z.object({ id: z.number().describe("影片 id") }),
    execute: async ({ id }) => getMovie(id) ?? null,
  }),
};

/**
 * demo 的 agent：一个最小 tool loop。
 *
 * 它**完全不知道 UI 的存在**——不产出任何 UI token，prompt 里也没有一个字提到
 * 界面。编译中间件在事件流后面观察它的 tool 调用。这正是"agent 侧零改动"
 * 要证明的东西（spec §13.4）。
 */
export async function runAgent(messages: readonly ModelMessage[]): Promise<{
  text: string;
  calls: ObservedCall[];
  messages: ModelMessage[];
}> {
  const calls: ObservedCall[] = [];

  const result = await generateText({
    model: tiers.large,
    stopWhen: stepCountIs(4),
    system: SYSTEM,
    messages: [...messages],
    tools: TOOLS,
    onStepFinish: ({ toolCalls, toolResults }) => {
      for (const [index, call] of toolCalls.entries()) {
        const defined = Object.fromEntries(
          Object.entries(call.input as Record<string, unknown>).filter(
            ([, value]) => value !== undefined,
          ),
        );
        calls.push({
          name: call.toolName,
          args: defined,
          result: toolResults[index]?.output ?? null,
        });
      }
    },
  });

  return { text: result.text, calls, messages: [...messages, ...result.response.messages] };
}
