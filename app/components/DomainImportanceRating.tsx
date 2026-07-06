"use client";

import { useEffect, useMemo, useState } from "react";
import { ROBOT_DOMAINS } from "../lib/robotics-data";
import DomainSkillBrowser, {
  type BrowserChangeRequest,
  type BrowserCollege,
  type BrowserSkill,
} from "./DomainSkillBrowser";
import styles from "./DomainImportanceRating.module.css";

interface DomainImportanceRatingProps {
  domainCounts: Record<string, number>;
  skillsByDomain?: Record<string, BrowserSkill[]>;
  colleges?: BrowserCollege[];
  sessionEvaluatorName?: string | null;
  initialChangeRequests?: BrowserChangeRequest[];
}

interface DomainRating {
  id: string;
  evaluatorName: string;
  domainKey: string;
  score: number;
  notes: string;
  createdAt: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: "낮음",
  2: "보통 이하",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

const SCORE_VALUES = [1, 2, 3, 4, 5];

const STORAGE_KEY = "factory-robotics-skillmap:domain-importance-ratings";

function loadRatings(): DomainRating[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DomainRating => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        typeof record.evaluatorName === "string" &&
        typeof record.domainKey === "string" &&
        typeof record.score === "number" &&
        !Number.isNaN(record.score) &&
        typeof record.notes === "string" &&
        typeof record.createdAt === "string" &&
        !Number.isNaN(new Date(record.createdAt).getTime())
      );
    });
  } catch {
    return [];
  }
}

function createRecordId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function DomainImportanceRating({
  domainCounts,
  skillsByDomain,
  colleges,
  sessionEvaluatorName = null,
  initialChangeRequests,
}: DomainImportanceRatingProps) {
  const [ratings, setRatings] = useState<DomainRating[]>([]);
  const [evaluatorName, setEvaluatorName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRatings(loadRatings());
  }, []);

  const summaries = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    ratings.forEach((rating) => {
      const entry = map[rating.domainKey] ?? { total: 0, count: 0 };
      entry.total += rating.score;
      entry.count += 1;
      map[rating.domainKey] = entry;
    });
    return map;
  }, [ratings]);

  function persist(nextRatings: DomainRating[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRatings));
      setRatings(nextRatings);
      return true;
    } catch {
      setMessage("평가를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
  }

  function handleSave(domainKey: string) {
    const trimmedName = evaluatorName.trim();
    if (!trimmedName) {
      setMessage("평가자를 먼저 입력해 주세요.");
      return;
    }
    const score = scores[domainKey];
    if (!score) {
      setMessage("중요도를 선택해 주세요.");
      return;
    }

    const nextRatings = [
      {
        id: createRecordId(),
        evaluatorName: trimmedName,
        domainKey,
        score,
        notes: (notes[domainKey] ?? "").trim(),
        createdAt: new Date().toISOString(),
      },
      ...ratings,
    ];

    if (persist(nextRatings)) {
      setScores((prev) => ({ ...prev, [domainKey]: 0 }));
      setNotes((prev) => ({ ...prev, [domainKey]: "" }));
      setMessage("도메인 중요도 평가를 저장했습니다.");
    }
  }

  function handleDelete(ratingId: string) {
    if (persist(ratings.filter((rating) => rating.id !== ratingId))) {
      setMessage("평가를 삭제했습니다.");
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="domain-rating-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>DOMAIN IMPORTANCE RATING</p>
          <h2 id="domain-rating-title">도메인별 스킬 중요도 평가</h2>
          <span>
            각 도메인이 스마트팩토리 현장에서 갖는 스킬 중요도를 5점 척도로
            평가합니다. 평가 결과는 브라우저에 저장됩니다.
          </span>
        </div>
        <strong>{ratings.length}건 평가</strong>
      </div>

      <label className={styles.evaluatorField}>
        평가자
        <input
          onChange={(event) => {
            setEvaluatorName(event.target.value);
            setMessage("");
          }}
          placeholder="예: 생산기술팀 김OO"
          value={evaluatorName}
        />
      </label>

      <div className={styles.domainGrid}>
        {ROBOT_DOMAINS.map((domain) => {
          const summary = summaries[domain.key];
          const average = summary && summary.count > 0
            ? summary.total / summary.count
            : null;
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
                    {average !== null ? `${average.toFixed(1)} / 5` : "평가 대기"}
                    {summary && summary.count > 0
                      ? ` · ${summary.count}명`
                      : ""}
                  </dd>
                </div>
              </dl>

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
                        setScores((prev) => ({ ...prev, [domain.key]: value }));
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
                  placeholder="이 도메인이 왜 중요한지, 어떤 현장에 필요한지 남겨 주세요."
                  rows={2}
                  value={notes[domain.key] ?? ""}
                />
              </label>

              <button
                className={styles.saveButton}
                onClick={() => handleSave(domain.key)}
                type="button"
              >
                평가 저장
              </button>

              {skillsByDomain && colleges && (
                <DomainSkillBrowser
                  colleges={colleges}
                  domainKey={domain.key}
                  evaluatorName={sessionEvaluatorName}
                  initialRequests={(initialChangeRequests ?? []).filter(
                    (request) =>
                      (skillsByDomain[domain.key] ?? []).some(
                        (skill) => skill.skillId === request.skillId,
                      ),
                  )}
                  skills={skillsByDomain[domain.key] ?? []}
                />
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

      {ratings.length > 0 && (
        <div className={styles.historySection}>
          <h3>최근 평가</h3>
          <div className={styles.historyList}>
            {ratings.slice(0, 8).map((rating) => {
              const domain = ROBOT_DOMAINS.find(
                (item) => item.key === rating.domainKey,
              );
              return (
                <article key={rating.id}>
                  <div>
                    <strong>
                      {rating.score}점 · {domain?.name ?? rating.domainKey}
                    </strong>
                    <span>
                      {rating.evaluatorName} ·{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "medium",
                      }).format(new Date(rating.createdAt))}
                    </span>
                    {rating.notes && <p>{rating.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(rating.id)} type="button">
                    삭제
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
