import "./globals.css";
import type { Metadata } from "next";
import Navigation from "./components/Navigation";

export const metadata: Metadata = {
  title: "Factory Robotics Skill Map",
  description:
    "스마트팩토리 로보틱스 현장 역량을 탐색하는 전용 스킬 맵입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
