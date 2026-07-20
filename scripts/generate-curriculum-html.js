#!/usr/bin/env node
// R&D 연구원(경력 3~10년) 육성 커리큘럼 HTML 발행 스크립트.
//
// 대학 학부 커리큘럼 형식(과목 코드·학점·이수구분·선수과목·참고자료)으로,
// 레벨(AX Practitioner/Specialist/Expert) 기준 분류. 과목은 온톨로지의
// 중간분류 × 숙련도 레벨에서 자동 생성한다.
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
// 학습시간: 지식 4h / 기술 8h / 역량 16h. 학점: 15h = 1학점(최소 1학점).
const HOURS_BY_TYPE = { knowledge: 4, skill: 8, competence: 16 };
const creditsOf = (hours) => Math.max(1, Math.round(hours / 15));

const COLLEGE_COLORS = {
  "physical-ai": "#4f46e5",
  "agentic-ai": "#0d9488",
  "digital-twin": "#9333ea",
  "data-intelligence": "#0891b2",
};
const COLLEGE_PREFIX = {
  "physical-ai": "PA",
  "agentic-ai": "AA",
  "digital-twin": "DT",
  "data-intelligence": "DI",
};

// 레벨 밴드: 대학 학부의 학년 개념에 대응 (2xx 핵심 / 3xx 심화 / 4xx 전문)
const BANDS = [
  { key: "P", digit: 2, suffix: "핵심", test: (level) => level <= 2 },
  { key: "S", digit: 3, suffix: "심화", test: (level) => level === 3 },
  { key: "E", digit: 4, suffix: "전문", test: (level) => level === 4 },
];

// ==================== 참고자료 큐레이션 (외부 표준·대표 교재) ====================
// 발행 시점 기준의 대표 국제표준·교재·공개 강좌. 사내 교보재 확정 시 대체한다.

const REFS_BY_SUBCATEGORY = {
  "pa-industrial": ["ISO 10218-1/-2 (산업용 로봇 안전)", "J. Craig, 『Introduction to Robotics: Mechanics and Control』"],
  "pa-cobot": ["ISO/TS 15066 (협동로봇 안전)", "협동로봇 제조사 공인 교육과정 (예: UR Academy)"],
  "pa-maintenance": ["ISO 13374/13381 (상태감시·예지진단)", "『Maintenance Engineering Handbook』 (Mobley)"],
  "pa-amr": ["S. Thrun 외, 『Probabilistic Robotics』", "ROS 2 Nav2 공식 문서, VDA 5050 (AGV 인터페이스)"],
  "pa-vision-hw": ["R. Szeliski, 『Computer Vision: Algorithms and Applications』", "GenICam/GigE Vision 표준"],
  "aa-agent-design": ["UC Berkeley LLM Agents 공개 강좌", "Anthropic/OpenAI 에이전트 설계 가이드, ReAct 논문"],
  "aa-mes-planning": ["IEC 62264 (ISA-95, 기업-제어 통합)", "Hopp & Spearman, 『Factory Physics』"],
  "aa-quality": ["D. Montgomery, 『Introduction to Statistical Quality Control』", "AIAG SPC 매뉴얼"],
  "aa-autonomous-ops": ["VDA 5050", "Bartholdi & Hackman, 『Warehouse & Distribution Science』"],
  "aa-governance": ["NIST AI Risk Management Framework", "ISO/IEC 42001 (AI 경영시스템)"],
  "aa-equipment": ["ISO 13381-1 (예지진단 프로세스)", "PHM Society 튜토리얼 자료"],
  "aa-dev-agent": ["MLOps/CI·CD 실무 문헌 (예: 『Reliable Machine Learning』)", "이산사건 시뮬레이션 기반 공정 검증 사례"],
  "di-signal": ["Gonzalez & Woods, 『Digital Image Processing』", "Oppenheim, 『Signals and Systems』"],
  "di-pipeline": ["M. Kleppmann, 『Designing Data-Intensive Applications』"],
  "di-analytics": ["『An Introduction to Statistical Learning』 (James 외)", "시계열 분석 개론 (Hyndman, 『Forecasting: Principles and Practice』)"],
  "di-network": ["IEC 62541 (OPC UA)", "MQTT/Sparkplug B 사양, TSN 개요"],
  "di-knowledge": ["W3C RDF/OWL/SPARQL 표준", "Hogan 외, 『Knowledge Graphs』, LLM 파인튜닝·평가 공개 강좌"],
  "dt-modeling": ["ISO 23247 (제조 디지털트윈 프레임워크)", "URDF/OpenUSD 문서"],
  "dt-scenario": ["J. Banks 외, 『Discrete-Event System Simulation』 (시나리오 설계)"],
  "dt-design-verify": ["ISO 23247", "생산 라인 설계 검증·레이아웃 사례"],
  "dt-vc": ["IEC 61131-3 (PLC 언어)", "가상 커미셔닝(Virtual Commissioning) 실무 사례"],
  "dt-data-sync": ["IEC 62541 (OPC UA)", "Asset Administration Shell (IDTA) 사양"],
  "dt-realtime": ["실시간 데이터 스트리밍·디지털트윈 운영 문헌"],
  "dt-optimize": ["Hillier & Lieberman, 『Introduction to Operations Research』"],
};

// ==================== 공통 과목 (교양·공통필수) ====================

const COMMON_COURSES = [
  {
    code: "CC201",
    name: "데이터·AI 리터러시",
    goal: "전 도메인 공통의 데이터 처리·AI 에이전트 기초 체계 확립",
    refs: ["Python 데이터 분석 입문 (McKinney, 『Python for Data Analysis』)", "Anthropic/OpenAI 에이전트 개요 자료"],
    skillIds: ["RSF-AAM-001", "RSF-AAM-002", "RSF-MVS-003", "RSF-MVS-008", "RSF-MVS-019", "RSF-RMD-007"],
  },
  {
    code: "CC202",
    name: "스마트팩토리 시스템·데이터 기반",
    goal: "기간계(MES 등)·OT 네트워크·Data Fabric 구조 이해",
    refs: ["IEC 62264 (ISA-95)", "IEC 62541 (OPC UA) 개요"],
    skillIds: ["RSF-AAM-003", "RSF-AAM-027", "RSF-AMR-004", "RSF-AMR-014"],
  },
  {
    code: "CC203",
    name: "안전·휴먼-인-더-루프",
    goal: "로봇 안전 표준과 자동 판단의 승인·가드레일 설계 원칙 체득",
    refs: ["ISO 10218, ISO/TS 15066", "NIST AI RMF"],
    skillIds: ["RSF-IRC-003", "RSF-CRO-001", "RSF-AAM-013", "RSF-AAM-014"],
  },
];

// ==================== 특화 트랙 (Specialist 이상 전공선택) ====================

const SPECIALIZATION_TRACKS = [
  {
    code: "TR301",
    name: "예지보전·자율 정비",
    goal: "상태 데이터 → 고장 예측 → 자율 정비 실행의 설비 Agent 체계 구축",
    capstone: "담당 설비 1종의 예지보전 파이프라인 구축과 자율 정비 시나리오 검증 (1人1案 연계)",
    refs: ["ISO 13381-1", "PHM Society 자료"],
    skillIds: ["RSF-RMD-006", "RSF-RMD-007", "RSF-RMD-017", "RSF-RMD-015", "RSF-RMD-016", "RSF-AAM-022", "RSF-DTS-012"],
  },
  {
    code: "TR302",
    name: "가상 커미셔닝·공정 검증",
    goal: "신규 공정 시나리오의 에뮬레이터 가상 검증과 현장 배포 연결",
    capstone: "신규/개조 공정 1건의 가상 커미셔닝과 개발 Agent 배포 파이프라인 시연",
    refs: ["ISO 23247", "IEC 61131-3 (PLC 언어)"],
    skillIds: ["RSF-IRC-012", "RSF-IRC-023", "RSF-DTS-022", "RSF-DTS-008", "RSF-DTS-015", "RSF-DTS-016", "RSF-AAM-023"],
  },
  {
    code: "TR303",
    name: "품질 지능화",
    goal: "비전 검사·SPC 기반 품질 판정 자동화와 자동 격리 운영",
    capstone: "담당 공정 검사 항목의 자동 판정 모델 구축과 오판정률 목표 달성 리포트",
    refs: ["Montgomery, 『Statistical Quality Control』", "AIAG SPC 매뉴얼"],
    skillIds: ["RSF-MVS-004", "RSF-MVS-007", "RSF-MVS-013", "RSF-MVS-016", "RSF-AAM-004", "RSF-AAM-012", "RSF-AAM-016"],
  },
  {
    code: "TR304",
    name: "자율 물류·SCM 통합",
    goal: "AMR 함대 관제·자재/협력사 연동·물류-SCM 실행 통합 설계",
    capstone: "물류 구간 1개의 함대 운영 KPI 개선안과 SCM 실행 데이터 연계 설계",
    refs: ["VDA 5050", "『Warehouse & Distribution Science』"],
    skillIds: ["RSF-AMR-005", "RSF-AMR-009", "RSF-AMR-010", "RSF-AMR-020", "RSF-AAM-024", "RSF-AAM-025"],
  },
  {
    code: "TR305",
    name: "제조 지식그래프·특화 LLM",
    goal: "제조 문서의 지식그래프 구조화와 제조 특화 sLLM 데이터·평가 체계 구축",
    capstone: "담당 공정 문서군의 온톨로지 구축과 sLLM 질의응답 품질 평가 리포트",
    refs: ["W3C RDF/OWL", "『Knowledge Graphs』 (Hogan 외)"],
    skillIds: ["RSF-AAM-026", "RSF-AAM-027", "RSF-AAM-028", "RSF-DTS-005", "RSF-DTS-011", "RSF-MVS-014"],
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

const curatedIds = [
  ...COMMON_COURSES.flatMap((course) => course.skillIds),
  ...SPECIALIZATION_TRACKS.flatMap((track) => track.skillIds),
];
const missing = curatedIds.filter((skillId) => !skillById.has(skillId));
if (missing.length > 0) {
  console.error(`존재하지 않는 스킬 ID: ${missing.join(", ")}`);
  process.exit(1);
}

const commonSkillIds = new Set(
  COMMON_COURSES.flatMap((course) => course.skillIds),
);

const hoursOf = (skill) => HOURS_BY_TYPE[skill.skill_type] ?? 8;
const sumHours = (skillIds) =>
  skillIds.reduce((sum, skillId) => sum + hoursOf(skillById.get(skillId)), 0);

const colleges = [...collegeMapping.colleges].sort((a, b) => a.order - b.order);
const collegeNameById = new Map(colleges.map((college) => [college.id, college.name]));

// 중간분류 × 레벨 밴드 → 과목 자동 생성
const coursesByBand = { P: [], S: [], E: [] };
const seqByCollegeBand = {};

colleges.forEach((college) => {
  subcategoryData.subcategories
    .filter((subcategory) => subcategory.collegeId === college.id)
    .sort((a, b) => a.order - b.order)
    .forEach((subcategory) => {
      const subSkills = robotSkills.filter(
        (skill) =>
          subcategoryData.skillSubcategories[skill.skill_id] === subcategory.id,
      );
      let previousCourseCode = null;
      BANDS.forEach((band) => {
        const bandSkills = subSkills
          .filter((skill) => band.test(skill.proficiency_level))
          .sort((a, b) => a.skill_id.localeCompare(b.skill_id));
        if (bandSkills.length === 0) return;
        const seqKey = `${college.id}:${band.key}`;
        seqByCollegeBand[seqKey] = (seqByCollegeBand[seqKey] ?? 0) + 1;
        const code = `${COLLEGE_PREFIX[college.id]}${band.digit}${String(
          seqByCollegeBand[seqKey],
        ).padStart(2, "0")}`;
        const hours = bandSkills.reduce((sum, skill) => sum + hoursOf(skill), 0);
        const course = {
          code,
          collegeId: college.id,
          name: `${subcategory.name} ${band.suffix}`,
          type: band.key === "P" ? "전공필수" : band.key === "S" ? "전공심화" : "전공전문",
          hours,
          credits: creditsOf(hours),
          prereq:
            band.key === "P"
              ? "CC201~CC203"
              : previousCourseCode ?? "소속 도메인 핵심 과목",
          refs: REFS_BY_SUBCATEGORY[subcategory.id] ?? [],
          skills: bandSkills,
        };
        coursesByBand[band.key].push(course);
        previousCourseCode = code;
      });
    });
});

// ==================== HTML ====================

const esc = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function skillList(skills, { markCommon = false } = {}) {
  return `<details><summary>포함 스킬 ${skills.length}개 보기</summary><ul class="skills">${skills
    .map((skill) => {
      const color = COLLEGE_COLORS[collegeOf(skill)] ?? "#64748b";
      const badge =
        markCommon && commonSkillIds.has(skill.skill_id)
          ? '<span class="badge">공통 이수 인정</span>'
          : "";
      return `<li><span class="dot" style="background:${color}"></span>
        <span class="skill-name">${esc(skill.preferred_label_ko)}</span>
        <span class="skill-meta">${esc(skill.skill_id)} · Lv${skill.proficiency_level} · ${hoursOf(skill)}h</span>${badge}</li>`;
    })
    .join("")}</ul></details>`;
}

function courseTable(courses, { markCommon = false } = {}) {
  return `<table class="courses">
    <thead><tr><th>코드</th><th>과목명</th><th>이수구분</th><th>학점</th><th>시수</th><th>선수과목</th><th>주요 참고자료</th></tr></thead>
    <tbody>
    ${courses
      .map(
        (course) => `<tr>
      <td class="code"><span class="chip" style="background:${COLLEGE_COLORS[course.collegeId] ?? "#475569"}">${esc(course.code)}</span></td>
      <td class="name"><strong>${esc(course.name)}</strong>
        <span class="college-tag">${esc(collegeNameById.get(course.collegeId) ?? "공통")}</span>
        ${skillList(course.skills, { markCommon })}</td>
      <td>${esc(course.type)}</td>
      <td class="num">${course.credits}</td>
      <td class="num">${course.hours}h</td>
      <td>${esc(course.prereq)}</td>
      <td class="refs">${course.refs.map(esc).join("<br/>")}</td>
    </tr>`,
      )
      .join("")}
    </tbody></table>`;
}

const commonCourses = COMMON_COURSES.map((course) => {
  const skills = course.skillIds.map((skillId) => skillById.get(skillId));
  const hours = sumHours(course.skillIds);
  return {
    code: course.code,
    collegeId: null,
    name: course.name,
    type: "공통필수",
    hours,
    credits: creditsOf(hours),
    prereq: "-",
    refs: course.refs,
    skills,
  };
});

const bandCredits = (band) =>
  coursesByBand[band].reduce((sum, course) => sum + course.credits, 0);
const commonCredits = commonCourses.reduce(
  (sum, course) => sum + course.credits,
  0,
);
const trackAverageCredits = Math.round(
  SPECIALIZATION_TRACKS.reduce(
    (sum, track) => sum + creditsOf(sumHours(track.skillIds)),
    0,
  ) / SPECIALIZATION_TRACKS.length,
);

const generatedAt = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>R&D 연구원 육성 커리큘럼 — AI Factory Skill Fab</title>
<style>
  :root { --ink:#1e293b; --ink-2:#64748b; --line:#e2e8f0; --bg:#f8fafc; --card:#fff; --accent:#4338ca; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Pretendard","Noto Sans KR",system-ui,sans-serif; color:var(--ink); background:var(--bg); line-height:1.55; }
  .wrap { max-width:1120px; margin:0 auto; padding:40px 20px 80px; }
  header.hero { text-align:center; margin-bottom:32px; }
  .eyebrow { color:var(--accent); font-size:12px; font-weight:800; letter-spacing:.14em; margin:0; }
  h1 { margin:8px 0 6px; font-size:clamp(26px,4vw,38px); }
  .hero p { color:var(--ink-2); max-width:760px; margin:0 auto; }
  h2 { margin:44px 0 4px; font-size:21px; border-left:5px solid var(--accent); padding-left:10px; }
  h2 .lv { color:var(--ink-2); font-weight:600; font-size:14px; margin-left:8px; }
  h2 + p { margin:0 0 14px; color:var(--ink-2); font-size:14px; }
  table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th,td { padding:9px 11px; border-bottom:1px solid var(--line); text-align:left; font-size:13.5px; vertical-align:top; }
  th { background:#f1f5f9; font-size:12.5px; white-space:nowrap; }
  tr:last-child td { border-bottom:none; }
  td.num { text-align:right; white-space:nowrap; }
  td.code { white-space:nowrap; }
  td.refs { color:var(--ink-2); font-size:12px; }
  .chip { color:#fff; font-weight:800; font-size:12px; padding:2px 8px; border-radius:6px; }
  .college-tag { display:inline-block; margin-left:6px; color:var(--ink-2); font-size:11px; }
  details { margin-top:4px; }
  summary { cursor:pointer; color:var(--accent); font-size:12px; font-weight:700; }
  ul.skills { list-style:none; margin:6px 0 2px; padding:0; display:flex; flex-direction:column; gap:4px; }
  ul.skills li { display:flex; align-items:center; gap:6px; font-size:12.5px; flex-wrap:wrap; }
  .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .skill-name { font-weight:600; }
  .skill-meta { color:var(--ink-2); font-size:11px; }
  .badge { font-size:10px; font-weight:800; padding:1px 6px; border-radius:999px; background:#ecfdf5; color:#047857; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:14px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:15px 17px; }
  .card h3 { margin:0 0 3px; font-size:15px; }
  .goal { margin:0 0 6px; color:var(--ink-2); font-size:12.5px; }
  .meta-line { font-size:12px; color:var(--ink-2); font-weight:700; }
  .capstone { margin:9px 0 0; padding:8px 10px; background:#fff7ed; border-radius:8px; color:#9a3412; font-size:12px; }
  .refs-line { margin:7px 0 0; color:var(--ink-2); font-size:11.5px; }
  .legend { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; margin-top:10px; font-size:12.5px; color:var(--ink-2); }
  .legend span { display:inline-flex; align-items:center; gap:5px; }
  footer { margin-top:48px; color:var(--ink-2); font-size:12px; text-align:center; }
  @media print { body{background:#fff} .wrap{padding:0} details{display:none} }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <p class="eyebrow">FACTORY ROBOTICS · TRAINING CURRICULUM</p>
    <h1>R&amp;D 연구원 육성 커리큘럼</h1>
    <p>대상: 경력 3년 이상 10년 미만 R&amp;D 연구원 · 학부 커리큘럼 형식(과목·학점제) ·
      기준: 4대 도메인 온톨로지 ${robotSkills.length}개 스킬 · 15h = 1학점 · 발행일 ${generatedAt}</p>
    <div class="legend">
      ${colleges
        .map(
          (college) =>
            `<span><i class="dot" style="display:inline-block;background:${COLLEGE_COLORS[college.id]}"></i>${esc(college.name)}</span>`,
        )
        .join("")}
    </div>
  </header>

  <h2>이수 체계 요약</h2>
  <p>레벨은 학부의 학년 개념(2xx 핵심 / 3xx 심화 / 4xx 전문·캡스톤)에 대응합니다. 소속 도메인 과목 + 공통필수 + 특화 트랙 1개가 개인 이수 범위입니다.</p>
  <table>
    <thead><tr><th>과정</th><th>대상</th><th>수료(인증) 요건</th><th>학점 규모</th></tr></thead>
    <tbody>
      <tr><td><strong>Practitioner 과정 (Lv2)</strong></td><td>3~5년차</td><td>공통필수 3과목 + 소속 도메인 2xx 전공필수 전체, 통합 부트캠프 수료</td><td>공통 ${commonCredits}학점 + 도메인 핵심 2~15학점</td></tr>
      <tr><td><strong>Specialist 과정 (Lv3)</strong></td><td>5~8년차</td><td>소속 도메인 3xx 전공심화 + 특화 트랙 1개(캡스톤 승인), 페어 임베드 과제 1건</td><td>도메인 심화 3~14학점 + 트랙 약 ${trackAverageCredits}학점</td></tr>
      <tr><td><strong>Expert 과정 (Lv4)</strong></td><td>8~10년차</td><td>4xx 전공전문 + 타 도메인 크로스 과목 1개, Cross-College Capstone·1人1案 승인</td><td>전문 과목 + 캡스톤</td></tr>
    </tbody>
  </table>

  <h2>공통필수 과목 <span class="lv">전 도메인 · Practitioner 진입 전 이수</span></h2>
  <p>Data Intelligence 허브 선수 체계에 근거한 공통 코어입니다. 도메인 과목과 겹치는 스킬은 "공통 이수 인정"으로 중복 이수하지 않습니다.</p>
  ${courseTable(commonCourses)}

  <h2>Practitioner 과정 <span class="lv">Lv2 · 2xx 전공필수 · 총 ${bandCredits("P")}학점 규모</span></h2>
  <p>소속 도메인의 2xx 과목만 이수합니다. 선수과목: 공통필수(CC201~CC203).</p>
  ${courseTable(coursesByBand.P, { markCommon: true })}

  <h2>Specialist 과정 <span class="lv">Lv3 · 3xx 전공심화 · 총 ${bandCredits("S")}학점 규모</span></h2>
  <p>소속 도메인의 3xx 과목과 아래 특화 트랙 1개를 이수합니다.</p>
  ${courseTable(coursesByBand.S, { markCommon: true })}

  <h2>특화 트랙 <span class="lv">Specialist 이상 · 전공선택 · 택1 · 캡스톤 필수</span></h2>
  <p>자사 AI Factory 핵심 기능(자율 정비 / 공정 검증·배포 / 품질 / 물류·SCM / 지식그래프·sLLM)에 대응하는 크로스 도메인 트랙입니다.</p>
  <div class="grid">
    ${SPECIALIZATION_TRACKS.map((track) => {
      const skills = track.skillIds.map((skillId) => skillById.get(skillId));
      const hours = sumHours(track.skillIds);
      return `
    <div class="card">
      <h3>${esc(track.code)} ${esc(track.name)}</h3>
      <p class="goal">${esc(track.goal)}</p>
      <p class="meta-line">${skills.length}개 스킬 · ${hours}h · ${creditsOf(hours)}학점 · 선수: 소속 도메인 3xx</p>
      ${skillList(skills)}
      <p class="capstone"><strong>캡스톤:</strong> ${esc(track.capstone)}</p>
      <p class="refs-line">참고: ${track.refs.map(esc).join(" · ")}</p>
    </div>`;
    }).join("")}
  </div>

  <h2>Expert 과정 <span class="lv">Lv4 · 4xx 전공전문 · 총 ${bandCredits("E")}학점 규모</span></h2>
  <p>도메인 최고 난도 역량 과목입니다. 수료는 Cross-College Capstone(타 도메인 협업 과제)과 1人1案 승인으로 인증하며, AX Expert(Lv4) 자격과 연동됩니다.</p>
  ${courseTable(coursesByBand.E, { markCommon: true })}

  <h2>운영 원칙</h2>
  <table>
    <thead><tr><th>구분</th><th>내용</th></tr></thead>
    <tbody>
      <tr><td><strong>학습 방식</strong></td><td>지식(4h) 강의·자기학습 → 기술(8h) 실습·시뮬레이션 → 역량(16h) OJT·페어 임베드 현장 과제</td></tr>
      <tr><td><strong>수료 평가</strong></td><td>과목별 스킬 진단(현재/목표 레벨 도달), 특화 트랙은 캡스톤 산출물을 육성위원회가 승인</td></tr>
      <tr><td><strong>참고자료</strong></td><td>발행 시점 기준 대표 국제표준·교재·공개 강좌. 사내 교보재 확정 시 과목별로 대체</td></tr>
      <tr><td><strong>이력 관리</strong></td><td>이수·진단 기록은 후보자 프로파일(docs/CANDIDATE_PROFILE_PLAN.md)의 학습 이력에 축적</td></tr>
      <tr><td><strong>재발행</strong></td><td>스킬 온톨로지 변경 시 <code>npm run generate:curriculum-html</code> 로 과목·학점 자동 재산출</td></tr>
    </tbody>
  </table>

  <footer>AI Factory Skill Fab · 스킬 온톨로지 기반 자동 생성 문서 (${generatedAt})</footer>
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
