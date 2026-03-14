import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 商科硕士选校工具",
  description: "Based on UK Business Masters Database",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
