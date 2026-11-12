import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: "feifei. 廢廢",
  description: "搜尋、常用捷徑與娛樂小工具。",
  icons: {
    icon: [{ url: "/feifei-icon-512.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/feifei-icon-512.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
