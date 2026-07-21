#!/usr/bin/env node
// Data Intelligence 칼리지 → Agentic AI 편입 일회성 마이그레이션 (2026-07)
//
// 근거: 전문가 검토 회의(docs/EXPERT_MEETING_2026-07_AGENTIC_DI_PA.md) —
// "분석·예측·인텔리전스는 에이전트의 툴, 데이터 패브릭·지식은 에이전트를
// 구성하는 데이터" → DI를 AA 워크플로우 안에 완전 편입. 운영 오너 확정.
//
// 수행 내용(전부 결정적·재실행 안전):
//  1) skillOverrides 중 primary=data-intelligence 26건 → agentic-ai 재지정
//     + 검수 장부(college-override-decisions.json)에 결정 기록 (불변원칙 3)
//  2) colleges/levels에서 data-intelligence 제거, secondary 참조 정리
//  3) AA 중간분류를 8단계 워크플로우 + 심화(단일) 9개로 재편, 60개 재배정
//     — 심화 내부 도메인 에이전트 4그룹은 skillClusters로 표현
//  4) 평가자 명부·역량 매핑·육성 트랙의 DI 참조 정리
//
// 스킬 ID(URN)는 어떤 것도 변경하지 않는다. 평가 원본(assessments)은 불변.

const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "../public/data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));
const write = (f, obj) =>
  fs.writeFileSync(path.join(DATA, f), `${JSON.stringify(obj, null, 2)}\n`);

const REVIEWER = "전문가 검토 회의(변재민 위원) · 운영 오너 확정";
const NOTES =
  "DI 칼리지를 Agentic AI 워크플로우로 편입 — docs/EXPERT_MEETING_2026-07_AGENTIC_DI_PA.md";
const NOW = new Date().toISOString();

// ── 1·2) college-mapping: 오버라이드 재지정 + 칼리지·레벨 정리 ──────────────
const mapping = read("college-mapping.json");
const ledger = read("college-override-decisions.json");

const swapDi = (list, primary) =>
  [
    ...new Set(
      (list ?? []).map((c) => (c === "data-intelligence" ? "agentic-ai" : c)),
    ),
  ].filter((c) => c !== primary);

const repointed = [];
for (const [skillId, override] of Object.entries(
  mapping.skillOverrides ?? {},
)) {
  if (override.primary !== "data-intelligence") {
    override.secondary = swapDi(override.secondary, override.primary);
    continue;
  }
  override.primary = "agentic-ai";
  override.secondary = swapDi(override.secondary, "agentic-ai");
  override.source = "reviewed"; // 전문가 회의로 확정된 재배정
  repointed.push(skillId);
  ledger.decisions = [
    ...ledger.decisions.filter((d) => d.skill_id !== skillId),
    {
      skill_id: skillId,
      status: "approved",
      reviewer: REVIEWER,
      reviewed_at: NOW,
      override_snapshot: {
        primary: override.primary,
        secondary: [...override.secondary],
      },
      notes: NOTES,
    },
  ];
}

mapping.colleges = mapping.colleges.filter((c) => c.id !== "data-intelligence");
mapping.levels = mapping.levels.filter(
  (l) => l.collegeId !== "data-intelligence",
);
// DI가 허브로서 걸던 선수 레벨(data-intelligence-lvN)은 허브 역할을 흡수한
// agentic-ai-lvN으로 치환한다. 자기 자신 참조·중복은 제거.
for (const level of mapping.levels) {
  level.prerequisites = [
    ...new Set(
      (level.prerequisites ?? []).map((p) =>
        p.replace(/^data-intelligence-/, "agentic-ai-"),
      ),
    ),
  ].filter((p) => p !== level.id);
}
for (const dm of Object.values(mapping.domainMapping)) {
  dm.secondary = swapDi(dm.secondary, dm.primary);
}

// ── 3) 중간분류 재편: AA 8단계 워크플로우 + 심화 단일 분류 ──────────────────
const subs = read("college-subcategories.json");

const AA_SUBCATEGORIES = [
  ["aa-flow-1", "① 문제 정의·업무 플로우 분석"],
  ["aa-flow-2", "② 에이전트·파이프라인 설계"],
  ["aa-flow-3", "③ 데이터 확보·연동"],
  ["aa-flow-4", "④ 툴·모델 개발 (LLM·비전·분석)"],
  ["aa-flow-5", "⑤ 구현·검증"],
  ["aa-flow-6", "⑥ 운영·모니터링"],
  ["aa-flow-7", "⑦ 고도화·확산"],
  ["aa-multi", "⑧ 멀티 에이전트"],
  ["aa-adv", "심화 : 도메인 에이전트 설계 및 운영"],
];

// 회의 6단계 플로우 기준 배정(③은 과밀 해소를 위해 확보·연동/툴·모델로 분할)
const AA_ASSIGNMENTS = {
  "aa-flow-1": ["RSF-AAM-001", "RSF-AAM-003"],
  "aa-flow-2": ["RSF-AAM-006", "RSF-DTS-005"],
  "aa-flow-3": [
    "RSF-MVS-008",
    "RSF-MVS-019",
    "RSF-AMR-004",
    "RSF-AMR-014",
    "RSF-AAM-007",
    "RSF-AAM-026",
    "RSF-AAM-027",
  ],
  "aa-flow-4": [
    "RSF-AAM-002",
    "RSF-AAM-008",
    "RSF-AAM-028",
    "RSF-MVS-001",
    "RSF-MVS-003",
    "RSF-MVS-004",
    "RSF-MVS-012",
    "RSF-MVS-013",
    "RSF-MVS-014",
  ],
  "aa-flow-5": [
    "RSF-AAM-013",
    "RSF-AAM-014",
    "RSF-AAM-019",
    "RSF-AAM-023",
    "RSF-RMD-012",
    "RSF-DTS-011",
    "RSF-DTS-014",
  ],
  "aa-flow-6": [
    "RSF-AAM-015",
    "RSF-AAM-018",
    "RSF-AAM-020",
    "RSF-IRC-015",
    "RSF-MVS-020",
    "RSF-CRO-017",
    "RSF-RMD-007",
  ],
  "aa-flow-7": ["RSF-AAM-021", "RSF-DTS-021", "RSF-RMD-020"],
  "aa-multi": ["RSF-AAM-009"],
  "aa-adv": [], // 아래 클러스터 4그룹의 합집합으로 채운다
};

// 심화 내부 도메인 에이전트 그룹 (skillClusters로 표현)
const AA_ADV_CLUSTERS = [
  {
    id: "aa-adv-production",
    name: "생산계획 에이전트",
    summary: "MES 자동화·작업지시·APS 계획 수립과 라인 운영 효율화",
    skillIds: [
      "RSF-AAM-005",
      "RSF-AAM-010",
      "RSF-AAM-011",
      "RSF-AAM-017",
      "RSF-IRC-020",
      "RSF-IRC-022",
      "RSF-AMR-021",
    ],
  },
  {
    id: "aa-adv-quality",
    name: "품질 에이전트",
    summary: "SPC·결함 검출·이상 자동 판정과 격리 프로세스 운영",
    skillIds: [
      "RSF-AAM-004",
      "RSF-AAM-012",
      "RSF-AAM-016",
      "RSF-MVS-007",
      "RSF-MVS-016",
    ],
  },
  {
    id: "aa-adv-logistics",
    name: "물류·자재 에이전트",
    summary: "함대 관리·교통 관제·자재 연동과 In-Factory 물류·SCM 통합",
    skillIds: [
      "RSF-AAM-024",
      "RSF-AAM-025",
      "RSF-AMR-005",
      "RSF-AMR-009",
      "RSF-RMD-018",
      "RSF-AMR-010",
      "RSF-AMR-020",
    ],
  },
  {
    id: "aa-adv-equipment",
    name: "설비 에이전트",
    summary: "상태 모니터링·수명 예측과 연계한 자율 정비 실행",
    skillIds: ["RSF-AAM-022", "RSF-RMD-006", "RSF-RMD-017"],
  },
];
AA_ASSIGNMENTS["aa-adv"] = AA_ADV_CLUSTERS.flatMap((c) => c.skillIds);

// 검증: 편입 후 AA 소속이어야 할 스킬(기존 aa-* + 기존 di-*)과 정확히 일치
const expected = Object.entries(subs.skillSubcategories)
  .filter(([, sub]) => sub.startsWith("aa-") || sub.startsWith("di-"))
  .map(([id]) => id)
  .sort();
const assigned = Object.values(AA_ASSIGNMENTS).flat().sort();
const dup = assigned.filter((v, i) => assigned.indexOf(v) !== i);
const missing = expected.filter((id) => !assigned.includes(id));
const extra = assigned.filter((id) => !expected.includes(id));
if (dup.length || missing.length || extra.length) {
  console.error("배정 불일치:", { dup, missing, extra });
  process.exit(1);
}

subs.subcategories = subs.subcategories.filter(
  (s) => s.collegeId !== "agentic-ai" && s.collegeId !== "data-intelligence",
);
AA_SUBCATEGORIES.forEach(([id, name], index) =>
  subs.subcategories.push({
    id,
    collegeId: "agentic-ai",
    name,
    order: index + 1,
  }),
);
for (const [sub, ids] of Object.entries(AA_ASSIGNMENTS)) {
  for (const id of ids) subs.skillSubcategories[id] = sub;
}

subs.skillClusters = [
  ...(subs.skillClusters ?? []).filter((c) => c.collegeId !== "agentic-ai"),
  ...AA_ADV_CLUSTERS.map((c) => ({
    id: c.id,
    collegeId: "agentic-ai",
    subcategoryId: "aa-adv",
    name: c.name,
    summary: c.summary,
    priority: "core",
    skillIds: c.skillIds,
  })),
];

subs.version = "2026-07-21";
subs.note =
  subs.note +
  " Agentic AI는 8단계 워크플로우(①~⑧)+심화 단일 분류이며, 심화의 도메인 에이전트 그룹은 skillClusters로 표현한다(분류 단위 커버리지).";

// ── 4) 평가자 명부·역량 매핑·육성 트랙의 DI 참조 정리 ──────────────────────
const evaluators = read("evaluators.json");
for (const evaluator of evaluators.evaluators) {
  if (evaluator.collegeId === "data-intelligence") {
    evaluator.collegeId = "agentic-ai";
  }
}

const competencyMap = read("competency-skill-map.json");
let assessmentRefs = 0;
for (const entry of competencyMap.mappings ?? competencyMap.entries ?? []) {
  if (entry.assessmentCollegeId === "data-intelligence") {
    entry.assessmentCollegeId = "agentic-ai";
    assessmentRefs += 1;
  }
}

const trackPath = "development-tracks/smartfactory-tech-leader.json";
const track = read(trackPath);
const diProfile = track.expert_area_profiles.find(
  (p) => p.id === "data-intelligence",
);
if (diProfile) {
  const agentic = track.expert_area_profiles.find((p) => p.id === "agentic-ai");
  agentic.description +=
    " 데이터 파이프라인·제조 인텔리전스 기반을 포함합니다.";
  agentic.domain_keys = [
    ...new Set([...agentic.domain_keys, ...diProfile.domain_keys]),
  ];
  agentic.core_skill_ids = [
    ...new Set([...agentic.core_skill_ids, "RSF-MVS-001"]),
  ];
  track.expert_area_profiles = track.expert_area_profiles.filter(
    (p) => p.id !== "data-intelligence",
  );
}

// ── 저장 ────────────────────────────────────────────────────────────────────
write("college-mapping.json", mapping);
write("college-override-decisions.json", ledger);
write("college-subcategories.json", subs);
write("evaluators.json", evaluators);
write("competency-skill-map.json", competencyMap);
write(trackPath, track);

console.log(`오버라이드 재지정: ${repointed.length}건 (장부 기록 동반)`);
console.log(
  `AA 스킬 배정: ${assigned.length}건 / 심화 클러스터 ${AA_ADV_CLUSTERS.length}개`,
);
console.log(`역량 매핑 assessmentCollegeId 치환: ${assessmentRefs}건`);
console.log("완료 — npm run validate:data 로 정합을 확인하세요.");
