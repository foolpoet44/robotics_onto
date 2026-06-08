#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { buildReviewQueue } = require("./lib/review-queue");

const dataDir = path.join(__dirname, "../public/data");
const ontologySkills = JSON.parse(
  fs.readFileSync(path.join(dataDir, "robot-smartfactory.json"), "utf-8"),
);
const organizations = fs
  .readdirSync(path.join(dataDir, "organizations"))
  .filter((file) => file.endsWith(".json"))
  .map((file) =>
    JSON.parse(
      fs.readFileSync(path.join(dataDir, "organizations", file), "utf-8"),
    ),
  );
const reviewDecisions = JSON.parse(
  fs.readFileSync(path.join(dataDir, "review-decisions.json"), "utf-8"),
);
const queue = buildReviewQueue(ontologySkills, organizations, reviewDecisions);
const outputPath = path.join(dataDir, "review-queue.json");

fs.writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`, "utf-8");
console.log(
  `리뷰 큐 생성 완료: ${queue.stats.total}개 ` +
    `(조직 매핑 ${queue.stats.organizationMappings}, 관계 ${queue.stats.ontologyRelations})`,
);
