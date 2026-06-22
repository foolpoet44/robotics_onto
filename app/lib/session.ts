import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  Evaluator,
  EvaluatorPublic,
  getEvaluatorById,
  toPublicEvaluator,
} from "./evaluator-data";

const COOKIE_NAME = "rsf_evaluator";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8시간

function getSecret(): string {
  return (
    process.env.EVAL_SESSION_SECRET ??
    "dev-only-insecure-secret-change-me-in-production"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/** `evaluatorId.issuedAt.signature` 형태의 서명 토큰을 만든다. */
export function createSessionToken(evaluatorId: string): string {
  const issuedAt = Date.now().toString();
  const payload = `${evaluatorId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

function parseToken(
  token: string,
): { evaluatorId: string; issuedAt: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [evaluatorId, issuedAtRaw, signature] = parts;
  const payload = `${evaluatorId}.${issuedAtRaw}`;
  if (!safeEqual(signature, sign(payload))) {
    return null;
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) {
    return null;
  }
  if (Date.now() - issuedAt > MAX_AGE_SECONDS * 1000) {
    return null;
  }
  return { evaluatorId, issuedAt };
}

export async function setSessionCookie(evaluatorId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(evaluatorId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** 쿠키의 서명 토큰을 검증하고 명부와 대조해 현재 평가자를 반환한다. */
export async function getCurrentEvaluator(): Promise<Evaluator | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const parsed = parseToken(token);
  if (!parsed) {
    return null;
  }
  const evaluator = await getEvaluatorById(parsed.evaluatorId);
  if (!evaluator || !evaluator.active) {
    return null;
  }
  return evaluator;
}

export async function getCurrentEvaluatorPublic(): Promise<EvaluatorPublic | null> {
  const evaluator = await getCurrentEvaluator();
  return evaluator ? toPublicEvaluator(evaluator) : null;
}
