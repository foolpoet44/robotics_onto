#!/usr/bin/env node
// 검증 클러스터 평가(cluster_review_labels) 집계 리포트.
// (평가자, 클러스터)별 최신 판정만 취해 클러스터별 판정 분포를 출력한다.
// POSTGRES_URL 설정 시 DB, 미설정 시 .data/cluster-reviews.json 폴백 —
// 평가 장부는 읽기 전용으로만 접근한다.
const fs = require("fs");
const path = require("path");

const VERDICT_LABELS = {
  merge_ok: "통합 적절",
  keep_split: "분리 유지",
  restructure: "재구성 필요",
};

async function loadLabels() {
  if (process.env.POSTGRES_URL) {
    const { sql } = require("@vercel/postgres");
    const result = await sql`
      SELECT cluster_id, verdict, notes, evaluator_id, evaluator_name, created_at
      FROM cluster_review_labels
      ORDER BY created_at ASC;
    `;
    return result.rows.map((row) => ({
      clusterId: row.cluster_id,
      verdict: row.verdict,
      notes: row.notes ?? "",
      evaluatorId: row.evaluator_id,
      evaluatorName: row.evaluator_name,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }
  const dataDir =
    process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
  const filePath = path.join(dataDir, "cluster-reviews.json");
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Array.isArray(parsed) ? parsed : [];
}

async function main() {
  const subcategoryData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../public/data/college-subcategories.json"),
      "utf-8",
    ),
  );
  const clusters = subcategoryData.skillClusters ?? [];
  const subcategoryNames = new Map(
    subcategoryData.subcategories.map((item) => [item.id, item.name]),
  );
  const labels = await loadLabels();

  // (평가자, 클러스터)별 최신 판정만 취한다(append-only 장부의 latest-wins).
  const latest = new Map();
  for (const label of [...labels].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    latest.set(`${label.evaluatorId}:${label.clusterId}`, label);
  }

  const byCluster = new Map();
  for (const label of latest.values()) {
    if (!byCluster.has(label.clusterId)) {
      byCluster.set(label.clusterId, []);
    }
    byCluster.get(label.clusterId).push(label);
  }

  const rows = clusters.map((cluster) => {
    const verdicts = byCluster.get(cluster.id) ?? [];
    const counts = { merge_ok: 0, keep_split: 0, restructure: 0 };
    for (const label of verdicts) {
      if (counts[label.verdict] !== undefined) {
        counts[label.verdict] += 1;
      }
    }
    return {
      클러스터: cluster.id,
      이름: cluster.name,
      중간분류:
        subcategoryNames.get(cluster.subcategoryId) ?? cluster.subcategoryId,
      평가자수: verdicts.length,
      "통합 적절": counts.merge_ok,
      "분리 유지": counts.keep_split,
      "재구성 필요": counts.restructure,
    };
  });

  const reviewedClusters = rows.filter((row) => row.평가자수 > 0).length;
  console.log(
    `\n검증 클러스터 평가 집계 — 클러스터 ${clusters.length}개 중 ${reviewedClusters}개 판정됨, ` +
      `원본 라벨 ${labels.length}건(최신 판정 ${latest.size}건)\n`,
  );
  console.table(rows);

  const disputed = rows.filter(
    (row) => row["분리 유지"] + row["재구성 필요"] > 0,
  );
  if (disputed.length > 0) {
    console.log("\n⚠️ 이의 판정(분리 유지/재구성 필요)이 있는 클러스터:");
    for (const row of disputed) {
      console.log(`   - ${row.클러스터} ${row.이름}`);
      for (const label of byCluster.get(row.클러스터) ?? []) {
        if (label.verdict !== "merge_ok") {
          console.log(
            `     · ${label.evaluatorName}: ${VERDICT_LABELS[label.verdict]}` +
              (label.notes ? ` — ${label.notes}` : ""),
          );
        }
      }
    }
  }

  // 집계 결과를 시그널 디렉터리에 남겨 후속(온톨로지 통합) 근거로 쓴다.
  const outDir = path.join(process.cwd(), ".data", "steward");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cluster-review-summary.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalLabels: labels.length,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\n요약 저장: ${outPath}`);
}

main().catch((error) => {
  console.error("집계 실패:", error.message);
  process.exit(1);
});
