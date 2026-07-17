// ============================================================================
// 역량↔스킬 리졸버 로더 (Node 스크립트 공용)
// ============================================================================
//
// 왜 이 모듈이 필요한가
// -------------------
// 직원 역량평가의 최소 단위는 minorCategory 다. 이 minor 를 로봇 스킬 온톨로지에
// 연결하는 단일 출처가 competency-skill-map.json 이고, 그 정합성(모든 minor 가
// mapped 또는 outOfScope 로 100% 결정)을 검증·계산하는 로직을 여기 한 곳에 둔다.
// export-signals(수집기)·test(검증)·validator 가 모두 이 함수를 재사용한다 —
// "역량 매핑 단일 출처"(불변원칙 4)를 코드 레벨에서도 한 곳으로 모으는 것이다.

const fs = require("fs");
const path = require("path");

const PUBLIC_DATA = path.join(__dirname, "..", "..", "public", "data");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * 역량평가에서 distinct minorCategory 를 뽑아 major/college/평가자수를 집계한다.
 * 반환: Map<minorCategory, {majorCategory, collegeIds:Set, employeeIds:Set}>
 */
function collectAssessmentMinors(assessments) {
  const minors = new Map();
  for (const employee of assessments.employees ?? []) {
    for (const comp of employee.competencies ?? []) {
      const key = comp.minorCategory;
      if (!key) continue;
      if (!minors.has(key)) {
        minors.set(key, {
          majorCategory: comp.majorCategory ?? null,
          collegeIds: new Set(),
          employeeIds: new Set(),
        });
      }
      const rec = minors.get(key);
      if (comp.collegeId) rec.collegeIds.add(comp.collegeId);
      rec.employeeIds.add(employee.employeeId);
    }
  }
  return minors;
}

/**
 * 맵 + 역량평가를 대조해 커버리지와 unknownMinors 를 계산한다.
 * unknownMinors = 역량평가에는 있으나 맵(mappings/outOfScope)에 없는 minor.
 * 이것이 B-2(/triage-competency-map)가 소비하는 핵심 시그널이다.
 */
function computeCoverage(map, assessments) {
  const mapped = new Set((map.mappings ?? []).map((m) => m.minorCategory));
  const outOfScope = new Set((map.outOfScope ?? []).map((m) => m.minorCategory));
  const minors = collectAssessmentMinors(assessments);

  const unknownMinors = [];
  for (const [minorCategory, rec] of minors) {
    if (mapped.has(minorCategory) || outOfScope.has(minorCategory)) continue;
    unknownMinors.push({
      minorCategory,
      majorCategory: rec.majorCategory,
      collegeIds: [...rec.collegeIds],
      employeeCount: rec.employeeIds.size,
    });
  }
  // 신호 강도(평가자수) 내림차순 — 가장 많은 직원이 걸린 미매핑이 위로.
  unknownMinors.sort((a, b) => b.employeeCount - a.employeeCount);

  return {
    coverage: {
      total: mapped.size + outOfScope.size,
      mapped: mapped.size,
      outOfScope: outOfScope.size,
      assessmentMinors: minors.size,
      unknown: unknownMinors.length,
    },
    unknownMinors,
  };
}

/**
 * 맵의 무결성을 검증한다. 반환: string[] 오류 목록(빈 배열이면 통과).
 * 규칙:
 *  1. 역량평가의 모든 distinct minor 가 mapped 또는 outOfScope 에 존재(unknown 0).
 *  2. mapped 의 skillId 는 온톨로지에 실재.
 *  3. mapped 의 relation 은 direct|adjacent.
 *  4. minor 중복 등장 금지(mapped/outOfScope 통틀어 정확히 1회).
 */
function validateCompetencySkillMap(map, assessments, ontologySkillIds) {
  const errors = [];
  const mappings = map.mappings ?? [];
  const outOfScope = map.outOfScope ?? [];

  // 4. 중복 검사
  const seen = new Map();
  for (const entry of [...mappings, ...outOfScope]) {
    const k = entry.minorCategory;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  for (const [k, n] of seen) {
    if (n > 1) errors.push(`minor 중복 등장(${n}회): "${k}"`);
  }

  // 2·3. mapped 무결성
  const validRelations = new Set(["direct", "adjacent"]);
  for (const m of mappings) {
    if (!ontologySkillIds.has(m.skillId)) {
      errors.push(`"${m.minorCategory}": 존재하지 않는 skillId ${m.skillId}`);
    }
    if (!validRelations.has(m.relation)) {
      errors.push(`"${m.minorCategory}": 허용되지 않은 relation '${m.relation}'`);
    }
  }

  // 1. 100% 커버리지 (unknown 0)
  const { unknownMinors } = computeCoverage(map, assessments);
  for (const u of unknownMinors) {
    errors.push(
      `미분류 minorCategory: "${u.minorCategory}" ` +
        `(major=${u.majorCategory}, 직원 ${u.employeeCount}명) — mapped 또는 outOfScope 로 분류 필요`,
    );
  }

  return errors;
}

/**
 * 기본 경로에서 맵·역량평가·온톨로지를 로드해 리졸버 컨텍스트를 돌려준다.
 * 파일이 없으면 available:false 로 우아하게 알린다(맵 미머지 단계 대비).
 */
function loadCompetencySkillResolver(options = {}) {
  const dataDir = options.dataDir ?? PUBLIC_DATA;
  const mapPath = path.join(dataDir, "competency-skill-map.json");
  const assessmentsPath = path.join(
    dataDir,
    "employee-competency-assessments.json",
  );
  const ontologyPath = path.join(dataDir, "robot-smartfactory.json");

  if (!fs.existsSync(mapPath) || !fs.existsSync(assessmentsPath)) {
    return { available: false };
  }

  const map = readJson(mapPath);
  const assessments = readJson(assessmentsPath);
  const ontologySkillIds = new Set(
    (fs.existsSync(ontologyPath) ? readJson(ontologyPath) : []).map(
      (s) => s.skill_id,
    ),
  );

  return {
    available: true,
    map,
    assessments,
    ontologySkillIds,
    ...computeCoverage(map, assessments),
    validate: () =>
      validateCompetencySkillMap(map, assessments, ontologySkillIds),
  };
}

module.exports = {
  collectAssessmentMinors,
  computeCoverage,
  validateCompetencySkillMap,
  loadCompetencySkillResolver,
};
