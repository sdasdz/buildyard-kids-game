import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "工程车创造营",
  description: "给小小工程师的自由拼装工程车游戏：听故事、造车车、去帮忙！",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
