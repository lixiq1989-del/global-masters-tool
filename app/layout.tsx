import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import { WechatGroupFab } from "@/components/WechatGroupModal";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 商科硕士选校工具",
  description: "Based on UK Business Masters Database",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          {children}
          <WechatGroupFab />
        </AuthProvider>
      </body>
    </html>
  );
}
