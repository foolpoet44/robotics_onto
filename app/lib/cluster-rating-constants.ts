// 클라이언트/서버 양쪽에서 쓰는 순수 상수·타입. node 모듈을 import 하지 않는다.
import type { CollegeId } from "./college-types";

/** 클러스터 평가 시 부여할 수 있는 라벨(개별 스킬 평가와 동일 체계). */
export const CLUSTER_LABELS = [
  "현장필수",
  "교육필요",
  "재정의대상",
  "중복의심",
  "신규제안",
] as const;
export type ClusterLabel = (typeof CLUSTER_LABELS)[number];

export function isValidClusterScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function sanitizeClusterLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(CLUSTER_LABELS);
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string")),
  ).filter((item) => allowed.has(item));
}

export interface ClusterReviewRating {
  id: string;
  clusterId: string;
  collegeId: CollegeId;
  selected: boolean;
  score: number | null;
  labels: string[];
  clusterSkillIds: string[];
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  notes: string;
  createdAt: string;
  appVersion: string;
}

export interface NewClusterReviewRating {
  clusterId: string;
  collegeId: CollegeId;
  selected: boolean;
  score: number | null;
  labels: string[];
  clusterSkillIds: string[];
  evaluatorId: string;
  evaluatorName: string;
  evaluatorCollege: CollegeId;
  notes: string;
}
