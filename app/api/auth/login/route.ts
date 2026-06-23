import { NextResponse } from "next/server";
import { toPublicEvaluator, verifyEvaluatorCredentials } from "../../../lib/evaluator-data";
import { setSessionCookie } from "../../../lib/session";

export async function POST(request: Request) {
  let body: { evaluatorId?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const evaluatorId =
    typeof body.evaluatorId === "string" ? body.evaluatorId.trim() : "";
  const code = typeof body.code === "string" ? body.code : "";

  if (!evaluatorId || !code) {
    return NextResponse.json(
      { error: "평가자와 접속 코드를 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  const evaluator = await verifyEvaluatorCredentials(evaluatorId, code);
  if (!evaluator) {
    return NextResponse.json(
      { error: "평가자 또는 접속 코드가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  await setSessionCookie(evaluator.id);
  return NextResponse.json({ evaluator: toPublicEvaluator(evaluator) });
}
