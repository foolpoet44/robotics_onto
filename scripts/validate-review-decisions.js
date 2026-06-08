#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { validateReviewDecisions } = require("./lib/review-decisions");

const dataDir = path.join(__dirname, "../public/data");
const queue = JSON.parse(
  fs.readFileSync(path.join(dataDir, "review-queue.json"), "utf-8"),
);
const decisions = JSON.parse(
  fs.readFileSync(path.join(dataDir, "review-decisions.json"), "utf-8"),
);
const result = validateReviewDecisions(queue, decisions);

if (!result.valid) {
  result.errors.forEach((error) => console.error(`❌ ${error}`));
  process.exit(1);
}

console.log(`리뷰 결정 검증 완료: ${decisions.decisions.length}개`);
