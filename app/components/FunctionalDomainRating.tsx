"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROBOT_DOMAINS } from "../lib/robotics-data";
import styles from "./FunctionalDomainRating.module.css";

export interface DomainRatingView {
  id: string;
  axis: "college" | "functional";
  targetKey: string;
  score: number;
  notes: string;
  evaluatorName: string;
  createdAt: string;
}

interface FunctionalDomainRatingProps {
  domainCounts: Record<string, number>;
  sessionEvaluatorName: string | null;
  initialRatings: DomainRatingView[];
}

const SCORE_LABELS: Record<number, string> = {
  1: "낮음",
  2: "보통 이하",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

const SCORE_VALUES = [1, 2, 3, 4, 5];

export default function FunctionalDomainRating({
  domainCounts,
  sessionEvaluatorName,
  initialRatings,
}: FunctionalDomainRatingProps) {
  const [ratings, setRatings] = useState<DomainRatingView[]>(initialRatings);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const summaries = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    ratings.forEach((rating) => {
      if (rating.axis !== "functional") return;
      const entry = map[rating.targetKey] ?? { total: 0, count: 0 };
      entry.total += rating.score;
      entry.count += 1;
      map[rating.targetKey] = entry;
    });
    return map;
  }, [ratings]);

  async function handleSave(domainKey: string) {
    const score = scores[domainKey];
    if (!score) {
      setMessage("중요도를 선택해 주세요.");
      return;
    }

    setSubmittingKey(domainKey);
    try {
      const response = await fetch("/api/domain-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          axis: "functional",
          targetKey: domainKey,
          score,
          notes: (notes[domainKey] ?? "").trim(),
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
      setScores((prev) => ({ ...prev, [domainKey]: 0 }));
      setNotes((prev) => ({ ...prev, [domainKey]: "" }));
      setMessage("기능 도메인 중요도 평가를 저장했습니다.");
    } catch {
      setMessage("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSubmittingKey(null);
    }
  }

  const myRecent = ratings
    .filter((rating) => rating.axis === "functional")
    .slice(0, 8);

  return (
    <section className={styles.panel} aria-labelledby="functional-rating-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>SUB — 세부 기준</p>
          <h2 id="functional-rating-title">기능 도메인 중요도 평가</h2>
          <span>
            4대 도메인 판단의 세부 근거가 되는 참고 분류입니다. 이 평가의
            스킬 수 가중 평균이 <Link href="/evaluation">4대 도메인 평가</Link>
            의 &quot;서브 롤업&quot;으로 집계됩니다.
          </span>
        </div>
        <strong>
          {ratings.filter((rating) => rating.axis === "functional").length}건
          평가
        </strong>
      </div>

      {!sessionEvaluatorName && (
        <p className={styles.loginHint}>
          평가 저장은 평가자 로그인 후 가능합니다(조회는 자유).{" "}
          <Link href="/evaluation/skills">평가자 로그인 →</Link>
        </p>
      )}
      {sessionEvaluatorName && (
        <p className={styles.identityHint}>
          평가자: <strong>{sessionEvaluatorName}</strong> (로그인 신원 자동
          적용)
        </p>
      )}

      <div className={styles.domainGrid}>
        {ROBOT_DOMAINS.map((domain) => {
          const summary = summaries[domain.key];
          const selectedScore = scores[domain.key] ?? 0;
          return (
            <article
              className={styles.domainCard}
              key={domain.key}
              style={{ borderTopColor: domain.color }}
            >
              <div className={styles.cardHead}>
                <span className={styles.domainIcon} aria-hidden="true">
                  {domain.icon}
                </span>
                <div>
                  <h3>{domain.name}</h3>
                  <p className={styles.domainEn}>{domain.nameEn}</p>
                </div>
              </div>
              <p className={styles.domainDescription}>{domain.description}</p>

              <dl className={styles.domainMeta}>
                <div>
                  <dt>스킬 수</dt>
                  <dd>{domainCounts[domain.key] ?? 0}</dd>
                </div>
                <div>
                  <dt>평균 중요도</dt>
                  <dd>
                    {summary
                      ? `${(summary.total / summary.count).toFixed(1)} / 5 · ${summary.count}건`
                      : "평가 대기"}
                  </dd>
                </div>
              </dl>

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
                              [domain.key]: value,
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
                          [domain.key]: event.target.value,
                        }));
                        setMessage("");
                      }}
                      placeholder="이 기능 영역이 왜 중요한지 남겨 주세요."
                      rows={2}
                      value={notes[domain.key] ?? ""}
                    />
                  </label>

                  <button
                    className={styles.saveButton}
                    disabled={submittingKey === domain.key}
                    onClick={() => handleSave(domain.key)}
                    type="button"
                  >
                    {submittingKey === domain.key ? "저장 중..." : "평가 저장"}
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>

      {message && (
        <p aria-live="polite" className={styles.message}>
          {message}
        </p>
      )}

      {myRecent.length > 0 && (
        <div className={styles.historySection}>
          <h3>최근 평가</h3>
          <div className={styles.historyList}>
            {myRecent.map((rating) => {
              const domain = ROBOT_DOMAINS.find(
                (item) => item.key === rating.targetKey,
              );
              return (
                <article key={rating.id}>
                  <div>
                    <strong>
                      {rating.score}점 · {domain?.name ?? rating.targetKey}
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
