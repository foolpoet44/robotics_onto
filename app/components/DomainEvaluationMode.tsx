"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CollegeId } from "../lib/college-types";
import { RobotDomain, RobotSkill } from "../lib/robotics-data";
import {
  EXPERT_DOMAINS,
  ImportanceRating,
  SCORE_VALUES,
  clearMyRating,
  findMyScore,
  isDivergent,
  loadRatings,
  summarize,
  upsertMyRating,
} from "../lib/skill-rating-store";

interface DomainEvaluationModeProps {
  domain: RobotDomain;
  skills: RobotSkill[];
  // 평가자 정보는 부모(DomainSkillExplorer)가 소유해 모드 간 공유한다.
  expertName: string;
  expertDomain: CollegeId;
  onExpertNameChange: (value: string) => void;
  onExpertDomainChange: (value: CollegeId) => void;
}

type SortMode = "unrated-first" | "ranking";

export default function DomainEvaluationMode({
  domain,
  skills,
  expertName,
  expertDomain,
  onExpertNameChange,
  onExpertDomainChange,
}: DomainEvaluationModeProps) {
  void domain;
  // skillId -> 그 스킬에 달린 모든 평가 배열
  const [ratingsBySkill, setRatingsBySkill] = useState<
    Record<string, ImportanceRating[]>
  >({});
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("unrated-first");
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  // 마운트 시 이 도메인 스킬 전부의 평가를 localStorage에서 한 번에 끌어온다.
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

  // 점수 클릭 = 현재 평가자의 점수를 upsert(같은 평가자+영역의 기존 평가는 교체).
  function handleScore(skillId: string, score: number) {
    if (!expertName.trim()) {
      setMessage("먼저 상단에 평가자 이름을 입력해 주세요.");
      return;
    }
    const next = upsertMyRating(
      skillId,
      ratingsBySkill[skillId] ?? [],
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
    setRatingsBySkill((prev) => ({ ...prev, [skillId]: next }));
    setMessage("");
  }

  // 현재 평가자의 점수만 취소.
  function handleClearMine(skillId: string) {
    const next = clearMyRating(
      skillId,
      ratingsBySkill[skillId] ?? [],
      expertName,
      expertDomain,
    );
    if (next === null) {
      setMessage("평가를 수정하지 못했습니다.");
      return;
    }
    setRatingsBySkill((prev) => ({ ...prev, [skillId]: next }));
  }

  const lowerQuery = query.trim().toLowerCase();
  const visibleSkills = useMemo(() => {
    const filtered = lowerQuery
      ? skills.filter((skill) =>
          `${skill.preferred_label_ko} ${skill.preferred_label_en} ${skill.description_ko}`
            .toLowerCase()
            .includes(lowerQuery),
        )
      : skills;
    const withStats = filtered.map((skill) => ({
      skill,
      stats: summarize(ratingsBySkill[skill.skill_id] ?? []),
    }));
    if (sortMode === "ranking") {
      // 평가된 것 우선, 평균 높은 순. 미평가는 뒤로.
      return withStats.sort(
        (a, b) => (b.stats.average ?? -1) - (a.stats.average ?? -1),
      );
    }
    // unrated-first: 내가 아직 안 매긴 스킬을 위로 올려 완주를 유도.
    return withStats.sort((a, b) => {
      const aMine = myScoreFor(a.skill.skill_id) === null ? 0 : 1;
      const bMine = myScoreFor(b.skill.skill_id) === null ? 0 : 1;
      return aMine - bMine;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, ratingsBySkill, lowerQuery, sortMode, expertName, expertDomain]);

  // 우측 패널: 평가가 1건 이상 있는 스킬을 평균 내림차순으로 랭킹.
  const ranking = useMemo(() => {
    return skills
      .map((skill) => ({
        skill,
        stats: summarize(ratingsBySkill[skill.skill_id] ?? []),
      }))
      .filter((row) => row.stats.count > 0)
      .sort((a, b) => (b.stats.average ?? 0) - (a.stats.average ?? 0));
  }, [skills, ratingsBySkill]);

  // 진행률: 현재 평가자가 점수를 매긴 스킬 수 / 전체.
  const myProgress = useMemo(() => {
    if (!expertName.trim()) return 0;
    return skills.filter((skill) => myScoreFor(skill.skill_id) !== null).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, ratingsBySkill, expertName, expertDomain]);

  const divergentCount = ranking.filter((row) => isDivergent(row.stats)).length;

  const progressPct =
    skills.length > 0 ? Math.round((myProgress / skills.length) * 100) : 0;

  return (
    <div className="evalLayout">
      {/* ── 좌측: 평가자 정보 + 스킬 인라인 평가 테이블 ── */}
      <section className="evalMain">
        <div className="evalToolbar">
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
              onChange={(e) =>
                onExpertDomainChange(e.target.value as CollegeId)
              }
            >
              {EXPERT_DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.isHub ? " · HUB" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="progress">
            <span>
              진행률 {myProgress}/{skills.length}
            </span>
            <div className="progressBar" aria-hidden>
              <div style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="evalFilters">
          <input
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="스킬 검색..."
          />
          <div className="sortToggle" role="group" aria-label="정렬">
            <button
              type="button"
              className={sortMode === "unrated-first" ? "active" : ""}
              onClick={() => setSortMode("unrated-first")}
            >
              미평가 먼저
            </button>
            <button
              type="button"
              className={sortMode === "ranking" ? "active" : ""}
              onClick={() => setSortMode("ranking")}
            >
              점수 높은 순
            </button>
          </div>
        </div>

        {message && (
          <p className="message" aria-live="polite">
            {message}
          </p>
        )}

        <div className="rows">
          {visibleSkills.map(({ skill, stats }) => {
            const mine = myScoreFor(skill.skill_id);
            const divergent = isDivergent(stats);
            const status = divergent
              ? "divergent"
              : stats.count > 0
                ? "rated"
                : "unrated";
            const statusLabel = divergent
              ? `이견 σ=${stats.stddev.toFixed(1)}`
              : stats.count > 0
                ? "평가완료"
                : "미평가";
            return (
              <article className={`row ${status}`} key={skill.skill_id}>
                <div className="rowInfo">
                  <Link href={`/skills/${skill.skill_id}`} className="rowName">
                    {skill.preferred_label_ko}
                  </Link>
                  <span className="rowMeta">
                    {skill.skill_id} · LV{skill.proficiency_level}
                    {stats.count > 0 && (
                      <>
                        {" · "}평균 {stats.average?.toFixed(1)} ({stats.count}
                        명)
                      </>
                    )}
                  </span>
                </div>
                <div
                  className="rowScores"
                  role="group"
                  aria-label={`${skill.preferred_label_ko} 중요도`}
                >
                  {SCORE_VALUES.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={mine === value ? "score selected" : "score"}
                      aria-label={`${skill.preferred_label_ko} 중요도 ${value}점`}
                      aria-pressed={mine === value}
                      onClick={() => handleScore(skill.skill_id, value)}
                    >
                      {value}
                    </button>
                  ))}
                  {mine !== null && (
                    <button
                      type="button"
                      className="clear"
                      aria-label="내 평가 취소"
                      title="내 평가 취소"
                      onClick={() => handleClearMine(skill.skill_id)}
                    >
                      ×
                    </button>
                  )}
                </div>
                <span className={`badge ${status}`}>{statusLabel}</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── 우측: 실시간 우선순위 랭킹 + 이견 ── */}
      <aside className="evalResults">
        <div className="resultsHead">
          <p className="eyebrow">LIVE PRIORITY</p>
          <h3>실시간 우선순위</h3>
          <span>
            {ranking.length}개 평가됨
            {divergentCount > 0 ? ` · 이견 ${divergentCount}건 ⚠️` : ""}
          </span>
        </div>
        {!loaded ? (
          <p className="resultsEmpty">불러오는 중...</p>
        ) : ranking.length === 0 ? (
          <p className="resultsEmpty">
            아직 평가가 없습니다. 왼쪽에서 점수를 매기면 여기에 순위가
            실시간으로 쌓입니다.
          </p>
        ) : (
          <ol className="rankList">
            {ranking.map((row, index) => {
              const divergent = isDivergent(row.stats);
              const pct = ((row.stats.average ?? 0) / 5) * 100;
              return (
                <li
                  key={row.skill.skill_id}
                  className={divergent ? "divergent" : ""}
                >
                  <div className="rankTop">
                    <span className="rankNo">{index + 1}</span>
                    <Link
                      href={`/skills/${row.skill.skill_id}`}
                      className="rankName"
                    >
                      {row.skill.preferred_label_ko}
                    </Link>
                    <strong className="rankAvg">
                      {row.stats.average?.toFixed(1)}
                    </strong>
                  </div>
                  <div className="rankBar" aria-hidden>
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  <span className="rankSub">
                    {row.stats.count}명 평가
                    {divergent && (
                      <span className="divergeTag">
                        {" "}
                        ⚠️ 이견 σ={row.stats.stddev.toFixed(1)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </aside>

      <style jsx>{`
        .evalLayout {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
          gap: 1.2rem;
          align-items: start;
        }
        .evalMain {
          min-width: 0;
        }
        .evalToolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 0.8rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.7rem;
          margin-bottom: 0.9rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .field input,
        .field select {
          padding: 0.5rem 0.6rem;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          background: white;
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 500;
        }
        .field input {
          min-width: 200px;
        }
        .progress {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-left: auto;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          min-width: 160px;
        }
        .progressBar {
          height: 8px;
          border-radius: 999px;
          background: var(--bg-tertiary);
          overflow: hidden;
        }
        .progressBar > div {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.25s ease;
        }
        .evalFilters {
          display: flex;
          gap: 0.6rem;
          margin-bottom: 0.8rem;
        }
        .search {
          flex: 1;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 0.6rem;
          background: white;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .sortToggle {
          display: inline-flex;
          border: 1px solid var(--border-color);
          border-radius: 0.6rem;
          overflow: hidden;
        }
        .sortToggle button {
          padding: 0.5rem 0.7rem;
          border: none;
          background: white;
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .sortToggle button.active {
          background: var(--color-primary);
          color: white;
        }
        .message {
          margin: 0 0 0.7rem;
          padding: 0.55rem 0.7rem;
          border-radius: 0.5rem;
          background: hsl(38, 92%, 95%);
          color: hsl(25, 80%, 35%);
          font-size: 0.82rem;
          font-weight: 700;
        }
        .rows {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 0.8rem;
          padding: 0.7rem 0.85rem;
          background: white;
          border: 1px solid var(--border-color);
          border-left: 4px solid transparent;
          border-radius: 0.6rem;
        }
        .row.rated {
          border-left-color: var(--color-secondary);
        }
        .row.divergent {
          border-left-color: hsl(38, 92%, 50%);
          background: hsl(38, 92%, 98%);
        }
        .row.unrated {
          border-left-style: dashed;
          border-left-color: var(--color-primary-light);
        }
        .rowInfo {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }
        .rowName {
          font-weight: 700;
          color: var(--text-primary);
          text-decoration: none;
          font-size: 0.95rem;
        }
        .rowName:hover {
          color: var(--color-primary-dark);
        }
        .rowMeta {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .rowScores {
          display: inline-flex;
          gap: 0.25rem;
          align-items: center;
        }
        .score {
          width: 30px;
          height: 30px;
          border: 1px solid var(--border-color);
          border-radius: 0.4rem;
          background: white;
          color: var(--text-secondary);
          font-weight: 800;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .score:hover {
          border-color: var(--color-primary);
          color: var(--color-primary-dark);
        }
        .score.selected {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }
        .clear {
          width: 24px;
          height: 30px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 1.1rem;
          cursor: pointer;
          line-height: 1;
        }
        .clear:hover {
          color: var(--color-accent);
        }
        .badge {
          justify-self: end;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .badge.unrated {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }
        .badge.rated {
          background: hsla(195, 100%, 50%, 0.14);
          color: hsl(195, 90%, 30%);
        }
        .badge.divergent {
          background: hsl(38, 92%, 90%);
          color: hsl(25, 85%, 35%);
        }
        .evalResults {
          position: sticky;
          top: 1rem;
          padding: 1.1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 0.8rem;
          box-shadow: var(--shadow-sm);
        }
        .resultsHead {
          margin-bottom: 0.9rem;
        }
        .eyebrow {
          margin: 0;
          font-size: 0.66rem;
          letter-spacing: 0.12em;
          font-weight: 800;
          color: var(--color-primary);
        }
        .resultsHead h3 {
          margin: 0.1rem 0 0.2rem;
          font-size: 1.05rem;
        }
        .resultsHead span {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 700;
        }
        .resultsEmpty {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .rankList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .rankList li {
          padding: 0.55rem 0.6rem;
          border-radius: 0.55rem;
          background: var(--bg-secondary);
        }
        .rankList li.divergent {
          background: hsl(38, 92%, 96%);
          outline: 1px solid hsl(38, 92%, 80%);
        }
        .rankTop {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .rankNo {
          width: 20px;
          height: 20px;
          flex: none;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: var(--color-primary);
          color: white;
          font-size: 0.68rem;
          font-weight: 800;
        }
        .rankName {
          flex: 1;
          min-width: 0;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rankName:hover {
          color: var(--color-primary-dark);
        }
        .rankAvg {
          font-size: 0.95rem;
          color: var(--color-primary-dark);
        }
        .rankBar {
          height: 6px;
          margin: 0.35rem 0 0.25rem;
          border-radius: 999px;
          background: var(--bg-tertiary);
          overflow: hidden;
        }
        .rankBar > div {
          height: 100%;
          background: linear-gradient(
            90deg,
            var(--color-primary-light),
            var(--color-primary)
          );
        }
        .rankSub {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .divergeTag {
          color: hsl(25, 85%, 40%);
          font-weight: 800;
        }
        @media (max-width: 900px) {
          .evalLayout {
            grid-template-columns: 1fr;
          }
          .evalResults {
            position: static;
            order: -1;
          }
          .row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          .badge {
            justify-self: start;
          }
        }
      `}</style>
    </div>
  );
}
