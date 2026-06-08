#!/usr/bin/env node

const { readFile, writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");

const inputPath = process.argv[2];
const outputPath =
  process.argv[3] ??
  path.join("public", "data", "employee-competency-assessments.json");

if (!inputPath) {
  console.error(
    "사용법: node scripts/import-employee-competency.js <csv-path> [output-json-path]",
  );
  process.exit(1);
}

const COLLEGES = [
  {
    id: "physical-ai",
    name: "Physical AI & Robotics",
    nameKo: "피지컬 AI/로보틱스",
    order: 1,
  },
  {
    id: "agentic-ai",
    name: "Agentic AI Manufacturing",
    nameKo: "에이전틱 AI 제조",
    order: 2,
  },
  {
    id: "digital-twin",
    name: "Digital Twin & Simulation",
    nameKo: "디지털 트윈/시뮬레이션",
    order: 3,
  },
  {
    id: "data-intelligence",
    name: "Data Intelligence HUB",
    nameKo: "데이터 인텔리전스 허브",
    order: 4,
  },
];

const COLLEGE_BY_ID = Object.fromEntries(COLLEGES.map((college) => [college.id, college]));

const KEYWORD_RULES = [
  {
    collegeId: "digital-twin",
    keywords: ["시뮬레이션", "해석", "소음/진동", "공장운영시나리오", "레이아웃"],
  },
  {
    collegeId: "data-intelligence",
    keywords: [
      "데이터",
      "AI비젼",
      "Vision",
      "생산운영시스템설계 (IT)",
      "응용SW",
      "시스템프로그래밍",
      "아키텍쳐",
      "고속신호",
      "신호",
    ],
  },
  {
    collegeId: "physical-ai",
    keywords: [
      "로봇",
      "로보틱스",
      "PLC",
      "PC제어",
      "기구",
      "센서회로",
      "전력제어",
      "광기구",
      "광학",
      "회로",
    ],
  },
  {
    collegeId: "agentic-ai",
    keywords: [
      "수리최적화",
      "휴리스틱",
      "제어알고리즘",
      "시스템 모델링",
      "생산계획",
      "스케쥴링",
      "Lean",
      "B2B",
      "전략",
      "생산방식",
    ],
  },
];

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      field = "";
      row = [];
      continue;
    }

    field += char;
  }

  if (field || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(header) {
  return header.trim().replace(/^\uFEFF/, "");
}

function toRecord(headers, values) {
  return Object.fromEntries(
    headers.map((header, index) => [normalizeHeader(header), values[index]?.trim() ?? ""]),
  );
}

function resolveCollege(row) {
  const searchable = [
    row["직무"],
    row["기술역량 대분류"],
    row["기술역량 중분류"],
    row["기술역량 소분류"],
  ].join(" ");

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => searchable.includes(keyword))) {
      return rule.collegeId;
    }
  }

  return "agentic-ai";
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function makeEmptyCollegeSummary(collegeId) {
  return {
    collegeId,
    collegeName: COLLEGE_BY_ID[collegeId].name,
    collegeNameKo: COLLEGE_BY_ID[collegeId].nameKo,
    count: 0,
    coreCount: 0,
    averageScore: 0,
    maxScore: 0,
  };
}

function summarizeItems(items) {
  const byCollege = Object.fromEntries(
    COLLEGES.map((college) => [college.id, makeEmptyCollegeSummary(college.id)]),
  );

  for (const item of items) {
    const summary = byCollege[item.collegeId];
    summary.count += 1;
    summary.coreCount += item.isCore ? 1 : 0;
    summary.averageScore += item.score;
    summary.maxScore = Math.max(summary.maxScore, item.score);
  }

  for (const summary of Object.values(byCollege)) {
    summary.averageScore =
      summary.count > 0 ? round(summary.averageScore / summary.count) : 0;
  }

  return byCollege;
}

function pickPrimaryCollege(byCollege) {
  return [...Object.values(byCollege)]
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return COLLEGE_BY_ID[a.collegeId].order - COLLEGE_BY_ID[b.collegeId].order;
    })[0].collegeId;
}

function buildDataset(records) {
  const employees = new Map();

  records.forEach((row, index) => {
    const employeeId = row["사번"];
    const score = Number(row["최종점수"]);

    if (!employeeId || Number.isNaN(score)) {
      throw new Error(`${index + 2}행의 사번 또는 최종점수가 유효하지 않습니다.`);
    }

    if (!employees.has(employeeId)) {
      employees.set(employeeId, {
        employeeId,
        name: row["성명"],
        headquarters: row["본부/법인"],
        division: row["사업부/담당"],
        team: row["팀"],
        position: row["직위"],
        job: row["직무"],
        competencies: [],
      });
    }

    const employee = employees.get(employeeId);
    const collegeId = resolveCollege(row);

    employee.competencies.push({
      year: Number(row["년도"]),
      roundName: row["차수명"],
      majorCategory: row["기술역량 대분류"],
      middleCategory: row["기술역량 중분류"],
      minorCategory: row["기술역량 소분류"],
      isCore: row["핵심역량 여부"] === "Y",
      score,
      collegeId,
      collegeName: COLLEGE_BY_ID[collegeId].name,
      collegeNameKo: COLLEGE_BY_ID[collegeId].nameKo,
    });
  });

  const employeeList = [...employees.values()].map((employee) => {
    const byCollege = summarizeItems(employee.competencies);
    const totalScore = employee.competencies.reduce(
      (sum, item) => sum + item.score,
      0,
    );
    const maxScore = Math.max(...employee.competencies.map((item) => item.score));
    const primaryCollegeId = pickPrimaryCollege(byCollege);

    return {
      ...employee,
      competencyCount: employee.competencies.length,
      coreCompetencyCount: employee.competencies.filter((item) => item.isCore)
        .length,
      averageScore: round(totalScore / employee.competencies.length),
      maxScore,
      primaryCollegeId,
      primaryCollegeName: COLLEGE_BY_ID[primaryCollegeId].name,
      primaryCollegeNameKo: COLLEGE_BY_ID[primaryCollegeId].nameKo,
      byCollege,
      competencies: employee.competencies.sort((a, b) => b.score - a.score),
    };
  });

  employeeList.sort((a, b) => {
    if (b.averageScore !== a.averageScore) {
      return b.averageScore - a.averageScore;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  const allItems = employeeList.flatMap((employee) => employee.competencies);
  const organizationSummary = summarizeItems(allItems);
  const teams = [...new Set(employeeList.map((employee) => employee.team))].sort(
    (a, b) => a.localeCompare(b, "ko"),
  );

  return {
    source: {
      title: "직무역량평가_2026",
      spreadsheetId: "1cgmUlwGOeB2WmB45pCKkxusz48SLqOm-3obz579hSuM",
      sheetName: "시트1",
      importedAt: new Date().toISOString(),
      rowCount: records.length,
    },
    assessment: {
      year: Number(records[0]["년도"]),
      roundName: records[0]["차수명"],
    },
    colleges: COLLEGES,
    summary: {
      employeeCount: employeeList.length,
      competencyCount: allItems.length,
      coreCompetencyCount: allItems.filter((item) => item.isCore).length,
      averageScore: round(
        allItems.reduce((sum, item) => sum + item.score, 0) / allItems.length,
      ),
      byCollege: organizationSummary,
      teams,
    },
    employees: employeeList,
  };
}

async function main() {
  const csvText = await readFile(inputPath, "utf-8");
  const rows = parseCsv(csvText);
  const [headers, ...values] = rows;
  const records = values.map((row) => toRecord(headers, row));
  const dataset = buildDataset(records);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf-8");

  console.log(
    `${dataset.summary.employeeCount}명 / ${dataset.summary.competencyCount}개 역량을 ${outputPath}에 반영했습니다.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
