import { NextResponse } from "next/server";
import { getCurrentEvaluator } from "../../lib/session";
import {
  getClusterReviewStore,
  isClusterVerdict,
} from "../../lib/cluster-review-store";
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
  const labels = await getClusterReviewStore().list(clusterId);
  return NextResponse.json({ labels });
}

export async function POST(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: { clusterId?: unknown; verdict?: unknown; notes?: unknown };
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
  if (!isClusterVerdict(body.verdict)) {
    return NextResponse.json(
      { error: "판정은 통합 적절/분리 유지/재구성 필요 중 하나여야 합니다." },
      { status: 400 },
    );
  }

  // clusterId가 실재하는지 검증하고 칼리지는 서버에서 확정한다.
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
  const created = await getClusterReviewStore().create({
    clusterId,
    collegeId: cluster.collegeId,
    verdict: body.verdict,
    notes:
      typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "",
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    evaluatorCollege: evaluator.collegeId,
  });

  return NextResponse.json({ label: created }, { status: 201 });
}
