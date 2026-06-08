#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { updateDevelopmentCandidate } = require("./lib/development-candidate-update");
const { validateDevelopmentData } = require("./lib/development-validation");

const dataDir = path.join(__dirname, "../public/data");
const candidatePath = path.join(
  dataDir,
  "development-candidates/sample-candidates.json",
);
const options = parseArguments(process.argv.slice(2));

try {
  const candidates = readJson(candidatePath);
  const updatedCandidates = updateDevelopmentCandidate(candidates, options);
  const track = readJson(
    path.join(dataDir, "development-tracks/smartfactory-tech-leader.json"),
  );
  const ontologySkills = readJson(path.join(dataDir, "robot-smartfactory.json"));
  const validation = validateDevelopmentData(
    track,
    updatedCandidates,
    ontologySkills,
    [
      "industrial-robot-control",
      "machine-vision-sensor",
      "collaborative-robot",
      "autonomous-mobile-robot",
      "robot-maintenance-diagnostics",
      "digital-twin-simulation",
    ],
  );
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }
  fs.writeFileSync(candidatePath, `${JSON.stringify(updatedCandidates, null, 2)}\n`);
  console.log(`육성 기록 갱신 완료: ${options.candidateId}`);
} catch (error) {
  console.error(`육성 기록 갱신 실패: ${error.message}`);
  process.exit(1);
}

function parseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`인자 형식을 확인해 주세요: ${key ?? ""}`);
    }
    values[key.slice(2)] = value;
  }
  if (!values["candidate-id"]) {
    throw new Error("--candidate-id가 필요합니다.");
  }
  return {
    candidateId: values["candidate-id"],
    stageId: values.stage,
    stageStatus: values.status,
    reviewer: values.reviewer,
    notes: values.notes,
    axisId: values.axis,
    axisScore: values.score === undefined ? undefined : Number(values.score),
    impactStatus: values["impact-status"],
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
