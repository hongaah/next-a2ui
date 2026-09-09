import type { ModelMessage } from "ai";

/**
 * demo 的会话记忆。单用户模块级单例——生产上应当按客户端连接分配。
 *
 * A2UI 的回路需要它：用户在生成界面上点了卡片，那次交互要作为一轮对话
 * 接回 agent，agent 才知道"刚才那部片"指的是哪部。
 */
const transcript: ModelMessage[] = [];

export function history(): readonly ModelMessage[] {
  return transcript;
}

export function commit(messages: readonly ModelMessage[]): void {
  transcript.length = 0;
  // 只保留最近若干轮，避免 demo 跑久了上下文爆掉
  transcript.push(...messages.slice(-12));
}

export function reset(): void {
  transcript.length = 0;
}
