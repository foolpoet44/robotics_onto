import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollegeId } from "./college-types";

// PA 검증 클러스터에 대한 전문가 판정. skill_evaluation_labels와 분리된
// 별도 장부라 스튜어드 시그널 수집을 오염시키지 않는다. append-only이며
// 집계 시 (평가자, 클러스터)별 최신 판정만 취한다.
export const CLUSTER_VERDICTS = [
  "merge_ok",
  "keep_split",
  "restructure",
] as const;
export type ClusterVerdict = (typeof CLUSTER_VERDICTS)[number];

export const CLUSTER_VERDICT_LABELS: Record<ClusterVerdict, string> = {
  merge_ok: "통합 적절",
  keep_split: "분리 유지",
  restructure: "재구성 필요",
};

export function isClusterVerdict(value: unknown): value is ClusterVerdict {
  return (
    typeof value === "string" &&
    (CLUSTER_VERDICTS as readonly string[]).includes(value)
  );
}

export interface ClusterReviewLabel {
  id: string;
  clusterId: string;
  collegeId: CollegeId;
  verdict: ClusterVerdict;
  notes: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  createdAt: string;
  appVersion: string;
}

export interface NewClusterReviewLabel {
  clusterId: string;
  collegeId: CollegeId;
  verdict: ClusterVerdict;
  notes: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
}

const APP_VERSION = "2026-07-20";

export interface ClusterReviewStore {
  list(clusterId?: string): Promise<ClusterReviewLabel[]>;
  create(input: NewClusterReviewLabel): Promise<ClusterReviewLabel>;
}

function buildRecord(input: NewClusterReviewLabel): ClusterReviewLabel {
  return {
    id: randomUUID(),
    clusterId: input.clusterId,
    collegeId: input.collegeId,
    verdict: input.verdict,
    notes: input.notes,
    evaluatorId: input.evaluatorId,
    evaluatorName: input.evaluatorName,
    evaluatorCollege: input.evaluatorCollege,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

class PostgresClusterReviewStore implements ClusterReviewStore {
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
          CREATE TABLE IF NOT EXISTS cluster_review_labels (
            id UUID PRIMARY KEY,
            cluster_id TEXT NOT NULL,
            college_id TEXT NOT NULL,
            verdict TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            evaluator_id TEXT NOT NULL,
            evaluator_name TEXT NOT NULL,
            evaluator_college TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            app_version TEXT NOT NULL
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_cluster_review_cluster
          ON cluster_review_labels (cluster_id);
        `;
      })();
    }
    return this.ready;
  }

  async list(clusterId?: string): Promise<ClusterReviewLabel[]> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const result = clusterId
      ? await sql`
          SELECT * FROM cluster_review_labels
          WHERE cluster_id = ${clusterId}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM cluster_review_labels
          ORDER BY created_at DESC;
        `;
    return result.rows.map((row) => ({
      id: row.id as string,
      clusterId: row.cluster_id as string,
      collegeId: row.college_id as CollegeId,
      verdict: row.verdict as ClusterVerdict,
      notes: (row.notes as string) ?? "",
      evaluatorId: row.evaluator_id as string,
      evaluatorName: row.evaluator_name as string,
      evaluatorCollege: row.evaluator_college as CollegeId,
      createdAt: new Date(row.created_at as string).toISOString(),
      appVersion: row.app_version as string,
    }));
  }

  async create(input: NewClusterReviewLabel): Promise<ClusterReviewLabel> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const record = buildRecord(input);
    await sql`
      INSERT INTO cluster_review_labels (
        id, cluster_id, college_id, verdict, notes,
        evaluator_id, evaluator_name, evaluator_college, created_at, app_version
      ) VALUES (
        ${record.id}, ${record.clusterId}, ${record.collegeId},
        ${record.verdict}, ${record.notes}, ${record.evaluatorId},
        ${record.evaluatorName}, ${record.evaluatorCollege},
        ${record.createdAt}, ${record.appVersion}
      );
    `;
    return record;
  }
}

class FileClusterReviewStore implements ClusterReviewStore {
  private filePath: string;

  constructor() {
    const dir = process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
    this.filePath = path.join(dir, "cluster-reviews.json");
  }

  private async readAll(): Promise<ClusterReviewLabel[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as ClusterReviewLabel[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: ClusterReviewLabel[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async list(clusterId?: string): Promise<ClusterReviewLabel[]> {
    const records = await this.readAll();
    const filtered = clusterId
      ? records.filter((record) => record.clusterId === clusterId)
      : records;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: NewClusterReviewLabel): Promise<ClusterReviewLabel> {
    const records = await this.readAll();
    const record = buildRecord(input);
    records.push(record);
    await this.writeAll(records);
    return record;
  }
}

let store: ClusterReviewStore | null = null;

export function getClusterReviewStore(): ClusterReviewStore {
  if (store) {
    return store;
  }
  store = process.env.POSTGRES_URL
    ? new PostgresClusterReviewStore()
    : new FileClusterReviewStore();
  return store;
}
