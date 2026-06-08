#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { validateDevelopmentData } = require("./lib/development-validation");

const dataDir = path.join(__dirname, "../public/data");
const track = readJson("development-tracks/smartfactory-tech-leader.json");
const candidates = readJson("development-candidates/sample-candidates.json");
const ontologySkills = readJson("robot-smartfactory.json");
const domainKeys = [
  "industrial-robot-control",
  "machine-vision-sensor",
  "collaborative-robot",
  "autonomous-mobile-robot",
  "robot-maintenance-diagnostics",
  "digital-twin-simulation",
];
const result = validateDevelopmentData(
  track,
  candidates,
  ontologySkills,
  domainKeys,
);

result.warnings.forEach((warning) => console.warn(`경고: ${warning}`));
if (!result.valid) {
  result.errors.forEach((error) => console.error(`오류: ${error}`));
  process.exit(1);
}

console.log(
  `육성 데이터 검증 통과: 단계 ${result.metrics.stages}, 전문 영역 ${result.metrics.expertAreas}, ` +
    `직능 역량 ${result.metrics.competencyAxes}, 샘플 후보자 ${result.metrics.candidates}`,
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, relativePath), "utf-8"));
}
