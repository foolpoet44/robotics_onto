#!/usr/bin/env node
// PA 클러스터 평가(cluster_review_ratings) 집계 리포트.
// (평가자, 클러스터)별 최신 행만 취해 클러스터별 중요도·제외율·라벨 분포를
// 내고, clusterSkillIds 스냅샷으로 스킬 단위 신호를 read-time 펼침한다.
// POSTGRES_URL 설정 시 DB, 미설정 시 .data/cluster-ratings.json 폴백.
// 평가 원본은 읽기 전용으로만 접근한다.
const fs = require("fs");
const path = require("path");

async function loadRatings() {
  if (process.env.POSTGRES_URL) {
    const { sql } = require("@vercel/postgres");
    const result = await sql`
      SELECT cluster_id, college_id, selected, score, labels, cluster_skill_ids,
             evaluator_id, evaluator_name, notes, created_at
      FROM cluster_review_ratings
      ORDER BY created_at ASC;
    `;
    return result.rows.map((row) => ({
      clusterId: row.cluster_id,
      selected: Boolean(row.selected),
      score: row.score === null ? null : Number(row.score),
      labels: row.labels ?? [],
      clusterSkillIds: row.cluster_skill_ids ?? [],
      evaluatorId: row.evaluator_id,
      evaluatorName: row.evaluator_name,
      notes: row.notes ?? "",
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }
  const dataDir =
    process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
  const filePath = path.join(dataDir, "cluster-ratings.json");
  if (!fs.existsSync(filePath)) return [];
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
  const clusters = (subcategoryData.skillClusters ?? []).filter(
    (c) => c.collegeId === "physical-ai",
  );
  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const ratings = await loadRatings();

  // (평가자, 클러스터)별 최신 행만 취한다.
  const latest = new Map();
  for (const r of [...ratings].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    latest.set(`${r.evaluatorId}:${r.clusterId}`, r);
  }

  const byCluster = new Map();
  for (const r of latest.values()) {
    if (!byCluster.has(r.clusterId)) byCluster.set(r.clusterId, []);
    byCluster.get(r.clusterId).push(r);
  }

  const rows = clusters.map((cluster) => {
    const rs = byCluster.get(cluster.id) ?? [];
    const included = rs.filter((r) => r.selected);
    const excluded = rs.filter((r) => !r.selected);
    const scores = included.map((r) => r.score).filter((s) => s != null);
    const avg = scores.length
      ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)
      : "-";
    return {
      클러스터: cluster.id,
      이름: cluster.name,
      평가자수: rs.length,
      포함: included.length,
      제외: excluded.length,
      "평균 중요도": avg,
    };
  });

  const reviewed = rows.filter((r) => r.평가자수 > 0).length;
  console.log(
    `\n클러스터 평가 집계 — PA 클러스터 ${clusters.length}개 중 ${reviewed}개 평가됨, ` +
      `원본 ${ratings.length}건(최신 ${latest.size}건)\n`,
  );
  console.table(rows);

  // 제외 신호
  const excludedClusters = rows.filter((r) => r.제외 > 0);
  if (excludedClusters.length) {
    console.log("\n⚠️ 필요 역량에서 제외 판정된 클러스터:");
    for (const r of excludedClusters) {
      const names = (byCluster.get(r.클러스터) ?? [])
        .filter((x) => !x.selected)
        .map((x) => x.evaluatorName);
      console.log(`   - ${r.클러스터} ${r.이름} (제외: ${names.join(", ")})`);
    }
  }

  // read-time 스킬 환원: 각 클러스터의 최신 평가를 clusterSkillIds로 펼쳐
  // 스킬별 신호(중요도 평균·제외 여부)를 계산한다.
  const skillSignal = new Map();
  for (const r of latest.values()) {
    const cluster = clusterById.get(r.clusterId);
    const skillIds = r.clusterSkillIds?.length
      ? r.clusterSkillIds
      : (cluster?.skillIds ?? []);
    for (const skillId of skillIds) {
      if (!skillSignal.has(skillId)) {
        skillSignal.set(skillId, { scores: [], excludedBy: 0, includedBy: 0 });
      }
      const sig = skillSignal.get(skillId);
      if (r.selected) {
        sig.includedBy += 1;
        if (r.score != null) sig.scores.push(r.score);
      } else {
        sig.excludedBy += 1;
      }
    }
  }

  // 요약 저장(후속 커리큘럼 필요역량 결정 근거)
  const outDir = path.join(process.cwd(), ".data", "steward");
  fs.mkdirSync(outDir, { recursive: true });
  const skillRows = [...skillSignal.entries()].map(([skillId, s]) => ({
    skillId,
    avgImportance: s.scores.length
      ? +(s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(2)
      : null,
    includedBy: s.includedBy,
    excludedBy: s.excludedBy,
  }));
  const outPath = path.join(outDir, "cluster-rating-summary.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { totalRatings: ratings.length, clusters: rows, skills: skillRows },
      null,
      2,
    ) + "\n",
  );
  console.log(`\n스킬 환원 신호 ${skillRows.length}건 · 요약 저장: ${outPath}`);
}

main().catch((error) => {
  console.error("집계 실패:", error.message);
  process.exit(1);
});
