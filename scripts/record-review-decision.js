#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  upsertReviewDecision,
  validateReviewDecisions,
} = require("./lib/review-decisions");

function getArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dataDir = path.join(__dirname, "../public/data");
const queue = JSON.parse(
  fs.readFileSync(path.join(dataDir, "review-queue.json"), "utf-8"),
);
const decisionsPath = path.join(dataDir, "review-decisions.json");
const reviewDecisions = JSON.parse(fs.readFileSync(decisionsPath, "utf-8"));
const decision = {
  item_id: getArgument("item-id"),
  status: getArgument("status"),
  reviewer: getArgument("reviewer"),
  reviewed_at: getArgument("reviewed-at") ?? new Date().toISOString(),
};
const notes = getArgument("notes");
if (notes) decision.notes = notes;

const updated = upsertReviewDecision(reviewDecisions, decision);
const validation = validateReviewDecisions(queue, updated);
if (!validation.valid) {
  validation.errors.forEach((error) => console.error(`❌ ${error}`));
  process.exit(1);
}

fs.writeFileSync(
  decisionsPath,
  `${JSON.stringify(updated, null, 2)}\n`,
  "utf-8",
);
execFileSync(
  process.execPath,
  [path.join(__dirname, "generate-review-queue.js")],
  {
    stdio: "inherit",
  },
);
console.log(`리뷰 결정 기록 완료: ${decision.item_id} -> ${decision.status}`);
