"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROBOT_DOMAINS } from "../lib/robotics-data";
import DomainSkillBrowser, {
  type BrowserChangeRequest,
  type BrowserCollege,
  type BrowserSkill,
} from "./DomainSkillBrowser";
import styles from "./DomainImportanceRating.module.css";

export interface CollegeSubcategoryGroup {
  id: string;
  name: string;
  skills: BrowserSkill[];
}

export interface CollegeCardData {
  id: string;
  name: string;
  role: string;
  isHub: boolean;
  skillCount: number;
  composition: { domainKey: string; count: number }[];
  subcategories: CollegeSubcategoryGroup[];
}

export interface DomainRatingView {
  id: string;
  axis: "college" | "functional";
  targetKey: string;
  score: number;
  notes: string;
  evaluatorName: string;
  createdAt: string;
}

interface DomainImportanceRatingProps {
  collegeCards: CollegeCardData[];
  colleges: BrowserCollege[];
  sessionEvaluatorName: string | null;
  initialRatings: DomainRatingView[];
  initialChangeRequests: BrowserChangeRequest[];
}

const SCORE_LABELS: Record<number, string> = {
  1: "낮음",
  2: "보통 이하",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

const SCORE_VALUES = [1, 2, 3, 4, 5];

// 직접 평가와 서브 롤업의 괴리가 이 값 이상이면 근거 확인 배지를 띄운다.
const DELTA_THRESHOLD = 1.0;

const AXIS_LABELS: Record<"college" | "functional", string> = {
  college: "4대 도메인",
  functional: "기능 도메인",
};

export default function DomainImportanceRating({
  collegeCards,
  colleges,
  sessionEvaluatorName,
  initialRatings,
  initialChangeRequests,
}: DomainImportanceRatingProps) {
  const [ratings, setRatings] = useState<DomainRatingView[]>(initialRatings);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const domainNameByKey = useMemo(() => {
    const map: Record<string, string> = {};
    ROBOT_DOMAINS.forEach((domain) => {
      map[domain.key] = domain.name;
    });
    return map;
  }, []);

  const summaries = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    ratings.forEach((rating) => {
      const key = `${rating.axis}:${rating.targetKey}`;
      const entry = map[key] ?? { total: 0, count: 0 };
      entry.total += rating.score;
      entry.count += 1;
      map[key] = entry;
    });
    return map;
  }, [ratings]);

  function averageOf(axis: "college" | "functional", targetKey: string) {
    const entry = summaries[`${axis}:${targetKey}`];
    if (!entry || entry.count === 0) return null;
    return { average: entry.total / entry.count, count: entry.count };
  }

  // 서브 롤업: 칼리지에 배정된 스킬 수를 가중치로 기능 도메인 평가를 합산
  function rollupOf(card: CollegeCardData) {
    let weighted = 0;
    let weightSum = 0;
    card.composition.forEach(({ domainKey, count }) => {
      const avg = averageOf("functional", domainKey);
      if (avg) {
        weighted += avg.average * count;
        weightSum += count;
      }
    });
    if (weightSum === 0) return null;
    return { average: weighted / weightSum };
  }

  async function handleSave(collegeId: string) {
    const score = scores[collegeId];
    if (!score) {
      setMessage("중요도를 선택해 주세요.");
      return;
    }

    setSubmittingKey(collegeId);
    try {
      const response = await fetch("/api/domain-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          axis: "college",
          targetKey: collegeId,
          score,
          notes: (notes[collegeId] ?? "").trim(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        rating?: DomainRatingView;
        error?: string;
      };
      if (!response.ok || !data.rating) {
        setMessage(data.error ?? "평가를 저장하지 못했습니다.");
        return;
      }
      setRatings((prev) => [data.rating as DomainRatingView, ...prev]);
      setScores((prev) => ({ ...prev, [collegeId]: 0 }));
      setNotes((prev) => ({ ...prev, [collegeId]: "" }));
      setMessage("4대 도메인 중요도 평가를 저장했습니다.");
    } catch {
      setMessage("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSubmittingKey(null);
    }
  }

  const recentRatings = ratings.slice(0, 8);

  return (
    <section className={styles.panel} aria-labelledby="domain-rating-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>4대 도메인 중요도 평가</p>
          <h2 id="domain-rating-title">4대 도메인 중요도 평가</h2>
          <span>
            현장 운영 체계의 4대 도메인을 5점 척도로 평가합니다. 세부
            기준(기능 도메인) 평가의 스킬 수 가중 평균이 참고치(서브 롤업)로
            함께 표시됩니다. 평가자 신원은 로그인 세션에서 자동 적용되고
            결과는 서버에 아카이빙됩니다.
          </span>
        </div>
        <strong>{ratings.length}건 평가</strong>
      </div>

      {!sessionEvaluatorName && (
        <p className={styles.loginHint}>
          평가 저장과 변경요청은 평가자 로그인 후 가능합니다(조회는 자유).{" "}
          <Link href="/evaluation/skills">평가자 로그인 →</Link>
        </p>
      )}
      {sessionEvaluatorName && (
        <p className={styles.identityHint}>
          평가자: <strong>{sessionEvaluatorName}</strong> (로그인 신원 자동
          적용)
        </p>
      )}

      <div className={styles.collegeGrid}>
        {collegeCards.map((card) => {
          const direct = averageOf("college", card.id);
          const rollup = rollupOf(card);
          const delta =
            direct && rollup ? direct.average - rollup.average : null;
          const showDelta =
            delta !== null && Math.abs(delta) >= DELTA_THRESHOLD;
          const selectedScore = scores[card.id] ?? 0;
          return (
            <article className={styles.collegeCard} key={card.id}>
              <div className={styles.collegeHead}>
                <h3>{card.name}</h3>
                <p className={styles.collegeRole}>
                  {card.role}
                  {card.isHub && !card.role.includes("허브") ? " · 허브" : ""}
                  {" · "}
                  {card.skillCount}개 스킬 · 중간분류{" "}
                  {card.subcategories.length}개
                </p>
              </div>

              <dl className={styles.metricsRow}>
                <div>
                  <dt>직접 평가</dt>
                  <dd>
                    {direct
                      ? `${direct.average.toFixed(1)} / 5 · ${direct.count}건`
                      : "평가 대기"}
                  </dd>
                </div>
                <div>
                  <dt>서브 롤업(참고)</dt>
                  <dd>
                    {rollup
                      ? `${rollup.average.toFixed(1)} / 5`
                      : "서브 평가 대기"}
                  </dd>
                </div>
              </dl>

              {showDelta && (
                <p className={styles.deltaBadge}>
                  직접 평가와 서브 롤업의 차이가 {Math.abs(delta!).toFixed(1)}
                  점입니다. 근거를 확인해 주세요.
                </p>
              )}

              {sessionEvaluatorName && (
                <>
                  <fieldset className={styles.scoreFieldset}>
                    <legend>중요도</legend>
                    <div className={styles.scoreOptions}>
                      {SCORE_VALUES.map((value) => (
                        <button
                          aria-pressed={selectedScore === value}
                          className={
                            selectedScore === value
                              ? `${styles.scoreButton} ${styles.scoreButtonActive}`
                              : styles.scoreButton
                          }
                          key={value}
                          onClick={() => {
                            setScores((prev) => ({
                              ...prev,
                              [card.id]: value,
                            }));
                            setMessage("");
                          }}
                          type="button"
                        >
                          <strong>{value}</strong>
                          <span>{SCORE_LABELS[value]}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className={styles.notes}>
                    평가 근거 <span>선택</span>
                    <textarea
                      onChange={(event) => {
                        setNotes((prev) => ({
                          ...prev,
                          [card.id]: event.target.value,
                        }));
                        setMessage("");
                      }}
                      placeholder="이 도메인이 왜 중요한지, 어떤 현장에 필요한지 남겨 주세요."
                      rows={2}
                      value={notes[card.id] ?? ""}
                    />
                  </label>

                  <button
                    className={styles.saveButton}
                    disabled={submittingKey === card.id}
                    onClick={() => handleSave(card.id)}
                    type="button"
                  >
                    {submittingKey === card.id ? "저장 중..." : "평가 저장"}
                  </button>
                </>
              )}

              <div className={styles.subcategoryBrowsers}>
                {card.subcategories.map((subcategory) => (
                  <DomainSkillBrowser
                    colleges={colleges}
                    evaluatorName={sessionEvaluatorName}
                    initialRequests={initialChangeRequests.filter((request) =>
                      subcategory.skills.some(
                        (skill) => skill.skillId === request.skillId,
                      ),
                    )}
                    key={subcategory.id}
                    skills={subcategory.skills}
                    toggleLabel={subcategory.name}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.subPageNote}>
        세부 기준(기능 도메인) 중요도 평가는{" "}
        <Link href="/evaluation/functional">기능 도메인 평가 페이지</Link>
        에서 진행합니다. 그 결과가 위 카드의 서브 롤업으로 집계됩니다.
      </p>

      {message && (
        <p aria-live="polite" className={styles.message}>
          {message}
        </p>
      )}

      {recentRatings.length > 0 && (
        <div className={styles.historySection}>
          <h3>최근 평가</h3>
          <div className={styles.historyList}>
            {recentRatings.map((rating) => {
              const targetName =
                rating.axis === "college"
                  ? collegeCards.find((card) => card.id === rating.targetKey)
                      ?.name ?? rating.targetKey
                  : domainNameByKey[rating.targetKey] ?? rating.targetKey;
              return (
                <article key={rating.id}>
                  <div>
                    <strong>
                      {rating.score}점 · [{AXIS_LABELS[rating.axis]}]{" "}
                      {targetName}
                    </strong>
                    <span>
                      {rating.evaluatorName} ·{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "medium",
                      }).format(new Date(rating.createdAt))}
                    </span>
                    {rating.notes && <p>{rating.notes}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
