#!/usr/bin/env node

const { readFileSync } = require("node:fs");
const path = require("node:path");

const datasetPath = path.join(
  process.cwd(),
  "public",
  "data",
  "employee-competency-assessments.json",
);
const dataset = JSON.parse(readFileSync(datasetPath, "utf-8"));

const expectedCollegeIds = new Set([
  "physical-ai",
  "agentic-ai",
  "digital-twin",
  "data-intelligence",
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(dataset.source?.spreadsheetId, "원본 스프레드시트 ID가 없습니다.");
assert(dataset.assessment?.year === 2025, "평가 연도가 예상과 다릅니다.");
assert(Array.isArray(dataset.employees), "employees 배열이 없습니다.");
assert(dataset.employees.length === 273, "개인별 역량 인원 수가 예상과 다릅니다.");
assert(
  dataset.summary.employeeCount === dataset.employees.length,
  "summary.employeeCount와 employees 길이가 다릅니다.",
);

let competencyCount = 0;
for (const employee of dataset.employees) {
  assert(employee.employeeId, "사번이 비어 있는 개인 데이터가 있습니다.");
  assert(employee.name, `${employee.employeeId}의 성명이 비어 있습니다.`);
  assert(
    expectedCollegeIds.has(employee.primaryCollegeId),
    `${employee.employeeId}의 전문영역이 4개 영역 밖에 있습니다.`,
  );
  assert(
    employee.averageScore >= 1 && employee.averageScore <= 4,
    `${employee.employeeId}의 평균 점수가 1~4 범위를 벗어났습니다.`,
  );
  assert(
    Array.isArray(employee.competencies) && employee.competencies.length > 0,
    `${employee.employeeId}의 역량 목록이 비어 있습니다.`,
  );

  for (const item of employee.competencies) {
    competencyCount += 1;
    assert(
      expectedCollegeIds.has(item.collegeId),
      `${employee.employeeId}/${item.minorCategory}의 전문영역이 4개 영역 밖에 있습니다.`,
    );
    assert(
      item.score >= 1 && item.score <= 4,
      `${employee.employeeId}/${item.minorCategory}의 점수가 1~4 범위를 벗어났습니다.`,
    );
  }
}

assert(
  competencyCount === dataset.summary.competencyCount,
  "summary.competencyCount와 실제 역량 수가 다릅니다.",
);

for (const collegeId of expectedCollegeIds) {
  assert(
    dataset.summary.byCollege[collegeId]?.count > 0,
    `${collegeId} 영역에 매핑된 역량이 없습니다.`,
  );
}

console.log(
  `개인별 역량 데이터 검증 완료: ${dataset.summary.employeeCount}명 / ${dataset.summary.competencyCount}개 역량`,
);
