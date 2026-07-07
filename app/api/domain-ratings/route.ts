import { NextResponse } from "next/server";
import { getCurrentEvaluator } from "../../lib/session";
import {
  getDomainRatingStore,
  type DomainRatingAxis,
} from "../../lib/domain-rating-store";
import { isValidScore } from "../../lib/evaluation-constants";
import { ROBOT_DOMAINS } from "../../lib/robotics-data";
import { getCollegeMappingData } from "../../lib/server-data";

export async function GET(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const axisParam = searchParams.get("axis");
  const axis =
    axisParam === "college" || axisParam === "functional"
      ? (axisParam as DomainRatingAxis)
      : undefined;
  const ratings = await getDomainRatingStore().list(axis);
  return NextResponse.json({ ratings });
}

export async function POST(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    axis?: unknown;
    targetKey?: unknown;
    score?: unknown;
    notes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const axis = body.axis as DomainRatingAxis;
  const targetKey = typeof body.targetKey === "string" ? body.targetKey : "";

  if (axis !== "college" && axis !== "functional") {
    return NextResponse.json(
      { error: "평가 축이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  if (!isValidScore(body.score)) {
    return NextResponse.json(
      { error: "중요도 점수는 1~5 사이여야 합니다." },
      { status: 400 },
    );
  }

  // 평가 대상 키는 축별 화이트리스트로 검증한다.
  if (axis === "functional") {
    if (!ROBOT_DOMAINS.some((domain) => domain.key === targetKey)) {
      return NextResponse.json(
        { error: "존재하지 않는 기능 도메인입니다." },
        { status: 400 },
      );
    }
  } else {
    const collegeMapping = await getCollegeMappingData();
    if (!collegeMapping.colleges.some((college) => college.id === targetKey)) {
      return NextResponse.json(
        { error: "존재하지 않는 4대 도메인입니다." },
        { status: 400 },
      );
    }
  }

  // 신원은 세션에서만 가져온다(클라이언트 위조 불가).
  const created = await getDomainRatingStore().create({
    axis,
    targetKey,
    score: body.score,
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "",
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    evaluatorCollege: evaluator.collegeId,
  });

  return NextResponse.json({ rating: created }, { status: 201 });
}
