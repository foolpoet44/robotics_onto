import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CollegeId } from "./college-types";

export interface Evaluator {
  id: string;
  name: string;
  department: string;
  collegeId: CollegeId;
  active: boolean;
  codeHash: string;
}

export interface EvaluatorRoster {
  version: string;
  note?: string;
  evaluators: Evaluator[];
}

/** 평가자 명부에서 클라이언트로 노출해도 되는 공개 신원 정보(코드 해시 제외). */
export interface EvaluatorPublic {
  id: string;
  name: string;
  department: string;
  collegeId: CollegeId;
}

export function toPublicEvaluator(evaluator: Evaluator): EvaluatorPublic {
  return {
    id: evaluator.id,
    name: evaluator.name,
    department: evaluator.department,
    collegeId: evaluator.collegeId,
  };
}

let cachedRoster: EvaluatorRoster | null = null;

async function loadRoster(): Promise<EvaluatorRoster> {
  if (cachedRoster) {
    return cachedRoster;
  }
  const filePath = path.join(process.cwd(), "public", "data", "evaluators.json");
  const content = await readFile(filePath, "utf-8");
  cachedRoster = JSON.parse(content) as EvaluatorRoster;
  return cachedRoster;
}

export async function getActiveEvaluators(): Promise<Evaluator[]> {
  const roster = await loadRoster();
  return roster.evaluators.filter((evaluator) => evaluator.active);
}

export async function getEvaluatorById(
  evaluatorId: string,
): Promise<Evaluator | null> {
  const roster = await loadRoster();
  return (
    roster.evaluators.find((evaluator) => evaluator.id === evaluatorId) ?? null
  );
}

function hashAccessCode(evaluatorId: string, code: string): string {
  return createHash("sha256").update(`${evaluatorId}:${code}`).digest("hex");
}

/** 평가자 ID와 접속 코드를 검증하고, 통과하면 평가자 레코드를 반환한다. */
export async function verifyEvaluatorCredentials(
  evaluatorId: string,
  code: string,
): Promise<Evaluator | null> {
  const evaluator = await getEvaluatorById(evaluatorId);
  if (!evaluator || !evaluator.active) {
    return null;
  }
  const candidateHash = hashAccessCode(evaluatorId, code);
  return candidateHash === evaluator.codeHash ? evaluator : null;
}
