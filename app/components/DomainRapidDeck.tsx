"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CollegeId } from "../lib/college-types";
import { RobotDomain, RobotSkill } from "../lib/robotics-data";
import {
  EXPERT_DOMAINS,
  ImportanceRating,
  findMyScore,
  loadRatings,
  upsertMyRating,
} from "../lib/skill-rating-store";

interface DomainRapidDeckProps {
  domain: RobotDomain;
  skills: RobotSkill[];
  expertName: string;
  expertDomain: CollegeId;
  onExpertNameChange: (value: string) => void;
  onExpertDomainChange: (value: CollegeId) => void;
}

// 한 장씩 빠르게 분류하는 래피드 덱. 점수 라벨을 함께 보여줘 절대 기준을 잡아준다.
// 데이터 모델은 테이블과 동일한 1~5점이라, 덱에서 매긴 점수가 테이블/상세에 그대로 반영된다.
const SCORE_BUTTONS = [
  { value: 1, label: "낮음" },
  { value: 2, label: "보통 이하" },
  { value: 3, label: "보통" },
  { value: 4, label: "높음" },
  { value: 5, label: "매우 높음" },
];

export default function DomainRapidDeck({
  domain,
  skills,
  expertName,
  expertDomain,
  onExpertNameChange,
  onExpertDomainChange,
}: DomainRapidDeckProps) {
  void domain;
  const [ratingsBySkill, setRatingsBySkill] = useState<
    Record<string, ImportanceRating[]>
  >({});
  const [cursor, setCursor] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next: Record<string, ImportanceRating[]> = {};
    for (const skill of skills) {
      next[skill.skill_id] = loadRatings(skill.skill_id);
    }
    setRatingsBySkill(next);
    setLoaded(true);
  }, [skills]);

  function myScoreFor(skillId: string): number | null {
    return findMyScore(ratingsBySkill[skillId] ?? [], expertName, expertDomain);
  }

  const ratedCount = useMemo(() => {
    if (!expertName.trim()) return 0;
    return skills.filter((skill) => myScoreFor(skill.skill_id) !== null).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, ratingsBySkill, expertName, expertDomain]);

  // 덱은 항상 스킬 원본 순서를 따라가고, cursor만 이동한다(점수 매겨도 카드가
  // 재정렬돼 흐름이 튀지 않도록). 첫 진입 시엔 첫 미평가 카드로 점프한다.
  const total = skills.length;
  const current = cursor < total ? skills[cursor] : null;

  // 평가자/데이터가 준비되면 첫 미평가 카드로 커서를 한 번 맞춘다.
  const firstUnratedJumpKey = `${loaded}-${expertName.trim()}-${expertDomain}`;
  const [jumpedKey, setJumpedKey] = useState("");
  useEffect(() => {
    if (!loaded) return;
    if (jumpedKey === firstUnratedJumpKey) return;
    const idx = skills.findIndex(
      (skill) => myScoreFor(skill.skill_id) === null,
    );
    setCursor(idx === -1 ? total : idx);
    setJumpedKey(firstUnratedJumpKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, firstUnratedJumpKey]);

  function advance() {
    setCursor((c) => Math.min(c + 1, total));
  }

  function goPrev() {
    setCursor((c) => Math.max(c - 1, 0));
  }

  function handleScore(score: number) {
    if (!current) return;
    if (!expertName.trim()) {
      setMessage("먼저 평가자 이름을 입력해 주세요.");
      return;
    }
    const next = upsertMyRating(
      current.skill_id,
      ratingsBySkill[current.skill_id] ?? [],
      expertName,
      expertDomain,
      score,
    );
    if (next === null) {
      setMessage(
        "평가를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.",
      );
      return;
    }
    setRatingsBySkill((prev) => ({ ...prev, [current.skill_id]: next }));
    setMessage("");
    advance(); // 점수 선택 즉시 다음 카드로
  }

  const progressPct = total > 0 ? Math.round((ratedCount / total) * 100) : 0;
  const isDone = cursor >= total;

  return (
    <div className="deckWrap">
      <div className="deckToolbar">
        <label className="field">
          평가자
          <input
            value={expertName}
            onChange={(e) => onExpertNameChange(e.target.value)}
            placeholder="예: 생산기술팀 김OO"
          />
        </label>
        <label className="field">
          전문 영역
          <select
            value={expertDomain}
            onChange={(e) => onExpertDomainChange(e.target.value as CollegeId)}
          >
            {EXPERT_DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.isHub ? " · HUB" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="deckProgress">
        <span>
          {ratedCount}/{total} 평가 · 카드 {Math.min(cursor + 1, total)}/{total}
        </span>
        <div className="bar" aria-hidden>
          <div style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {message && (
        <p className="message" aria-live="polite">
          {message}
        </p>
      )}

      {!loaded ? (
        <p className="deckEmpty">불러오는 중...</p>
      ) : isDone ? (
        <div className="card done">
          <span className="doneIcon">✅</span>
          <h3>이 도메인 카드를 모두 넘겼습니다</h3>
          <p>
            {ratedCount}/{total} 스킬을 평가했습니다.
            {ratedCount < total
              ? " 건너뛴 카드는 다시 처음부터 넘겨볼 수 있어요."
              : " 수고하셨습니다!"}
          </p>
          <div className="doneActions">
            <button type="button" onClick={() => setCursor(0)}>
              처음부터 다시 보기
            </button>
          </div>
        </div>
      ) : current ? (
        <article className="card" key={current.skill_id}>
          <div className="cardHead">
            <span className="cardTag">
              {current.skill_id} · LV{current.proficiency_level}
            </span>
            {myScoreFor(current.skill_id) !== null && (
              <span className="cardMyScore">
                내 점수 {myScoreFor(current.skill_id)}
              </span>
            )}
          </div>
          <h3 className="cardTitle">{current.preferred_label_ko}</h3>
          <p className="cardEn">{current.preferred_label_en}</p>
          <p className="cardDesc">{current.description_ko}</p>
          {current.related_skills.length > 0 && (
            <p className="cardRelated">
              관련 스킬 {current.related_skills.length}개
            </p>
          )}

          <div className="scoreRow" role="group" aria-label="중요도 선택">
            {SCORE_BUTTONS.map((s) => (
              <button
                type="button"
                key={s.value}
                className={
                  myScoreFor(current.skill_id) === s.value
                    ? "scoreBtn selected"
                    : "scoreBtn"
                }
                aria-pressed={myScoreFor(current.skill_id) === s.value}
                onClick={() => handleScore(s.value)}
              >
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <div className="navRow">
            <button
              type="button"
              className="nav"
              onClick={goPrev}
              disabled={cursor === 0}
            >
              ← 이전
            </button>
            <Link href={`/skills/${current.skill_id}`} className="detailLink">
              상세 보기
            </Link>
            <button type="button" className="nav skip" onClick={advance}>
              건너뛰기 →
            </button>
          </div>
        </article>
      ) : null}

      <style jsx>{`
        .deckWrap {
          max-width: 560px;
          margin: 0 auto;
        }
        .deckToolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          padding: 0.9rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.7rem;
          margin-bottom: 0.8rem;
        }
        .field {
          display: flex;
          flex: 1;
          min-width: 140px;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .field input,
        .field select {
          padding: 0.55rem 0.6rem;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          background: white;
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 500;
        }
        .deckProgress {
          margin-bottom: 0.8rem;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--color-primary-dark);
        }
        .bar {
          height: 8px;
          margin-top: 0.35rem;
          border-radius: 999px;
          background: var(--bg-tertiary);
          overflow: hidden;
        }
        .bar > div {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.25s ease;
        }
        .message {
          margin: 0 0 0.7rem;
          padding: 0.55rem 0.7rem;
          border-radius: 0.5rem;
          background: hsl(38, 92%, 95%);
          color: hsl(25, 80%, 35%);
          font-size: 0.85rem;
          font-weight: 700;
        }
        .deckEmpty {
          text-align: center;
          color: var(--text-muted);
          padding: 2rem 0;
        }
        .card {
          display: flex;
          flex-direction: column;
          padding: 1.4rem;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          box-shadow: var(--shadow-md);
          min-height: 320px;
        }
        .cardHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        .cardTag {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--color-primary-dark);
        }
        .cardMyScore {
          font-size: 0.72rem;
          font-weight: 800;
          color: white;
          background: var(--color-primary);
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
        }
        .cardTitle {
          margin: 0.6rem 0 0.1rem;
          font-size: 1.4rem;
        }
        .cardEn {
          margin: 0 0 0.6rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .cardDesc {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.55;
        }
        .cardRelated {
          margin: 0.7rem 0 0;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .scoreRow {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.4rem;
          margin: 1.3rem 0 0.9rem;
          margin-top: auto;
          padding-top: 1.3rem;
        }
        .scoreBtn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          padding: 0.7rem 0.2rem;
          min-height: 64px;
          justify-content: center;
          border: 1px solid var(--border-color);
          border-radius: 0.6rem;
          background: white;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .scoreBtn strong {
          font-size: 1.15rem;
          color: var(--text-primary);
        }
        .scoreBtn span {
          font-size: 0.64rem;
          font-weight: 700;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.1;
        }
        .scoreBtn:hover {
          border-color: var(--color-primary);
        }
        .scoreBtn.selected {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }
        .scoreBtn.selected strong,
        .scoreBtn.selected span {
          color: white;
        }
        .navRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .nav {
          padding: 0.55rem 0.8rem;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          background: white;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }
        .nav:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .nav.skip:hover {
          border-color: var(--color-primary);
          color: var(--color-primary-dark);
        }
        .detailLink {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          text-decoration: none;
        }
        .detailLink:hover {
          text-decoration: underline;
        }
        .card.done {
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 0.4rem;
        }
        .doneIcon {
          font-size: 2.6rem;
        }
        .doneActions {
          margin-top: 1rem;
        }
        .doneActions button {
          padding: 0.6rem 1.1rem;
          border: none;
          border-radius: 0.6rem;
          background: var(--color-primary);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
