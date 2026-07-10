import { NextResponse } from "next/server";
import { getCurrentEvaluator } from "../../lib/session";
import {
  getDomainChangeRequestStore,
  type DomainChangeAxis,
} from "../../lib/domain-change-request-store";
import { ROBOT_DOMAINS } from "../../lib/robotics-data";
import { resolveSkillCollege } from "../../lib/college-resolver";
import {
  getAllRobotSkills,
  getCollegeMappingData,
} from "../../lib/server-data";

export async function GET(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skillId = searchParams.get("skillId") ?? undefined;
  const requests = await getDomainChangeRequestStore().list(skillId);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const evaluator = await getCurrentEvaluator();
  if (!evaluator) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    skillId?: unknown;
    axis?: unknown;
    requestedValue?: unknown;
    reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  const axis = body.axis as DomainChangeAxis;
  const requestedValue =
    typeof body.requestedValue === "string" ? body.requestedValue : "";
  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

  if (!skillId) {
    return NextResponse.json(
      { error: "대상 스킬을 선택해 주세요." },
      { status: 400 },
    );
  }
  if (axis !== "functional" && axis !== "college") {
    return NextResponse.json(
      { error: "변경 대상 축이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  if (!reason) {
    return NextResponse.json(
      { error: "변경 사유를 입력해 주세요." },
      { status: 400 },
    );
  }

  const skills = await getAllRobotSkills();
  const skill = skills.find((item) => item.skill_id === skillId);
  if (!skill) {
    return NextResponse.json(
      { error: "존재하지 않는 스킬입니다." },
      { status: 404 },
    );
  }

  // 현재 값은 서버에서 확정하고, 요청 값은 축별 화이트리스트로 검증한다.
  let currentValue: string;
  if (axis === "functional") {
    currentValue = skill.domain;
    if (!ROBOT_DOMAINS.some((domain) => domain.key === requestedValue)) {
      return NextResponse.json(
        { error: "존재하지 않는 기능 도메인입니다." },
        { status: 400 },
      );
    }
  } else {
    const collegeMapping = await getCollegeMappingData();
    const resolution = resolveSkillCollege(
      skill,
      collegeMapping.domainMapping,
      collegeMapping.skillOverrides,
    );
    if (!resolution) {
      return NextResponse.json(
        { error: "칼리지 배정을 확인할 수 없는 스킬입니다." },
        { status: 400 },
      );
    }
    currentValue = resolution.primary;
    if (
      !collegeMapping.colleges.some((college) => college.id === requestedValue)
    ) {
      return NextResponse.json(
        { error: "존재하지 않는 4대 도메인입니다." },
        { status: 400 },
      );
    }
  }

  if (requestedValue === currentValue) {
    return NextResponse.json(
      { error: "현재 배정과 동일한 도메인입니다." },
      { status: 400 },
    );
  }

  // 신원은 세션에서만 가져온다(클라이언트 위조 불가).
  const created = await getDomainChangeRequestStore().create({
    skillId,
    axis,
    currentValue,
    requestedValue,
    reason,
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    evaluatorCollege: evaluator.collegeId,
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
