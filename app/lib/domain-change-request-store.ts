import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollegeId } from "./college-types";

// 변경 대상 축: 기능 도메인(스킬의 domain) 또는 3대 도메인(칼리지 배정)
export type DomainChangeAxis = "functional" | "college";

export interface DomainChangeRequest {
  id: string;
  skillId: string;
  axis: DomainChangeAxis;
  currentValue: string;
  requestedValue: string;
  reason: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  status: "pending";
  createdAt: string;
  appVersion: string;
}

export interface NewDomainChangeRequest {
  skillId: string;
  axis: DomainChangeAxis;
  currentValue: string;
  requestedValue: string;
  reason: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
}

const APP_VERSION = "2026-06-22";

export interface DomainChangeRequestStore {
  list(skillId?: string): Promise<DomainChangeRequest[]>;
  create(input: NewDomainChangeRequest): Promise<DomainChangeRequest>;
}

function buildRecord(input: NewDomainChangeRequest): DomainChangeRequest {
  return {
    id: randomUUID(),
    skillId: input.skillId,
    axis: input.axis,
    currentValue: input.currentValue,
    requestedValue: input.requestedValue,
    reason: input.reason,
    evaluatorId: input.evaluatorId,
    evaluatorName: input.evaluatorName,
    evaluatorCollege: input.evaluatorCollege,
    status: "pending",
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

/**
 * 관리형 Postgres 어댑터. POSTGRES_URL 이 설정된 운영/스테이징에서 사용한다.
 */
class PostgresDomainChangeRequestStore implements DomainChangeRequestStore {
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
          CREATE TABLE IF NOT EXISTS domain_change_requests (
            id UUID PRIMARY KEY,
            skill_id TEXT NOT NULL,
            axis TEXT NOT NULL,
            current_value TEXT NOT NULL,
            requested_value TEXT NOT NULL,
            reason TEXT NOT NULL,
            evaluator_id TEXT NOT NULL,
            evaluator_name TEXT NOT NULL,
            evaluator_college TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            app_version TEXT NOT NULL
          );
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_domain_change_skill
          ON domain_change_requests (skill_id);
        `;
      })();
    }
    return this.ready;
  }

  async list(skillId?: string): Promise<DomainChangeRequest[]> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const result = skillId
      ? await sql`
          SELECT * FROM domain_change_requests
          WHERE skill_id = ${skillId}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT * FROM domain_change_requests
          ORDER BY created_at DESC;
        `;
    return result.rows.map((row) => ({
      id: row.id as string,
      skillId: row.skill_id as string,
      axis: row.axis as DomainChangeAxis,
      currentValue: row.current_value as string,
      requestedValue: row.requested_value as string,
      reason: (row.reason as string) ?? "",
      evaluatorId: row.evaluator_id as string,
      evaluatorName: row.evaluator_name as string,
      evaluatorCollege: row.evaluator_college as CollegeId,
      status: "pending",
      createdAt: new Date(row.created_at as string).toISOString(),
      appVersion: row.app_version as string,
    }));
  }

  async create(input: NewDomainChangeRequest): Promise<DomainChangeRequest> {
    await this.ensureSchema();
    const sql = await this.getSql();
    const record = buildRecord(input);
    await sql`
      INSERT INTO domain_change_requests (
        id, skill_id, axis, current_value, requested_value, reason,
        evaluator_id, evaluator_name, evaluator_college, status,
        created_at, app_version
      ) VALUES (
        ${record.id}, ${record.skillId}, ${record.axis},
        ${record.currentValue}, ${record.requestedValue}, ${record.reason},
        ${record.evaluatorId}, ${record.evaluatorName},
        ${record.evaluatorCollege}, ${record.status},
        ${record.createdAt}, ${record.appVersion}
      );
    `;
    return record;
  }
}

/**
 * 파일 기반 어댑터. 로컬 개발/DB 없는 환경 폴백.
 * EVAL_DATA_DIR(기본 .data) 아래 JSON 장부에 누적한다.
 */
class FileDomainChangeRequestStore implements DomainChangeRequestStore {
  private filePath: string;

  constructor() {
    const dir = process.env.EVAL_DATA_DIR ?? path.join(process.cwd(), ".data");
    this.filePath = path.join(dir, "domain-change-requests.json");
  }

  private async readAll(): Promise<DomainChangeRequest[]> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as DomainChangeRequest[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: DomainChangeRequest[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async list(skillId?: string): Promise<DomainChangeRequest[]> {
    const records = await this.readAll();
    const filtered = skillId
      ? records.filter((record) => record.skillId === skillId)
      : records;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: NewDomainChangeRequest): Promise<DomainChangeRequest> {
    const records = await this.readAll();
    const record = buildRecord(input);
    records.push(record);
    await this.writeAll(records);
    return record;
  }
}

let store: DomainChangeRequestStore | null = null;

export function getDomainChangeRequestStore(): DomainChangeRequestStore {
  if (store) {
    return store;
  }
  store = process.env.POSTGRES_URL
    ? new PostgresDomainChangeRequestStore()
    : new FileDomainChangeRequestStore();
  return store;
}
