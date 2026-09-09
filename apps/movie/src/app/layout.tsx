import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "影视 · next-a2ui", description: "渐进式生成式 UI 演示" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
