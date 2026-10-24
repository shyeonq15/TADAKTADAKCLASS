import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "타닥타닥 우리반",
  description: "어제의 나보다 성장하면, 반이 함께 강해진다",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
