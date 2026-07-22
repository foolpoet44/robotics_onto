import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollegeId } from "./college-types";
import type {
  ClusterReviewRating,
  NewClusterReviewRating,
} from "./cluster-rating-constants";

// PA 통합 클러스터(college-subcategories.json의 skillClusters)에 대한 평가.
// 개별 스킬 중요도 평가(skill_evaluation_labels)와 분리된 별도 장부라 서로
// 오염되지 않는다. append-only이며, 집계 시 (평가자, 클러스터)별 최신 행만 취한다.
//
// 데이터 매니징 원칙:
//  - selected(필요 역량 포함/제외)를 1급 신호로 저장 — 제외는 "미평가"와 다르다.
//  - clusterSkillIds: 평가 시점의 구성 스냅샷. 클러스터 재편 후에도 "무엇을
//    평가했는지" 재현하고, 스킬 단위 신호는 집계 시점에 read-time으로 펼친다.
//  - clusterId는 스킬 id처럼 불변으로 취급한다(재사용·삭제 금지).
// 순수 상수·타입(CLUSTER_LABELS 등)은 cluster-rating-constants.ts에 분리했다
// (클라이언트 번들이 node 모듈을 끌어오지 않도록).

const APP_VERSION = "2026-07-22";

export interface ClusterRatingStore {
  list(clusterId?: string): Promise<ClusterReviewRating[]>;
  create(input: NewClusterReviewRating): Promise<ClusterReviewRating>;
}

function buildRecord(input: NewClusterReviewRating): ClusterReviewRating {
  return {
    id: randomUUID(),
    clusterId: input.clusterId,
    collegeId: input.collegeId,
    selected: input.selected,
    score: input.score,
    labels: input.labels,
    clusterSkillIds: input.clusterSkillIds,
    evaluatorId: input.evaluatorId,
    evaluatorName: input.evaluatorName,
    evaluatorCollege: input.evaluatorCollege,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

/** 관리형 Postgres 어댑터. POSTGRES_URL 설정 시 사용. */
class PostgresClusterRatingStore implements ClusterRatingStore {
  private ready: Promise<void> | null = null;

  private async getSql() {
    const { sql } = await import("@vercel/postgres");
    return sql;
  }

  private async ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        const sql = await this.getSql();
        await sql`
          CREATE TABLE IF NOT EXISTS cluster_review_ratings (
            id UUID PRIMARY KEY,
            cluster_id TEXT NOT NULL,
            college_id TEXT NOT NULL,
            selected BOOLEAN NOT NULL DEFAULT true,
            score SMALLINT,
            labels TEXT[] NOT NULL DEFAULT '{}',
            cluster_skill_ids TEXT[] NOT NULL DEFAULT '{}',
            evaluator_id TEXT NOT NULL,
            evaluator_name TEXT NOT NULL,
            evaluator_college TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            app_version TEXT NOT NULL
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_cluster_rating_cluster
          ON cluster_review_ratings (cluster_id);
        `;
      })();
    }
    return this.ready;
  }

  async list(clusterId?: string): Promise<ClusterReviewRating[]> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const result = clusterId
      ? await sql`
          SELECT * FROM cluster_review_ratings
          WHERE cluster_id = ${clusterId}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM cluster_review_ratings
          ORDER BY created_at DESC;
        `;
    return result.rows.map((row) => ({
      id: row.id as string,
      clusterId: row.cluster_id as string,
      collegeId: row.college_id as CollegeId,
      selected: Boolean(row.selected),
      score: row.score === null ? null : Number(row.score),
      labels: (row.labels as string[]) ?? [],
      clusterSkillIds: (row.cluster_skill_ids as string[]) ?? [],
      evaluatorId: row.evaluator_id as string,
      evaluatorName: row.evaluator_name as string,
      evaluatorCollege: row.evaluator_college as CollegeId,
      notes: (row.notes as string) ?? "",
      createdAt: new Date(row.created_at as string).toISOString(),
      appVersion: row.app_version as string,
    }));
  }

  async create(input: NewClusterReviewRating): Promise<ClusterReviewRating> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const record = buildRecord(input);
    await sql`
      INSERT INTO cluster_review_ratings (
        id, cluster_id, college_id, selected, score, labels, cluster_skill_ids,
        evaluator_id, evaluator_name, evaluator_college, notes, created_at, app_version
      ) VALUES (
        ${record.id}, ${record.clusterId}, ${record.collegeId}, ${record.selected},
        ${record.score}, ${record.labels as unknown as string},
        ${record.clusterSkillIds as unknown as string}, ${record.evaluatorId},
        ${record.evaluatorName}, ${record.evaluatorCollege}, ${record.notes},
        ${record.createdAt}, ${record.appVersion}
      );
    `;
    return record;
  }
}

/** 파일 폴백. 로컬 개발용(서버리스에선 영속되지 않으므로 운영엔 부적합). */
class FileClusterRatingStore implements ClusterRatingStore {
  private filePath: string;

  constructor() {
    const dir = process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
    this.filePath = path.join(dir, "cluster-ratings.json");
  }

  private async readAll(): Promise<ClusterReviewRating[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as ClusterReviewRating[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: ClusterReviewRating[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async list(clusterId?: string): Promise<ClusterReviewRating[]> {
    const records = await this.readAll();
    const filtered = clusterId
      ? records.filter((record) => record.clusterId === clusterId)
      : records;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: NewClusterReviewRating): Promise<ClusterReviewRating> {
    const records = await this.readAll();
    const record = buildRecord(input);
    records.push(record);
    await this.writeAll(records);
    return record;
  }
}

let store: ClusterRatingStore | null = null;

export function getClusterRatingStore(): ClusterRatingStore {
  if (store) return store;
  store = process.env.POSTGRES_URL
    ? new PostgresClusterRatingStore()
    : new FileClusterRatingStore();
  return store;
}
