#!/usr/bin/env node
// R&D 연구원(경력 3~10년) 육성 커리큘럼 HTML 발행 스크립트.
// 도메인별 스킬(온톨로지)·중간분류를 기반으로 공통/도메인/특화 모듈과
// 학습시간을 자동 산출한다.
//
// 사용법: node scripts/generate-curriculum-html.js [출력경로]
// 기본 출력: public/curriculum-rnd.html (배포 사이트에서 /curriculum-rnd.html)

const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const robotSkills = require("../public/data/robot-smartfactory.json");
const collegeMapping = require("../public/data/college-mapping.json");
const subcategoryData = require("../public/data/college-subcategories.json");

const outputPath =
  process.argv[2] ?? path.join(__dirname, "../public/curriculum-rnd.html");

// ==================== 산정 규칙 ====================
// 학습시간: 스킬 타입 기반 (지식 4h / 기술 8h / 역량 16h)
const HOURS_BY_TYPE = { knowledge: 4, skill: 8, competence: 16 };

const COLLEGE_COLORS = {
  "physical-ai": "#4f46e5",
  "agentic-ai": "#0d9488",
  "digital-twin": "#9333ea",
  "data-intelligence": "#0891b2",
};

// ==================== 커리큘럼 구성 (공통/특화 큐레이션) ====================

const COMMON_MODULES = [
  {
    id: "C1",
    name: "데이터·AI 리터러시",
    goal: "모든 도메인 연구원이 공유하는 데이터 처리·AI 에이전트 기초 체계를 갖춘다.",
    skillIds: [
      "RSF-AAM-001",
      "RSF-AAM-002",
      "RSF-MVS-003",
      "RSF-MVS-008",
      "RSF-MVS-019",
      "RSF-RMD-007",
    ],
  },
  {
    id: "C2",
    name: "스마트팩토리 시스템·데이터 기반",
    goal: "MES 등 기간계와 OT 네트워크, Data Fabric의 구조를 이해하고 연계 관점을 확보한다.",
    skillIds: ["RSF-AAM-003", "RSF-AAM-027", "RSF-AMR-004", "RSF-AMR-014"],
  },
  {
    id: "C3",
    name: "안전·휴먼-인-더-루프",
    goal: "로봇 안전 표준과 자동 판단에 대한 승인·가드레일 설계 원칙을 체득한다.",
    skillIds: ["RSF-IRC-003", "RSF-CRO-001", "RSF-AAM-013", "RSF-AAM-014"],
  },
];

const SPECIALIZATION_MODULES = [
  {
    id: "S1",
    name: "예지보전·자율 정비",
    colleges: ["physical-ai", "agentic-ai", "data-intelligence"],
    goal: "상태 데이터 → 고장 예측 → 자율 정비 실행으로 이어지는 설비 Agent 체계를 구축한다.",
    capstone: "담당 설비 1종의 예지보전 파이프라인 구축과 자율 정비 시나리오 검증 (1人1案 연계)",
    skillIds: [
      "RSF-RMD-006",
      "RSF-RMD-007",
      "RSF-RMD-017",
      "RSF-RMD-015",
      "RSF-RMD-016",
      "RSF-AAM-022",
      "RSF-DTS-012",
    ],
  },
  {
    id: "S2",
    name: "가상 커미셔닝·공정 검증",
    colleges: ["digital-twin", "physical-ai", "agentic-ai"],
    goal: "신규 공정 시나리오를 에뮬레이터로 가상 검증하고 현장 배포까지 연결한다.",
    capstone: "신규 라인/개조 공정 1건의 가상 커미셔닝 및 개발 Agent 배포 파이프라인 시연",
    skillIds: [
      "RSF-IRC-012",
      "RSF-IRC-023",
      "RSF-DTS-022",
      "RSF-DTS-008",
      "RSF-DTS-015",
      "RSF-DTS-016",
      "RSF-AAM-023",
    ],
  },
  {
    id: "S3",
    name: "품질 지능화",
    colleges: ["data-intelligence", "agentic-ai", "physical-ai"],
    goal: "비전 검사·SPC 기반 품질 판정을 자동화하고 자동 격리 운영까지 확장한다.",
    capstone: "담당 공정 검사 항목의 자동 판정 모델 구축과 오판정률 목표 달성 리포트",
    skillIds: [
      "RSF-MVS-004",
      "RSF-MVS-007",
      "RSF-MVS-013",
      "RSF-MVS-016",
      "RSF-AAM-004",
      "RSF-AAM-012",
      "RSF-AAM-016",
    ],
  },
  {
    id: "S4",
    name: "자율 물류·SCM 통합",
    colleges: ["physical-ai", "agentic-ai", "data-intelligence"],
    goal: "AMR 함대 관제와 자재·협력사 연동, In-Factory 물류-SCM 실행 통합을 설계한다.",
    capstone: "물류 구간 1개의 함대 운영 KPI 개선안과 SCM 실행 데이터 연계 설계",
    skillIds: [
      "RSF-AMR-005",
      "RSF-AMR-009",
      "RSF-AMR-010",
      "RSF-AMR-020",
      "RSF-AAM-024",
      "RSF-AAM-025",
    ],
  },
  {
    id: "S5",
    name: "제조 지식그래프·특화 LLM",
    colleges: ["data-intelligence", "agentic-ai"],
    goal: "작업지도서·매뉴얼을 지식그래프로 구조화하고 제조 특화 sLLM 데이터·평가 체계를 만든다.",
    capstone: "담당 공정 문서군의 온톨로지 구축과 sLLM 질의응답 품질 평가 리포트",
    skillIds: [
      "RSF-AAM-026",
      "RSF-AAM-027",
      "RSF-AAM-028",
      "RSF-DTS-005",
      "RSF-DTS-011",
      "RSF-MVS-014",
    ],
  },
];

const CAREER_PATHS = [
  {
    band: "3~5년차",
    target: "AX Practitioner (Lv2)",
    plan: "공통 모듈 전체 + 소속 도메인 핵심 모듈(Lv2 이하 스킬) 이수. 통합 부트캠프 참여.",
  },
  {
    band: "5~8년차",
    target: "AX Specialist (Lv3)",
    plan: "소속 도메인 심화 모듈(Lv3) + 특화 모듈 1개 선택 이수. 페어 임베드로 Production 과제 1건 완수.",
  },
  {
    band: "8~10년차",
    target: "AX Expert (Lv4)",
    plan: "특화 모듈 심화 + 타 도메인 크로스 모듈 1개. Cross-College Capstone과 1人1案 승인으로 인증.",
  },
];

// ==================== 데이터 결합 ====================

const skillById = new Map(robotSkills.map((skill) => [skill.skill_id, skill]));
const domainMapping = collegeMapping.domainMapping;
const skillOverrides = collegeMapping.skillOverrides ?? {};

function collegeOf(skill) {
  const override = skillOverrides[skill.skill_id];
  return override ? override.primary : domainMapping[skill.domain].primary;
}

// 큐레이션된 스킬 ID가 실존하는지 먼저 검증한다.
const curatedIds = [
  ...COMMON_MODULES.flatMap((module) => module.skillIds),
  ...SPECIALIZATION_MODULES.flatMap((module) => module.skillIds),
];
const missing = curatedIds.filter((skillId) => !skillById.has(skillId));
if (missing.length > 0) {
  console.error(`존재하지 않는 스킬 ID: ${missing.join(", ")}`);
  process.exit(1);
}

const commonSkillIds = new Set(
  COMMON_MODULES.flatMap((module) => module.skillIds),
);

function hoursOf(skill) {
  return HOURS_BY_TYPE[skill.skill_type] ?? 8;
}

function sumHours(skillIds) {
  return skillIds.reduce((sum, skillId) => sum + hoursOf(skillById.get(skillId)), 0);
}

const colleges = [...collegeMapping.colleges].sort((a, b) => a.order - b.order);
const subcategories = subcategoryData.subcategories;
const skillSubcategories = subcategoryData.skillSubcategories;

const domainModules = colleges.map((college) => {
  const subs = subcategories
    .filter((subcategory) => subcategory.collegeId === college.id)
    .sort((a, b) => a.order - b.order)
    .map((subcategory) => {
      const skills = robotSkills
        .filter(
          (skill) => skillSubcategories[skill.skill_id] === subcategory.id,
        )
        .sort((a, b) => a.proficiency_level - b.proficiency_level ||
          a.skill_id.localeCompare(b.skill_id));
      const levels = skills.map((skill) => skill.proficiency_level);
      return {
        ...subcategory,
        skills,
        hours: skills.reduce((sum, skill) => sum + hoursOf(skill), 0),
        levelRange: skills.length
          ? `Lv${Math.min(...levels)}~${Math.max(...levels)}`
          : "-",
      };
    });
  return {
    college,
    subs,
    totalHours: subs.reduce((sum, sub) => sum + sub.hours, 0),
    skillCount: subs.reduce((sum, sub) => sum + sub.skills.length, 0),
  };
});

// ==================== HTML ====================

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function skillRow(skillId, options = {}) {
  const skill = skillById.get(skillId);
  const color = COLLEGE_COLORS[collegeOf(skill)] ?? "#64748b";
  const commonBadge =
    options.markCommon && commonSkillIds.has(skillId)
      ? '<span class="badge badge-common">공통 이수 인정</span>'
      : "";
  return `<li>
    <span class="dot" style="background:${color}"></span>
    <span class="skill-name">${esc(skill.preferred_label_ko)}</span>
    <span class="skill-meta">${esc(skillId)} · Lv${skill.proficiency_level} · ${hoursOf(skill)}h</span>
    ${commonBadge}
  </li>`;
}

const totalCommonHours = COMMON_MODULES.reduce(
  (sum, module) => sum + sumHours(module.skillIds),
  0,
);

const generatedAt = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>R&D 연구원 육성 커리큘럼 — Factory Robotics Skill Map</title>
<style>
  :root {
    --ink: #1e293b; --ink-2: #64748b; --line: #e2e8f0;
    --bg: #f8fafc; --card: #ffffff; --accent: #4338ca;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Pretendard", "Noto Sans KR", system-ui, sans-serif;
    color: var(--ink); background: var(--bg); line-height: 1.55; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 40px 20px 80px; }
  header.hero { text-align: center; margin-bottom: 36px; }
  .eyebrow { color: var(--accent); font-size: 12px; font-weight: 800; letter-spacing: .14em; margin: 0; }
  h1 { margin: 8px 0 6px; font-size: clamp(26px, 4vw, 38px); }
  .hero p { color: var(--ink-2); max-width: 720px; margin: 0 auto; }
  h2 { margin: 44px 0 6px; font-size: 22px; border-left: 5px solid var(--accent); padding-left: 10px; }
  h2 + p { margin: 0 0 16px; color: var(--ink-2); }
  table { width: 100%; border-collapse: collapse; background: var(--card);
    border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; font-size: 14px; }
  th { background: #f1f5f9; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
  .card h3 { margin: 0 0 4px; font-size: 16px; }
  .card h4 { margin: 14px 0 6px; font-size: 13px; color: var(--ink-2); }
  .goal { margin: 0 0 8px; color: var(--ink-2); font-size: 13px; }
  .meta-line { font-size: 12px; color: var(--ink-2); font-weight: 700; }
  ul.skills { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
  ul.skills li { display: flex; align-items: center; gap: 7px; font-size: 13px; flex-wrap: wrap; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .skill-name { font-weight: 600; }
  .skill-meta { color: var(--ink-2); font-size: 11.5px; }
  .badge { font-size: 10.5px; font-weight: 800; padding: 1px 7px; border-radius: 999px; }
  .badge-common { background: #ecfdf5; color: #047857; }
  .college-section { margin-top: 20px; border: 1px solid var(--line); border-radius: 14px;
    background: var(--card); overflow: hidden; }
  .college-head { display: flex; justify-content: space-between; align-items: baseline;
    gap: 10px; padding: 12px 18px; color: #fff; flex-wrap: wrap; }
  .college-head h3 { margin: 0; font-size: 17px; }
  .college-head span { font-size: 12.5px; font-weight: 700; opacity: .92; }
  .college-body { padding: 14px 18px 18px; display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 12px; }
  .module { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
  .module h4 { margin: 0 0 2px; font-size: 14px; color: var(--ink); }
  .capstone { margin: 10px 0 0; padding: 8px 10px; background: #fff7ed; border-radius: 8px;
    color: #9a3412; font-size: 12.5px; }
  .legend { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 10px;
    font-size: 12.5px; color: var(--ink-2); }
  .legend span { display: inline-flex; align-items: center; gap: 5px; }
  footer { margin-top: 48px; color: var(--ink-2); font-size: 12px; text-align: center; }
  @media print { body { background: #fff; } .wrap { padding: 0; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <p class="eyebrow">FACTORY ROBOTICS · TRAINING CURRICULUM</p>
    <h1>R&amp;D 연구원 육성 커리큘럼</h1>
    <p>대상: 경력 3년 이상 10년 미만 R&amp;D 연구원 · 기준: 4대 도메인 스킬 온톨로지
      ${robotSkills.length}개 스킬 / 중간분류 ${subcategories.length}개 · 발행일 ${generatedAt}</p>
    <div class="legend">
      ${colleges
        .map(
          (college) =>
            `<span><i class="dot" style="display:inline-block;background:${COLLEGE_COLORS[college.id]}"></i>${esc(college.name)}</span>`,
        )
        .join("")}
    </div>
  </header>

  <h2>1. 경력 구간별 육성 경로</h2>
  <p>레벨 체계(AX Starter~Expert)와 육성 트랙(부트캠프 → 페어 임베드 → 솔로 임베드 → 인증)에 정렬된 3구간 경로입니다.</p>
  <table>
    <thead><tr><th>경력 구간</th><th>목표 레벨</th><th>이수 계획</th></tr></thead>
    <tbody>
      ${CAREER_PATHS.map(
        (row) =>
          `<tr><td><strong>${esc(row.band)}</strong></td><td>${esc(row.target)}</td><td>${esc(row.plan)}</td></tr>`,
      ).join("")}
    </tbody>
  </table>

  <h2>2. 공통 모듈 (전 도메인 필수 · 총 ${totalCommonHours}h)</h2>
  <p>Data Intelligence 허브 선수 체계에 근거한 전 도메인 공통 코어입니다. 도메인 모듈에서 같은 스킬은 "공통 이수 인정"으로 중복 이수하지 않습니다.</p>
  <div class="grid">
    ${COMMON_MODULES.map(
      (module) => `
    <div class="card">
      <h3>${module.id}. ${esc(module.name)}</h3>
      <p class="goal">${esc(module.goal)}</p>
      <p class="meta-line">${module.skillIds.length}개 스킬 · ${sumHours(module.skillIds)}h</p>
      <ul class="skills">${module.skillIds.map((skillId) => skillRow(skillId)).join("")}</ul>
    </div>`,
    ).join("")}
  </div>

  <h2>3. 도메인별 모듈 (중간분류 기준)</h2>
  <p>소속 도메인의 중간분류가 곧 이수 모듈입니다. 3~5년차는 Lv2 이하, 5~8년차는 Lv3, 8~10년차는 Lv4 스킬까지 단계적으로 이수합니다.</p>
  ${domainModules
    .map(
      ({ college, subs, totalHours, skillCount }) => `
  <section class="college-section">
    <div class="college-head" style="background:${COLLEGE_COLORS[college.id]}">
      <h3>${esc(college.name)}</h3>
      <span>${esc(college.role)} · 스킬 ${skillCount}개 · 총 ${totalHours}h</span>
    </div>
    <div class="college-body">
      ${subs
        .map(
          (sub) => `
      <div class="module">
        <h4>${esc(sub.name)}</h4>
        <p class="meta-line">${sub.skills.length}개 · ${sub.levelRange} · ${sub.hours}h</p>
        <ul class="skills">${sub.skills
          .map((skill) => skillRow(skill.skill_id, { markCommon: true }))
          .join("")}</ul>
      </div>`,
        )
        .join("")}
    </div>
  </section>`,
    )
    .join("")}

  <h2>4. 특화 모듈 (Lv3+ 선택 · 크로스 도메인)</h2>
  <p>자사 AI Factory 핵심 기능(자율 정비 / 공정 검증·배포 / 품질 지능화 / 물류·SCM / 지식그래프·sLLM)에 대응하는 크로스 도메인 트랙입니다. 각 모듈은 1人1案 현장 임팩트 과제로 마무리합니다.</p>
  <div class="grid">
    ${SPECIALIZATION_MODULES.map(
      (module) => `
    <div class="card">
      <h3>${module.id}. ${esc(module.name)}</h3>
      <p class="goal">${esc(module.goal)}</p>
      <p class="meta-line">${module.skillIds.length}개 스킬 · ${sumHours(module.skillIds)}h · 연계 도메인: ${module.colleges
        .map((collegeId) => esc(colleges.find((c) => c.id === collegeId)?.name ?? collegeId))
        .join(" · ")}</p>
      <ul class="skills">${module.skillIds.map((skillId) => skillRow(skillId)).join("")}</ul>
      <p class="capstone"><strong>캡스톤:</strong> ${esc(module.capstone)}</p>
    </div>`,
    ).join("")}
  </div>

  <h2>5. 운영·평가 체계</h2>
  <table>
    <thead><tr><th>구분</th><th>내용</th></tr></thead>
    <tbody>
      <tr><td><strong>학습시간 산정</strong></td><td>지식 4h · 기술 8h · 역량 16h (스킬 타입 기준 자동 산출, 스킬 데이터 갱신 시 재발행)</td></tr>
      <tr><td><strong>학습 방식</strong></td><td>지식: 강의/자기학습 → 기술: 실습·시뮬레이션 → 역량: OJT·페어 임베드 현장 과제</td></tr>
      <tr><td><strong>수료 평가</strong></td><td>모듈별 스킬 진단(현재/목표 레벨), 특화 모듈은 캡스톤 산출물을 육성위원회가 승인</td></tr>
      <tr><td><strong>인증 연계</strong></td><td>공통+도메인 Lv2 → AX Practitioner, +Lv3·특화 1개 → AX Specialist, +Cross-College Capstone → AX Expert</td></tr>
      <tr><td><strong>이력 관리</strong></td><td>후보자 프로파일(docs/CANDIDATE_PROFILE_PLAN.md)의 학습 이력·스킬 진단에 기록</td></tr>
    </tbody>
  </table>

  <footer>
    Factory Robotics Skill Map · 스킬 온톨로지 기반 자동 생성 문서 —
    데이터 변경 시 <code>npm run generate:curriculum-html</code> 로 재발행하십시오.
  </footer>
</div>
</body>
</html>
`;

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");
  console.log(outputPath);
}

main();
