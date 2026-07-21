#!/usr/bin/env node
// 4대 도메인 스킬 맵 정적 발행 스크립트.
//
// /domains(허브)와 칼리지 상세(중간분류별 스킬)를 자기완결 HTML 한 장으로
// 발행한다. 로그인·DB 의존이 없어 사내 포털·별도 정적 호스팅 등 어디에나
// 게시할 수 있다.
//
// 사용법: node scripts/generate-domains-html.js [출력경로]
// 기본 출력: public/domains-map.html (배포 사이트에서 /domains-map.html)

const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const robotSkills = require("../public/data/robot-smartfactory.json");
const collegeMapping = require("../public/data/college-mapping.json");
const subcategoryData = require("../public/data/college-subcategories.json");

const outputPath =
  process.argv[2] ?? path.join(__dirname, "../public/domains-map.html");

const COLLEGE_COLORS = {
  "physical-ai": "#4f46e5",
  "agentic-ai": "#0d9488",
  "digital-twin": "#9333ea",
  "data-intelligence": "#0891b2",
};

const TYPE_LABELS = { knowledge: "지식", skill: "기술", competence: "역량" };

const DOMAIN_NAMES = {
  "industrial-robot-control": "산업용 로봇 제어",
  "machine-vision-sensor": "머신비전 & 센서 통합",
  "collaborative-robot": "협동로봇 운용",
  "autonomous-mobile-robot": "자율이동로봇",
  "robot-maintenance-diagnostics": "로봇 유지보수 & 진단",
  "digital-twin-simulation": "디지털트윈 & 시뮬레이션",
  "agentic-ai-manufacturing": "Agentic AI 제조",
};

const domainMapping = collegeMapping.domainMapping;
const skillOverrides = collegeMapping.skillOverrides ?? {};

function collegeOf(skill) {
  const override = skillOverrides[skill.skill_id];
  return override ? override.primary : domainMapping[skill.domain].primary;
}

const colleges = [...collegeMapping.colleges].sort((a, b) => a.order - b.order);

const blocks = colleges.map((college) => {
  const subs = subcategoryData.subcategories
    .filter((subcategory) => subcategory.collegeId === college.id)
    .sort((a, b) => a.order - b.order)
    .map((subcategory) => ({
      ...subcategory,
      skills: robotSkills
        .filter(
          (skill) =>
            subcategoryData.skillSubcategories[skill.skill_id] ===
              subcategory.id && collegeOf(skill) === college.id,
        )
        .sort(
          (a, b) =>
            a.proficiency_level - b.proficiency_level ||
            a.skill_id.localeCompare(b.skill_id),
        ),
    }));
  return {
    college,
    subs,
    skillCount: subs.reduce((sum, sub) => sum + sub.skills.length, 0),
  };
});
const totalSkills = blocks.reduce((sum, block) => sum + block.skillCount, 0);

const esc = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const generatedAt = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>4대 도메인 스킬 맵 — AI Factory Skill Fab</title>
<style>
  :root { --ink:#1e293b; --ink-2:#64748b; --line:#e2e8f0; --bg:#f8fafc; --card:#fff; --accent:#4338ca; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:"Pretendard","Noto Sans KR",system-ui,sans-serif; color:var(--ink); background:var(--bg); line-height:1.55; }
  .wrap { max-width:1120px; margin:0 auto; padding:40px 20px 80px; }
  header.hero { text-align:center; margin-bottom:30px; }
  .eyebrow { color:var(--accent); font-size:12px; font-weight:800; letter-spacing:.14em; margin:0; }
  h1 { margin:8px 0 6px; font-size:clamp(26px,4vw,38px); }
  .hero p { color:var(--ink-2); max-width:720px; margin:0 auto; }

  /* 트리맵 (면적 = 스킬 수) */
  .treemap { display:flex; gap:2px; height:420px; border-radius:12px; overflow:hidden; margin-top:26px; }
  .tcol { display:flex; flex-direction:column; flex-basis:0; min-width:0; gap:2px; }
  .thead { display:flex; justify-content:space-between; gap:6px; padding:8px 10px; color:#fff; font-weight:800; font-size:12.5px; }
  .thead span:last-child { opacity:.9; }
  .tstack { display:flex; flex-direction:column; flex:1; gap:2px; min-height:0; }
  .tile { display:flex; flex-direction:column; justify-content:center; gap:1px; flex-basis:0;
    min-height:30px; padding:4px 10px; border-left:4px solid; overflow:hidden; }
  .tile b { font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tile i { font-style:normal; color:var(--ink-2); font-size:11px; font-weight:800; }

  .thead, .tile { cursor:pointer; border:none; width:100%; text-align:left; font:inherit; }
  .thead:hover, .tile:hover { filter:brightness(.94); }

  /* 도메인 탭 */
  .tabs { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:18px; }
  .tab { border:1.5px solid var(--line); background:var(--card); border-radius:999px;
    padding:7px 16px; font:inherit; font-size:13.5px; font-weight:800; color:var(--ink-2); cursor:pointer; }
  .tab.active { color:#fff; border-color:transparent; }
  .hint { text-align:center; color:var(--ink-2); font-size:12.5px; margin:10px 0 0; }

  .dsec { display:none; }
  .dsec.active { display:block; }
  h2 { margin:34px 0 4px; font-size:21px; border-left:5px solid; padding-left:10px; }
  h2 small { color:var(--ink-2); font-weight:600; font-size:13.5px; margin-left:8px; }
  details.sub { margin:14px 0 0; background:var(--card); border:1px solid var(--line); border-radius:10px; }
  details.sub > summary { cursor:pointer; padding:10px 14px; font-size:14.5px; font-weight:800; list-style:none; display:flex; justify-content:space-between; gap:8px; }
  details.sub > summary::after { content:"▼"; color:var(--ink-2); font-size:11px; }
  details.sub[open] > summary::after { content:"▲"; }
  details.sub > summary small { color:var(--ink-2); font-weight:700; font-size:12px; }
  details.sub table { border:none; border-top:1px solid var(--line); border-radius:0; }
  table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th,td { padding:7px 10px; border-bottom:1px solid var(--line); text-align:left; font-size:13px; }
  th { background:#f1f5f9; font-size:12px; white-space:nowrap; }
  tr:last-child td { border-bottom:none; }
  td.id { white-space:nowrap; color:var(--ink-2); font-size:12px; }
  td.lv { white-space:nowrap; }
  .badge { font-size:10px; font-weight:800; padding:1px 6px; border-radius:999px; background:#fff7ed; color:#9a3412; margin-left:6px; }
  .desc { color:var(--ink-2); font-size:11px; font-weight:400; line-height:1.45; }
  footer { margin-top:48px; color:var(--ink-2); font-size:12px; text-align:center; }
  @media (max-width:720px){ .treemap { height:560px; } }
  @media print { body{background:#fff} .wrap{padding:0} .treemap{height:340px}
    .dsec{display:block} .tabs,.hint{display:none} }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <p class="eyebrow">AI FACTORY SKILL FAB · DOMAIN MAP</p>
    <h1>4대 도메인 스킬 맵</h1>
    <p>AI Factory 운영 체계의 4대 도메인 → 중간분류 → 스킬 ${totalSkills}개 전체 체계.
      면적은 스킬 수에 비례합니다. 발행일 ${generatedAt} · 스킬 온톨로지에서 자동 생성.</p>
  </header>

  <div class="treemap" aria-label="4대 도메인별 스킬 분포 트리맵 (클릭하면 세부 스킬 표시)">
    ${blocks
      .map(({ college, subs, skillCount }) => {
        const color = COLLEGE_COLORS[college.id];
        return `<div class="tcol" style="flex-grow:${skillCount}">
      <button class="thead" data-college="${college.id}" style="background:${color}" type="button">
        <span>${esc(college.name)}</span><span>${skillCount}</span></button>
      <div class="tstack">
        ${subs
          .map(
            (
              sub,
            ) => `<button class="tile" data-college="${college.id}" data-sub="${sub.id}" type="button"
          style="flex-grow:${sub.skills.length};border-left:4px solid ${color};background:color-mix(in srgb, ${color} 14%, #fff)">
          <b>${esc(sub.name)}</b><i>${sub.skills.length}</i></button>`,
          )
          .join("")}
      </div>
    </div>`;
      })
      .join("")}
  </div>

  <div class="tabs">
    ${blocks
      .map(
        ({ college, skillCount }) =>
          `<button class="tab" data-college="${college.id}" data-color="${COLLEGE_COLORS[college.id]}" type="button">${esc(college.name)} · ${skillCount}</button>`,
      )
      .join("")}
  </div>
  <p class="hint">도메인(탭 또는 트리맵)을 클릭하면 세부 스킬이 표시되고, 중간분류 타일을 클릭하면 해당 분류가 바로 펼쳐집니다.</p>

  ${blocks
    .map(
      ({ college, subs, skillCount }) => `
  <section class="dsec" id="sec-${college.id}">
    <h2 style="border-color:${COLLEGE_COLORS[college.id]}">${esc(college.name)}
      <small>${esc(college.role)}${college.isHub && !college.role.includes("허브") ? " · 허브" : ""} · ${skillCount}개 스킬 · 중간분류 ${subs.length}개</small></h2>
    ${subs
      .map(
        (sub) => `
    <details class="sub" id="sub-${sub.id}">
      <summary>${esc(sub.name)} <small>${sub.skills.length}개 스킬</small></summary>
      <table>
        <thead><tr><th>스킬</th><th>ID</th><th>레벨</th><th>유형</th><th>기능 도메인(참고)</th></tr></thead>
        <tbody>
        ${sub.skills
          .map((skill) => {
            const override = skillOverrides[skill.skill_id];
            const badge = override
              ? `<span class="badge">${override.source === "reviewed" ? "재분류 확정" : "재분류 제안"}</span>`
              : "";
            return `<tr>
          <td><strong>${esc(skill.preferred_label_ko)}</strong>${badge}<br><span class="desc">${esc(skill.description_ko ?? "")}</span></td>
          <td class="id">${esc(skill.skill_id)}</td>
          <td class="lv">Lv${skill.proficiency_level}</td>
          <td>${TYPE_LABELS[skill.skill_type] ?? skill.skill_type}</td>
          <td>${esc(DOMAIN_NAMES[skill.domain] ?? skill.domain)}</td>
        </tr>`;
          })
          .join("")}
        </tbody>
      </table>
    </details>`,
      )
      .join("")}
  </section>`,
    )
    .join("")}

  <noscript><style>.dsec{display:block}.tabs,.hint{display:none}</style></noscript>
  <script>
    (function () {
      var tabs = document.querySelectorAll(".tab");
      function select(collegeId, subId) {
        document.querySelectorAll(".dsec").forEach(function (section) {
          section.classList.toggle("active", section.id === "sec-" + collegeId);
        });
        tabs.forEach(function (tab) {
          var active = tab.dataset.college === collegeId;
          tab.classList.toggle("active", active);
          tab.style.background = active ? tab.dataset.color : "";
        });
        if (subId) {
          var sub = document.getElementById("sub-" + subId);
          if (sub) {
            sub.open = true;
            sub.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else {
          var section = document.getElementById("sec-" + collegeId);
          if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      document.querySelectorAll("[data-college]").forEach(function (element) {
        element.addEventListener("click", function () {
          select(element.dataset.college, element.dataset.sub);
        });
      });
      // 초기 상태: 첫 도메인 선택 (스크롤 없이)
      var first = tabs[0];
      if (first) {
        document.getElementById("sec-" + first.dataset.college).classList.add("active");
        first.classList.add("active");
        first.style.background = first.dataset.color;
      }
    })();
  </script>

  <footer>AI Factory Skill Fab · 4대 도메인 스킬 맵 정적 발행본 (${generatedAt}) —
    온톨로지 변경 시 <code>npm run generate:domains-html</code> 로 재발행하십시오.</footer>
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
