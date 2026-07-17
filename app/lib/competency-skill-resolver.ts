import type {
  CompetencySkillMapData,
  CompetencySkillResolution,
} from "./competency-skill-types";

/**
 * 역량평가 소분류(minorCategory)를 스킬 온톨로지로 해석한다.
 * - mapped: 대응 스킬ID 목록 반환
 * - out-of-scope: 제조 스킬 온톨로지 범위 밖(영업·경영 등), 사유 반환
 * - unknown: 매핑 파일에 없는 소분류(데이터 드리프트 신호)
 *
 * 순수 함수로 유지하여 서버/클라이언트 양쪽에서 재사용한다.
 */
export function resolveCompetencySkills(
  minorCategory: string,
  map: CompetencySkillMapData,
): CompetencySkillResolution {
  const mapping = map.mappings[minorCategory];
  if (mapping) {
    return {
      status: "mapped",
      skillIds: [...mapping.skillIds],
      relation: mapping.relation,
      note: mapping.note,
      reason: null,
    };
  }

  const outOfScope = map.outOfScope[minorCategory];
  if (outOfScope) {
    return {
      status: "out-of-scope",
      skillIds: [],
      relation: null,
      note: "",
      reason: outOfScope.reason,
    };
  }

  return {
    status: "unknown",
    skillIds: [],
    relation: null,
    note: "",
    reason: null,
  };
}

/**
 * 한 직원의 역량 목록에서 연결된 스킬ID 전체를 중복 없이 집계한다.
 */
export function collectSkillIdsForCompetencies(
  minorCategories: string[],
  map: CompetencySkillMapData,
): string[] {
  const set = new Set<string>();
  for (const minor of minorCategories) {
    const resolution = resolveCompetencySkills(minor, map);
    for (const skillId of resolution.skillIds) {
      set.add(skillId);
    }
  }
  return [...set];
}
