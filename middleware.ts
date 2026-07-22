import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 평가 전용 모드: CLUSTER_EVAL_ONLY=1 인 배포에서는 클러스터 평가 화면과
// 그 동작에 필요한 API(로그인·평가 저장)만 노출하고, 나머지 경로는 모두
// /evaluation/clusters 로 리다이렉트한다. 플래그가 없는 배포(프로덕션 등)는
// 아무 영향도 받지 않는다.
const ALLOWED_EXACT = new Set(["/evaluation/clusters", "/api/cluster-ratings"]);

function isAllowed(pathname: string): boolean {
  if (ALLOWED_EXACT.has(pathname)) return true;
  if (pathname.startsWith("/evaluation/clusters/")) return true;
  if (pathname.startsWith("/api/auth/")) return true; // 로그인/로그아웃
  return false;
}

export function middleware(request: NextRequest) {
  if (process.env.CLUSTER_EVAL_ONLY !== "1") {
    return NextResponse.next();
  }
  const { pathname } = request.nextUrl;
  if (isAllowed(pathname)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/evaluation/clusters";
  url.search = "";
  return NextResponse.redirect(url);
}

// 정적 자원(_next, 파일 확장자 포함)은 미들웨어를 타지 않는다.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
