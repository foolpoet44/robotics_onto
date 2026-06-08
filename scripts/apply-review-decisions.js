#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  applyApprovedDecisions,
  validateReviewDecisions,
} = require("./lib/review-decisions");

const dataDir = path.join(__dirname, "../public/data");
const ontologyPath = path.join(dataDir, "robot-smartfactory.json");
const queuePath = path.join(dataDir, "review-queue.json");
const decisionsPath = path.join(dataDir, "review-decisions.json");
const organizationsDir = path.join(dataDir, "organizations");
const organizationFiles = fs
  .readdirSync(organizationsDir)
  .filter((file) => file.endsWith(".json"));
const ontologySkills = JSON.parse(fs.readFileSync(ontologyPath, "utf-8"));
const queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, "utf-8"));
const organizations = organizationFiles.map((file) =>
  JSON.parse(fs.readFileSync(path.join(organizationsDir, file), "utf-8")),
);
const validation = validateReviewDecisions(queue, decisions);

if (!validation.valid) {
  validation.errors.forEach((error) => console.error(`❌ ${error}`));
  process.exit(1);
}

const result = applyApprovedDecisions(
  ontologySkills,
  organizations,
  queue,
  decisions,
);
fs.writeFileSync(
  ontologyPath,
  `${JSON.stringify(ontologySkills, null, 2)}\n`,
  "utf-8",
);
organizationFiles.forEach((file, index) => {
  fs.writeFileSync(
    path.join(organizationsDir, file),
    `${JSON.stringify(organizations[index], null, 2)}\n`,
    "utf-8",
  );
});

execFileSync(process.execPath, [path.join(__dirname, "generate-robot-smartfactory-raw.js")], {
  stdio: "inherit",
});
execFileSync(process.execPath, [path.join(__dirname, "generate-review-queue.js")], {
  stdio: "inherit",
});

console.log(
  `승인 반영 완료: 관계 ${result.metrics.relationsPromoted}개, ` +
    `조직 매핑 ${result.metrics.organizationMappingsPromoted}개 승격`,
);
