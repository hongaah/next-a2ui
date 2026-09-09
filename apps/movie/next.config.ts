import type { NextConfig } from "next";

const config: NextConfig = {
  // workspace 包直接导出 TS 源码，交给 Next 一起编译
  transpilePackages: [
    "@next-a2ui/adapter",
    "@next-a2ui/core",
    "@next-a2ui/llm",
    "@next-a2ui/runtime",
  ],
};

export default config;
