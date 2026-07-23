// 스킬 중요도 평가의 저장/집계 공용 로직.
// 테이블(DomainEvaluationMode)·빠른평가 덱(DomainRapidDeck)·매트릭스(DomainPriorityMatrix)가
// 모두 이 모듈을 통해 "같은 localStorage 스키마"에 읽고 쓴다.
// 스킬 상세 페이지(SkillImportanceRating)와도 동일한 키/레코드 형태라 데이터가 양방향 공유된다.
import { COLLEGE_DOMAIN_MAPPING, COLLEGES } from "./college-data";
import type { College, CollegeId } from "./college-types";

export interface ImportanceRating {
  id: string;
  expertName: string;
  expertDomain: CollegeId;
  score: number;
  notes: string;
  createdAt: string;
}

// 이견(divergence) 플래그 기준: 평가자 2명 이상 + 모표준편차 1.2 이상.
// 1.2는 5점 척도에서 "3점과 5점"(σ=1.0)은 통과시키되 "2점과 5점"(σ=1.5)처럼
// 정의가 충돌하는 수준만 경고로 띄우기 위한 현실적 임계값이다.
export const DIVERGENCE_MIN_COUNT = 2;
export const DIVERGENCE_THRESHOLD = 1.2;

export const SCORE_VALUES = [1, 2, 3, 4, 5];

const EXPERT_DOMAIN_ORDER: CollegeId[] = [
  "physical-ai",
  "agentic-ai",
  "digital-twin",
];

export const EXPERT_DOMAINS = EXPERT_DOMAIN_ORDER.map((collegeId) =>
  COLLEGES.find((college) => college.id === collegeId),
).filter((college): college is College => Boolean(college));

export function resolveDefaultExpertDomain(domainKey: string): CollegeId {
  return COLLEGE_DOMAIN_MAPPING[domainKey]?.primary ?? "physical-ai";
}

export function getStorageKey(skillId: string) {
  return `factory-robotics-skillmap:importance-ratings:${skillId}`;
}

export function loadRatings(skillId: string): ImportanceRating[] {
  try {
    const saved = window.localStorage.getItem(getStorageKey(skillId));
    return saved ? (JSON.parse(saved) as ImportanceRating[]) : [];
  } catch {
    return [];
  }
}

export function createRecordId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// 현재 평가자의 점수를 upsert(같은 평가자+영역의 기존 평가는 교체)한 뒤 저장하고,
// 갱신된 배열을 반환한다. 실패 시 null. 클릭마다 새 레코드를 쌓아 중복이 생기는 걸 막는다.
export function upsertMyRating(
  skillId: string,
  existing: ImportanceRating[],
  expertName: string,
  expertDomain: CollegeId,
  score: number,
): ImportanceRating[] | null {
  const trimmedName = expertName.trim();
  if (!trimmedName) return null;
  const withoutMine = existing.filter(
    (r) => !(r.expertName === trimmedName && r.expertDomain === expertDomain),
  );
  const next: ImportanceRating[] = [
    {
      id: createRecordId(),
      expertName: trimmedName,
      expertDomain,
      score,
      notes: "",
      createdAt: new Date().toISOString(),
    },
    ...withoutMine,
  ];
  try {
    window.localStorage.setItem(getStorageKey(skillId), JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

// 현재 평가자의 점수만 제거(전체가 아니라 내 것만)한 뒤 저장. 실패 시 null.
export function clearMyRating(
  skillId: string,
  existing: ImportanceRating[],
  expertName: string,
  expertDomain: CollegeId,
): ImportanceRating[] | null {
  const trimmedName = expertName.trim();
  if (!trimmedName) return existing;
  const next = existing.filter(
    (r) => !(r.expertName === trimmedName && r.expertDomain === expertDomain),
  );
  try {
    window.localStorage.setItem(getStorageKey(skillId), JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function findMyScore(
  ratings: ImportanceRating[],
  expertName: string,
  expertDomain: CollegeId,
): number | null {
  const trimmedName = expertName.trim();
  if (!trimmedName) return null;
  const mine = ratings.find(
    (r) => r.expertName === trimmedName && r.expertDomain === expertDomain,
  );
  return mine ? mine.score : null;
}

export interface RatingSummary {
  count: number;
  average: number | null;
  stddev: number;
}

// 한 스킬의 모든 평가로부터 점추정(평균)과 산포(모표준편차)를 함께 계산한다.
// 평균만 내면 "1점과 5점"이 "3점 두 개"와 똑같이 3.0으로 보이므로, 의사결정에선
// 산포를 반드시 곁들여야 한다 — 이게 이견 신호의 핵심이다.
export function summarize(ratings: ImportanceRating[]): RatingSummary {
  const count = ratings.length;
  if (count === 0) {
    return { count: 0, average: null, stddev: 0 };
  }
  const average = ratings.reduce((sum, r) => sum + r.score, 0) / count;
  const variance =
    ratings.reduce((sum, r) => sum + (r.score - average) ** 2, 0) / count;
  return { count, average, stddev: Math.sqrt(variance) };
}

export function isDivergent(summary: RatingSummary): boolean {
  return (
    summary.count >= DIVERGENCE_MIN_COUNT &&
    summary.stddev >= DIVERGENCE_THRESHOLD
  );
}
