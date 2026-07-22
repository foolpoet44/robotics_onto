import { NextResponse } from "next/server";
import { getCurrentEvaluator } from "../../lib/session";
import { getClusterRatingStore } from "../../lib/cluster-rating-store";
import {
  isValidClusterScore,
  sanitizeClusterLabels,
} from "../../lib/cluster-rating-constants";
import { getCollegeSubcategoryData } from "../../lib/server-data";

export async function GET(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const clusterId = searchParams.get("clusterId") ?? undefined;
  const ratings = await getClusterRatingStore().list(clusterId);
  return NextResponse.json({ ratings });
}

export async function POST(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: {
    clusterId?: unknown;
    selected?: unknown;
    score?: unknown;
    labels?: unknown;
    notes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const clusterId = typeof body.clusterId === "string" ? body.clusterId : "";
  if (!clusterId) {
    return NextResponse.json(
      { error: "평가할 클러스터를 선택해 주세요." },
      { status: 400 },
    );
  }
  const selected = body.selected !== false; // 기본 포함, 명시적 false만 제외

  // 포함(selected=true)일 때만 중요도 필수. 제외는 score=null 신호로 저장.
  if (selected && !isValidClusterScore(body.score)) {
    return NextResponse.json(
      { error: "중요도는 1~5 사이여야 합니다." },
      { status: 400 },
    );
  }

  // clusterId가 실재하는지 검증하고, 칼리지·구성 스냅샷을 서버에서 확정한다.
  const subcategoryData = await getCollegeSubcategoryData();
  const cluster = (subcategoryData.skillClusters ?? []).find(
    (item) => item.id === clusterId,
  );
  if (!cluster) {
    return NextResponse.json(
      { error: "존재하지 않는 클러스터입니다." },
      { status: 404 },
    );
  }

  // 평가자 신원은 세션에서만 가져온다(클라이언트가 위조할 수 없음).
  const created = await getClusterRatingStore().create({
    clusterId,
    collegeId: cluster.collegeId,
    selected,
    score: selected && isValidClusterScore(body.score) ? body.score : null,
    labels: sanitizeClusterLabels(body.labels),
    clusterSkillIds: [...cluster.skillIds],
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    evaluatorCollege: evaluator.collegeId,
    notes:
      typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "",
  });

  return NextResponse.json({ rating: created }, { status: 201 });
}
