import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: "feifei. 廢廢",
  description: "搜尋、常用捷徑與娛樂小工具。",
  icons: {
    icon: [{ url: "/sleepy-cat.webp", type: "image/webp" }],
    apple: "/sleepy-cat.webp",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
