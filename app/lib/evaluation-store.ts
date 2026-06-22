import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollegeId } from "./college-types";

export interface SkillEvaluationLabel {
  id: string;
  skillId: string;
  domain: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  score: number;
  labels: string[];
  notes: string;
  createdAt: string;
  appVersion: string;
}

export interface NewSkillEvaluationLabel {
  skillId: string;
  domain: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  score: number;
  labels: string[];
  notes: string;
}

const APP_VERSION = "2026-06-22";

export interface EvaluationStore {
  list(skillId?: string): Promise<SkillEvaluationLabel[]>;
  create(input: NewSkillEvaluationLabel): Promise<SkillEvaluationLabel>;
}

function buildRecord(input: NewSkillEvaluationLabel): SkillEvaluationLabel {
  return {
    id: randomUUID(),
    skillId: input.skillId,
    domain: input.domain,
    evaluatorId: input.evaluatorId,
    evaluatorName: input.evaluatorName,
    evaluatorCollege: input.evaluatorCollege,
    score: input.score,
    labels: input.labels,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

/**
 * 관리형 Postgres 어댑터. POSTGRES_URL 이 설정된 운영/스테이징에서 사용한다.
 * 첫 호출 시 테이블이 없으면 생성한다.
 */
class PostgresEvaluationStore implements EvaluationStore {
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
          CREATE TABLE IF NOT EXISTS skill_evaluation_labels (
            id UUID PRIMARY KEY,
            skill_id TEXT NOT NULL,
            domain TEXT NOT NULL,
            evaluator_id TEXT NOT NULL,
            evaluator_name TEXT NOT NULL,
            evaluator_college TEXT NOT NULL,
            score SMALLINT NOT NULL,
            labels TEXT[] NOT NULL DEFAULT '{}',
            notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            app_version TEXT NOT NULL
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_skill_eval_skill
          ON skill_evaluation_labels (skill_id);
        `;
      })();
    }
    return this.ready;
  }

  async list(skillId?: string): Promise<SkillEvaluationLabel[]> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const result = skillId
      ? await sql`
          SELECT * FROM skill_evaluation_labels
          WHERE skill_id = ${skillId}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM skill_evaluation_labels
          ORDER BY created_at DESC;
        `;
    return result.rows.map((row) => ({
      id: row.id as string,
      skillId: row.skill_id as string,
      domain: row.domain as string,
      evaluatorId: row.evaluator_id as string,
      evaluatorName: row.evaluator_name as string,
      evaluatorCollege: row.evaluator_college as CollegeId,
      score: Number(row.score),
      labels: (row.labels as string[]) ?? [],
      notes: (row.notes as string) ?? "",
      createdAt: new Date(row.created_at as string).toISOString(),
      appVersion: row.app_version as string,
    }));
  }

  async create(input: NewSkillEvaluationLabel): Promise<SkillEvaluationLabel> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const record = buildRecord(input);
    await sql`
      INSERT INTO skill_evaluation_labels (
        id, skill_id, domain, evaluator_id, evaluator_name,
        evaluator_college, score, labels, notes, created_at, app_version
      ) VALUES (
        ${record.id}, ${record.skillId}, ${record.domain}, ${record.evaluatorId},
        ${record.evaluatorName}, ${record.evaluatorCollege}, ${record.score},
        ${record.labels as unknown as string}, ${record.notes},
        ${record.createdAt}, ${record.appVersion}
      );
    `;
    return record;
  }
}

/**
 * 파일 기반 어댑터. 로컬 개발/이 실행 환경처럼 DB가 없을 때 사용한다.
 * EVAL_DATA_DIR(기본 .data) 아래 JSON 장부에 누적한다.
 */
class FileEvaluationStore implements EvaluationStore {
  private filePath: string;

  constructor() {
    const dir =
      process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
    this.filePath = path.join(dir, "skill-evaluations.json");
  }

  private async readAll(): Promise<SkillEvaluationLabel[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as SkillEvaluationLabel[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: SkillEvaluationLabel[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async list(skillId?: string): Promise<SkillEvaluationLabel[]> {
    const records = await this.readAll();
    const filtered = skillId
      ? records.filter((record) => record.skillId === skillId)
      : records;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: NewSkillEvaluationLabel): Promise<SkillEvaluationLabel> {
    const records = await this.readAll();
    const record = buildRecord(input);
    records.push(record);
    await this.writeAll(records);
    return record;
  }
}

let store: EvaluationStore | null = null;

/**
 * 환경에 맞는 저장소를 반환한다.
 * - POSTGRES_URL 설정 시: 관리형 DB(운영 기본값)
 * - 미설정 시: 파일 장부(로컬/개발 폴백)
 */
export function getEvaluationStore(): EvaluationStore {
  if (store) {
    return store;
  }
  store = process.env.POSTGRES_URL
    ? new PostgresEvaluationStore()
    : new FileEvaluationStore();
  return store;
}

export function isManagedStore(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}
