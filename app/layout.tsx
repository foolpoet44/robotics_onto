import "./globals.css";
import type { Metadata } from "next";
import Navigation from "./components/Navigation";

export const metadata: Metadata = {
  title: "AI Factory Skill Fab",
  description:
    "AI Factory 4대 도메인의 현장 역량을 탐색·평가·육성하는 스킬 플랫폼입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 평가 전용 모드(CLUSTER_EVAL_ONLY=1)에서는 상단 네비게이션을 숨겨
  // 평가자가 다른 페이지로 이동할 링크 자체를 제거한다(경로 차단은 middleware).
  const clusterEvalOnly = process.env.CLUSTER_EVAL_ONLY === "1";
  return (
    <html lang="ko">
      <body>
        {!clusterEvalOnly && <Navigation />}
        {children}
      </body>
    </html>
  );
}
