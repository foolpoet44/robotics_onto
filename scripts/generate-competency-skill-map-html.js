#!/usr/bin/env node

const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const competencyDataset = require("../public/data/employee-competency-assessments.json");
const robotSkills = require("../public/data/robot-smartfactory.json");

const outputPath =
  process.argv[2] ??
  path.join(
    process.env.HOME,
    ".agent",
    "diagrams",
    "competency-skill-map-2026.html",
  );

const skillById = Object.fromEntries(
  robotSkills.map((skill) => [skill.skill_id, skill]),
);

const collegeToRobotDomains = {
  "physical-ai": [
    "industrial-robot-control",
    "collaborative-robot",
    "autonomous-mobile-robot",
    "robot-maintenance-diagnostics",
  ],
  "agentic-ai": [
    "agentic-ai-manufacturing",
    "autonomous-mobile-robot",
    "industrial-robot-control",
    "digital-twin-simulation",
    "collaborative-robot",
  ],
  "digital-twin": ["digital-twin-simulation"],
  "data-intelligence": [
    "machine-vision-sensor",
    "digital-twin-simulation",
    "robot-maintenance-diagnostics",
  ],
};

const competencySkillMap = require("../public/data/competency-skill-map.json");

// 역량 소분류 → 스킬 매핑의 단일 출처는 public/data/competency-skill-map.json 이다.
// (과거 이 파일에 인라인으로 있던 directRules 30건 + 업무역량 억지매핑 14건을
//  정식 데이터로 승격했다. 14건은 제조 스킬 온톨로지 범위 밖으로 outOfScope 처리.)
const directRules = competencySkillMap.mappings;
const outOfScopeRules = competencySkillMap.outOfScope;

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uniqueCompetencies() {
  const rows = new Map();

  for (const employee of competencyDataset.employees) {
    for (const competency of employee.competencies) {
      const key = competency.minorCategory;
      if (!rows.has(key)) {
        rows.set(key, {
          minor: key,
          major: competency.majorCategory,
          middle: competency.middleCategory,
          collegeId: competency.collegeId,
          collegeNameKo: competency.collegeNameKo,
          count: 0,
          scoreTotal: 0,
        });
      }

      const row = rows.get(key);
      row.count += 1;
      row.scoreTotal += competency.score;
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      averageScore: Number((row.scoreTotal / row.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count || a.minor.localeCompare(b.minor, "ko"));
}

function fallbackSkills(row) {
  const targetDomains = new Set(collegeToRobotDomains[row.collegeId] ?? []);
  const query = normalize(`${row.major} ${row.middle} ${row.minor}`);
  const terms = query.split(/\s+/).filter((term) => term.length >= 2);

  return robotSkills
    .map((skill) => {
      const haystack = normalize(
        `${skill.preferred_label_ko} ${skill.preferred_label_en} ${skill.description_ko} ${skill.smartfactory_context}`,
      );
      const lexicalScore = terms.reduce(
        (score, term) => score + (haystack.includes(term) ? 1 : 0),
        0,
      );
      const domainScore = targetDomains.has(skill.domain) ? 2 : 0;
      return { skill, score: lexicalScore + domainScore };
    })
    .filter((item) => item.score > 1)
    .sort(
      (a, b) =>
        b.score - a.score || a.skill.skill_id.localeCompare(b.skill.skill_id),
    )
    .slice(0, 5)
    .map((item) => item.skill.skill_id);
}

function confidenceFrom(rule, candidateCount) {
  if (rule?.confidence) {
    return rule.confidence;
  }
  if (candidateCount >= 4) {
    return "high";
  }
  if (candidateCount >= 2) {
    return "medium";
  }
  return "low";
}

function mapCompetency(row) {
  const outOfScope = outOfScopeRules[row.minor];
  if (outOfScope) {
    return {
      ...row,
      confidence: "out-of-scope",
      note: outOfScope.reason,
      skills: [],
    };
  }

  const rule = directRules[row.minor];
  const skillIds = (rule?.skillIds ?? fallbackSkills(row)).filter(
    (id) => skillById[id],
  );
  const confidence = confidenceFrom(rule, skillIds.length);

  return {
    ...row,
    confidence,
    note: rule?.note ?? "전문영역과 키워드 유사도를 기준으로 자동 후보를 산출",
    skills: skillIds.map((skillId) => skillById[skillId]),
  };
}

const mappedRows = uniqueCompetencies().map(mapCompetency);
const mappedSkillIds = new Set(
  mappedRows.flatMap((row) => row.skills.map((skill) => skill.skill_id)),
);
const unmappedRows = mappedRows.filter((row) => row.skills.length === 0);

const byCollege = competencyDataset.colleges.map((college) => {
  const rows = mappedRows.filter((row) => row.collegeId === college.id);
  const linkedSkillIds = new Set(
    rows.flatMap((row) => row.skills.map((skill) => skill.skill_id)),
  );
  return {
    ...college,
    competencyCount: rows.length,
    employeeCount: rows.reduce((sum, row) => sum + row.count, 0),
    skillCount: linkedSkillIds.size,
  };
});

const domainCounts = robotSkills.reduce((acc, skill) => {
  acc[skill.domain] ??= {
    domain: skill.domain,
    domainEn: skill.domain_en,
    total: 0,
    linked: 0,
  };
  acc[skill.domain].total += 1;
  if (mappedSkillIds.has(skill.skill_id)) {
    acc[skill.domain].linked += 1;
  }
  return acc;
}, {});

const topRows = mappedRows.slice(0, 12);
const htmlRows = mappedRows
  .map((row) => {
    const skillChips = row.skills
      .map(
        (skill) => `
          <span class="skill-chip" title="${escapeHtml(skill.description_ko)}">
            <b>${escapeHtml(skill.skill_id)}</b>
            ${escapeHtml(skill.preferred_label_ko)}
            <small>L${escapeHtml(skill.proficiency_level)} · ${escapeHtml(skill.domain_en)}</small>
          </span>`,
      )
      .join("");

    return `
      <tr data-college="${escapeHtml(row.collegeId)}" data-confidence="${escapeHtml(row.confidence)}">
        <td>
          <strong>${escapeHtml(row.minor)}</strong>
          <small>${escapeHtml(row.major)} / ${escapeHtml(row.middle)}</small>
        </td>
        <td><span class="area area-${escapeHtml(row.collegeId)}">${escapeHtml(row.collegeNameKo)}</span></td>
        <td class="num">${escapeHtml(row.count)}</td>
        <td class="num">${escapeHtml(row.averageScore.toFixed(2))}</td>
        <td><span class="confidence ${escapeHtml(row.confidence)}">${escapeHtml(row.confidence)}</span></td>
        <td class="skills">${skillChips || '<span class="empty">후보 없음</span>'}</td>
        <td>${escapeHtml(row.note)}</td>
      </tr>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>직무역량평가_2026 × Factory Robotics Skill Map</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f8faf9;
      --surface: #ffffff;
      --surface-2: #eef4f2;
      --border: rgba(30, 58, 95, 0.14);
      --text: #182235;
      --text-dim: #5c6b7c;
      --blue: #1e3a5f;
      --gold: #d4a73a;
      --teal: #0f766e;
      --rose: #be123c;
      --green: #2f855a;
      --amber: #b7791f;
      --red: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      background:
        linear-gradient(rgba(30, 58, 95, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30, 58, 95, 0.035) 1px, transparent 1px),
        radial-gradient(circle at 18% 10%, rgba(212, 167, 58, 0.18), transparent 30%),
        radial-gradient(circle at 88% 0%, rgba(15, 118, 110, 0.12), transparent 26%),
        var(--bg);
      background-size: 28px 28px, 28px 28px, auto, auto, auto;
    }
    header, main { max-width: 1360px; margin: 0 auto; padding: 0 28px; }
    header { padding-top: 56px; padding-bottom: 28px; }
    .eyebrow {
      margin: 0 0 12px;
      color: var(--blue);
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 980px;
      margin: 0;
      font-size: clamp(34px, 5vw, 68px);
      line-height: 0.98;
      letter-spacing: -0.03em;
    }
    .lead {
      max-width: 880px;
      margin: 22px 0 0;
      color: var(--text-dim);
      font-size: 18px;
      line-height: 1.75;
    }
    .metric-grid, .area-grid, .domain-grid {
      display: grid;
      gap: 14px;
    }
    .metric-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 26px 0; }
    .area-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 22px 0; }
    .domain-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 22px 0; }
    .card {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 14px 36px rgba(24, 34, 53, 0.07);
    }
    .metric { padding: 18px; }
    .metric small, .area-card small, .domain-card small {
      display: block;
      color: var(--text-dim);
      font-size: 12px;
      font-weight: 700;
    }
    .metric strong {
      display: block;
      margin-top: 6px;
      font-size: 30px;
      letter-spacing: -0.03em;
    }
    .section { margin: 34px 0; }
    .section-head {
      display: flex;
      gap: 20px;
      align-items: end;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    h2 { margin: 0; font-size: 26px; letter-spacing: -0.02em; }
    .section-head p { max-width: 760px; margin: 8px 0 0; color: var(--text-dim); line-height: 1.7; }
    .area-card, .domain-card { padding: 18px; border-top: 5px solid var(--blue); }
    .area-card h3, .domain-card h3 { margin: 0 0 8px; font-size: 18px; }
    .area-card .split, .domain-card .split {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 16px;
      color: var(--text-dim);
    }
    .area-card .split b, .domain-card .split b { color: var(--text); font-size: 22px; }
    .area-physical-ai { border-color: var(--teal); }
    .area-agentic-ai { border-color: var(--gold); }
    .area-digital-twin { border-color: var(--blue); }
    .area-data-intelligence { border-color: var(--rose); }
    .flow {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      gap: 12px;
      align-items: stretch;
      padding: 18px;
    }
    .flow-node {
      min-height: 132px;
      padding: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .flow-node h3 { margin: 0 0 10px; }
    .flow-node ul { margin: 0; padding-left: 18px; color: var(--text-dim); line-height: 1.65; }
    .arrow {
      display: grid;
      place-items: center;
      color: var(--gold);
      font-family: "IBM Plex Mono", monospace;
      font-size: 28px;
      font-weight: 700;
    }
    .top-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .top-item {
      padding: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .top-item strong { display: block; margin-bottom: 8px; }
    .top-item span { color: var(--text-dim); font-size: 13px; }
    .filters {
      position: sticky;
      top: 0;
      z-index: 5;
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 12px;
      padding: 14px;
      margin-bottom: 0;
      background: rgba(248, 250, 249, 0.92);
      border: 1px solid var(--border);
      border-radius: 10px 10px 0 0;
      backdrop-filter: blur(10px);
    }
    label { color: var(--text-dim); font-size: 12px; font-weight: 700; }
    input, select {
      width: 100%;
      height: 42px;
      margin-top: 5px;
      padding: 0 12px;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      font: inherit;
    }
    .table-wrap {
      overflow: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-top: 0;
      border-radius: 0 0 10px 10px;
    }
    table { width: 100%; min-width: 1180px; border-collapse: collapse; }
    th, td {
      padding: 13px 14px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--blue);
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      background: #f2f6f5;
    }
    td small { display: block; margin-top: 4px; color: var(--text-dim); }
    .num { font-family: "IBM Plex Mono", monospace; font-weight: 700; text-align: right; }
    .area, .confidence {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 999px;
    }
    .area-physical-ai { color: var(--teal); background: rgba(15, 118, 110, 0.10); }
    .area-agentic-ai { color: #8a5b00; background: rgba(212, 167, 58, 0.18); }
    .area-digital-twin { color: var(--blue); background: rgba(30, 58, 95, 0.10); }
    .area-data-intelligence { color: var(--rose); background: rgba(190, 18, 60, 0.10); }
    .confidence.high { color: var(--green); background: rgba(47, 133, 90, 0.12); }
    .confidence.medium { color: var(--amber); background: rgba(183, 121, 31, 0.14); }
    .confidence.low { color: var(--red); background: rgba(185, 28, 28, 0.10); }
    .skills { min-width: 390px; }
    .skill-chip {
      display: inline-flex;
      flex-direction: column;
      gap: 2px;
      max-width: 250px;
      padding: 7px 9px;
      margin: 0 6px 6px 0;
      color: var(--text);
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.35;
    }
    .skill-chip b { color: var(--blue); font-family: "IBM Plex Mono", monospace; }
    .empty { color: var(--text-dim); }
    footer {
      max-width: 1360px;
      margin: 40px auto;
      padding: 0 28px 50px;
      color: var(--text-dim);
      font-size: 13px;
      line-height: 1.7;
    }
    @media (max-width: 980px) {
      .metric-grid, .area-grid, .domain-grid, .top-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .flow { grid-template-columns: 1fr; }
      .arrow { transform: rotate(90deg); }
      .filters { grid-template-columns: 1fr; position: static; }
    }
    @media (max-width: 640px) {
      header, main, footer { padding-left: 18px; padding-right: 18px; }
      .metric-grid, .area-grid, .domain-grid, .top-list { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">Competency × Skill Map</p>
    <h1>직무역량평가_2026과 Factory Robotics 스킬 매핑 지도</h1>
    <p class="lead">
      평가표의 44개 직무역량 소분류를 이 프로젝트의 127개 로보틱스 스킬에 연결한 후보 지도입니다.
      직접 대응이 강한 항목은 high, 인접 개념은 medium/low로 표시했습니다.
    </p>
    <div class="metric-grid">
      <div class="card metric"><small>평가 인원</small><strong>${escapeHtml(competencyDataset.summary.employeeCount)}명</strong></div>
      <div class="card metric"><small>평가 역량 행</small><strong>${escapeHtml(competencyDataset.summary.competencyCount)}개</strong></div>
      <div class="card metric"><small>고유 직무역량</small><strong>${escapeHtml(mappedRows.length)}개</strong></div>
      <div class="card metric"><small>연결된 스킬</small><strong>${escapeHtml(mappedSkillIds.size)}개</strong></div>
      <div class="card metric"><small>미연결 역량</small><strong>${escapeHtml(unmappedRows.length)}개</strong></div>
    </div>
  </header>

  <main>
    <section class="section card flow" aria-label="매핑 흐름">
      <div class="flow-node">
        <h3>원천 데이터</h3>
        <ul>
          <li>Google Sheet: 직무역량평가_2026</li>
          <li>개인별 핵심역량 ${escapeHtml(competencyDataset.summary.competencyCount)}건</li>
          <li>평가 차수: ${escapeHtml(competencyDataset.assessment.roundName)}</li>
        </ul>
      </div>
      <div class="arrow">→</div>
      <div class="flow-node">
        <h3>중간 지도</h3>
        <ul>
          <li>고유 직무역량 소분류 ${escapeHtml(mappedRows.length)}개</li>
          <li>4개 전문영역 기준 분류</li>
          <li>후보 스킬 및 신뢰도 부여</li>
        </ul>
      </div>
      <div class="arrow">→</div>
      <div class="flow-node">
        <h3>프로젝트 스킬</h3>
        <ul>
          <li>Factory Robotics 스킬 ${escapeHtml(robotSkills.length)}개</li>
          <li>6개 로보틱스 도메인</li>
          <li>스킬 ID 기반 추적 가능</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Four Expert Areas</p>
          <h2>4개 전문영역별 연결 범위</h2>
          <p>평가 직무역량은 앞서 반영한 4개 전문영역으로 묶고, 각 영역 안에서 로보틱스 스킬 후보를 연결했습니다.</p>
        </div>
      </div>
      <div class="area-grid">
        ${byCollege
          .map(
            (area) => `
          <article class="card area-card area-${escapeHtml(area.id)}">
            <h3>${escapeHtml(area.name)}</h3>
            <small>${escapeHtml(area.nameKo)}</small>
            <div class="split"><span>직무역량<br><b>${escapeHtml(area.competencyCount)}</b></span><span>평가 인원<br><b>${escapeHtml(area.employeeCount)}</b></span><span>연결 스킬<br><b>${escapeHtml(area.skillCount)}</b></span></div>
          </article>`,
          )
          .join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Robot Skill Domains</p>
          <h2>로보틱스 도메인별 연결된 스킬</h2>
          <p>현재 프로젝트의 6개 로보틱스 도메인 중 어떤 영역이 평가 역량과 많이 만나는지 보여줍니다.</p>
        </div>
      </div>
      <div class="domain-grid">
        ${Object.values(domainCounts)
          .map(
            (domain) => `
          <article class="card domain-card">
            <h3>${escapeHtml(domain.domainEn)}</h3>
            <small>${escapeHtml(domain.domain)}</small>
            <div class="split"><span>연결됨<br><b>${escapeHtml(domain.linked)}</b></span><span>전체 스킬<br><b>${escapeHtml(domain.total)}</b></span></div>
          </article>`,
          )
          .join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Highest Volume</p>
          <h2>평가 인원이 많은 직무역량 Top 12</h2>
          <p>인원 규모가 큰 역량부터 스킬맵 연결을 검토하면, 교육/육성 설계의 체감 효과가 큽니다.</p>
        </div>
      </div>
      <div class="top-list">
        ${topRows
          .map(
            (row) => `
          <article class="top-item">
            <strong>${escapeHtml(row.minor)}</strong>
            <span>${escapeHtml(row.collegeNameKo)} · ${escapeHtml(row.count)}명 · 평균 ${escapeHtml(row.averageScore.toFixed(2))}</span>
          </article>`,
          )
          .join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Mapping Table</p>
          <h2>직무역량 → 프로젝트 스킬 후보표</h2>
          <p>검색어, 전문영역, 신뢰도로 필터링할 수 있습니다. low 항목은 현재 스킬맵에 직접 대응 스킬이 부족하다는 신호로 보면 됩니다.</p>
        </div>
      </div>
      <div class="filters">
        <label>검색
          <input id="search" placeholder="직무역량, 스킬 ID, 스킬명 검색" />
        </label>
        <label>전문영역
          <select id="college">
            <option value="all">전체</option>
            ${competencyDataset.colleges
              .map(
                (college) =>
                  `<option value="${escapeHtml(college.id)}">${escapeHtml(college.nameKo)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>신뢰도
          <select id="confidence">
            <option value="all">전체</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>직무역량 소분류</th>
              <th>전문영역</th>
              <th>인원</th>
              <th>평균</th>
              <th>신뢰도</th>
              <th>프로젝트 스킬 후보</th>
              <th>매핑 근거</th>
            </tr>
          </thead>
          <tbody id="mapping-body">${htmlRows}</tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    이 HTML은 정적 분석 산출물입니다. 원천 평가는 ${escapeHtml(competencyDataset.source.title)} /
    ${escapeHtml(competencyDataset.source.sheetName)} 기준이며, 스킬 후보는 현재 저장소의
    public/data/robot-smartfactory.json 기준입니다. low 신뢰도 항목은 스킬맵 보강 후보로 검토하는 것이 좋습니다.
  </footer>

  <script>
    const search = document.getElementById("search");
    const college = document.getElementById("college");
    const confidence = document.getElementById("confidence");
    const rows = [...document.querySelectorAll("#mapping-body tr")];

    function applyFilters() {
      const q = search.value.trim().toLowerCase();
      const selectedCollege = college.value;
      const selectedConfidence = confidence.value;

      for (const row of rows) {
        const matchesQuery = !q || row.innerText.toLowerCase().includes(q);
        const matchesCollege = selectedCollege === "all" || row.dataset.college === selectedCollege;
        const matchesConfidence = selectedConfidence === "all" || row.dataset.confidence === selectedConfidence;
        row.style.display = matchesQuery && matchesCollege && matchesConfidence ? "" : "none";
      }
    }

    search.addEventListener("input", applyFilters);
    college.addEventListener("change", applyFilters);
    confidence.addEventListener("change", applyFilters);
  </script>
</body>
</html>`;

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");
  console.log(outputPath);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  competencyDataset,
  robotSkills,
  mappedRows,
  mappedSkillIds,
  byCollege,
  domainCounts,
};
