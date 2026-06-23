import { NextResponse } from "next/server";
import { getCurrentEvaluator } from "../../lib/session";
import { getEvaluationStore } from "../../lib/evaluation-store";
import { isValidScore, sanitizeLabels } from "../../lib/evaluation-constants";
import { getAllRobotSkills } from "../../lib/server-data";

export async function GET(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skillId = searchParams.get("skillId") ?? undefined;
  const labels = await getEvaluationStore().list(skillId);
  return NextResponse.json({ labels });
}

export async function POST(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    skillId?: unknown;
    score?: unknown;
    labels?: unknown;
    notes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  if (!skillId) {
    return NextResponse.json(
      { error: "평가할 스킬을 선택해 주세요." },
      { status: 400 },
    );
  }
  if (!isValidScore(body.score)) {
    return NextResponse.json(
      { error: "중요도 점수는 1~5 사이여야 합니다." },
      { status: 400 },
    );
  }

  // skillId 가 실제 온톨로지에 존재하는지 검증하고 도메인을 서버에서 확정한다.
  const skills = await getAllRobotSkills();
  const skill = skills.find((item) => item.skill_id === skillId);
  if (!skill) {
    return NextResponse.json(
      { error: "존재하지 않는 스킬입니다." },
      { status: 404 },
    );
  }

  // 평가자 신원은 세션에서만 가져온다(클라이언트가 위조할 수 없음).
  const created = await getEvaluationStore().create({
    skillId,
    domain: skill.domain,
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    evaluatorCollege: evaluator.collegeId,
    score: body.score,
    labels: sanitizeLabels(body.labels),
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "",
  });

  return NextResponse.json({ label: created }, { status: 201 });
}
