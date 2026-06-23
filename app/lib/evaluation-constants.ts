// 클라이언트/서버 양쪽에서 쓰는 순수 상수. node 모듈을 import 하지 않는다.

export const SCORE_LABELS: Record<number, string> = {
  1: "낮음",
  2: "보통 이하",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

export const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

/** 스킬 평가 시 부여할 수 있는 라벨(다중 선택). */
export const EVALUATION_LABELS = [
  "현장필수",
  "교육필요",
  "재정의대상",
  "중복의심",
  "신규제안",
] as const;

export type EvaluationLabel = (typeof EVALUATION_LABELS)[number];

export function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function sanitizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(EVALUATION_LABELS);
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string")),
  ).filter((item) => allowed.has(item));
}
