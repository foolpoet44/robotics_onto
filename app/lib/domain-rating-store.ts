import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollegeId } from "./college-types";

// 평가 축: 4대 도메인(메인, 칼리지) 또는 기능 도메인(서브)
export type DomainRatingAxis = "college" | "functional";

export interface DomainImportanceRecord {
  id: string;
  axis: DomainRatingAxis;
  targetKey: string;
  score: number;
  notes: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  createdAt: string;
  appVersion: string;
}

export interface NewDomainImportanceRecord {
  axis: DomainRatingAxis;
  targetKey: string;
  score: number;
  notes: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
}

const APP_VERSION = "2026-06-22";

export interface DomainRatingStore {
  list(axis?: DomainRatingAxis): Promise<DomainImportanceRecord[]>;
  create(input: NewDomainImportanceRecord): Promise<DomainImportanceRecord>;
}

function buildRecord(input: NewDomainImportanceRecord): DomainImportanceRecord {
  return {
    id: randomUUID(),
    axis: input.axis,
    targetKey: input.targetKey,
    score: input.score,
    notes: input.notes,
    evaluatorId: input.evaluatorId,
    evaluatorName: input.evaluatorName,
    evaluatorCollege: input.evaluatorCollege,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

/**
 * 관리형 Postgres 어댑터. POSTGRES_URL 이 설정된 운영/스테이징에서 사용한다.
 */
class PostgresDomainRatingStore implements DomainRatingStore {
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
          CREATE TABLE IF NOT EXISTS domain_importance_ratings (
            id UUID PRIMARY KEY,
            axis TEXT NOT NULL,
            target_key TEXT NOT NULL,
            score SMALLINT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            evaluator_id TEXT NOT NULL,
            evaluator_name TEXT NOT NULL,
            evaluator_college TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            app_version TEXT NOT NULL
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_domain_rating_axis_key
          ON domain_importance_ratings (axis, target_key);
        `;
      })();
    }
    return this.ready;
  }

  async list(axis?: DomainRatingAxis): Promise<DomainImportanceRecord[]> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const result = axis
      ? await sql`
          SELECT * FROM domain_importance_ratings
          WHERE axis = ${axis}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM domain_importance_ratings
          ORDER BY created_at DESC;
        `;
    return result.rows.map((row) => ({
      id: row.id as string,
      axis: row.axis as DomainRatingAxis,
      targetKey: row.target_key as string,
      score: Number(row.score),
      notes: (row.notes as string) ?? "",
      evaluatorId: row.evaluator_id as string,
      evaluatorName: row.evaluator_name as string,
      evaluatorCollege: row.evaluator_college as CollegeId,
      createdAt: new Date(row.created_at as string).toISOString(),
      appVersion: row.app_version as string,
    }));
  }

  async create(
    input: NewDomainImportanceRecord,
  ): Promise<DomainImportanceRecord> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const record = buildRecord(input);
    await sql`
      INSERT INTO domain_importance_ratings (
        id, axis, target_key, score, notes,
        evaluator_id, evaluator_name, evaluator_college,
        created_at, app_version
      ) VALUES (
        ${record.id}, ${record.axis}, ${record.targetKey}, ${record.score},
        ${record.notes}, ${record.evaluatorId}, ${record.evaluatorName},
        ${record.evaluatorCollege}, ${record.createdAt}, ${record.appVersion}
      );
    `;
    return record;
  }
}

/**
 * 파일 기반 어댑터. 로컬 개발/DB 없는 환경 폴백.
 * EVAL_DATA_DIR(기본 .data) 아래 JSON 장부에 누적한다.
 */
class FileDomainRatingStore implements DomainRatingStore {
  private filePath: string;

  constructor() {
    const dir = process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
    this.filePath = path.join(dir, "domain-importance-ratings.json");
  }

  private async readAll(): Promise<DomainImportanceRecord[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as DomainImportanceRecord[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: DomainImportanceRecord[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async list(axis?: DomainRatingAxis): Promise<DomainImportanceRecord[]> {
    const records = await this.readAll();
    const filtered = axis
      ? records.filter((record) => record.axis === axis)
      : records;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(
    input: NewDomainImportanceRecord,
  ): Promise<DomainImportanceRecord> {
    const records = await this.readAll();
    const record = buildRecord(input);
    records.push(record);
    await this.writeAll(records);
    return record;
  }
}

let store: DomainRatingStore | null = null;

export function getDomainRatingStore(): DomainRatingStore {
  if (store) {
    return store;
  }
  store = process.env.POSTGRES_URL
    ? new PostgresDomainRatingStore()
    : new FileDomainRatingStore();
  return store;
}
