"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RobotDomain, RobotSkill } from "../lib/robotics-data";
import {
  ImportanceRating,
  isDivergent,
  loadRatings,
  summarize,
} from "../lib/skill-rating-store";

interface DomainPriorityMatrixProps {
  domain: RobotDomain;
  skills: RobotSkill[];
}

// 2차(난이도 신규 수집)를 건너뛰었으므로, Y축은 스킬 데이터에 이미 있는
// proficiency_level(LV1~4)을 "숙련 난이도" 대리 지표로 쓴다. X축은 평가 평균(1~5).
// 사분면 해석:
//   우상(중요·고난이도) = 핵심 육성: 사오기 어렵고 중요 → 정규 교육 1순위
//   우하(중요·저난이도) = 기본기: 중요하지만 쉬움 → OJT로 충분
//   좌상(덜중요·고난이도) = 선택적: 어렵지만 우선순위 낮음
//   좌하(덜중요·저난이도) = 후순위
const X_MID = 3; // 중요도 중앙값 (1~5)
const Y_MID = 2.5; // 난이도 중앙값 (LV1~4)

interface PlottedSkill {
  skill: RobotSkill;
  x: number; // 중요도 평균
  y: number; // proficiency_level
  count: number;
  divergent: boolean;
}

export default function DomainPriorityMatrix({
  domain,
  skills,
}: DomainPriorityMatrixProps) {
  const [ratingsBySkill, setRatingsBySkill] = useState<
    Record<string, ImportanceRating[]>
  >({});
  const [loaded, setLoaded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, ImportanceRating[]> = {};
    for (const skill of skills) {
      next[skill.skill_id] = loadRatings(skill.skill_id);
    }
    setRatingsBySkill(next);
    setLoaded(true);
  }, [skills]);

  const { plotted, unrated } = useMemo(() => {
    const plottedSkills: PlottedSkill[] = [];
    const unratedSkills: RobotSkill[] = [];
    for (const skill of skills) {
      const stats = summarize(ratingsBySkill[skill.skill_id] ?? []);
      if (stats.average === null) {
        unratedSkills.push(skill);
        continue;
      }
      plottedSkills.push({
        skill,
        x: stats.average,
        y: skill.proficiency_level,
        count: stats.count,
        divergent: isDivergent(stats),
      });
    }
    return { plotted: plottedSkills, unrated: unratedSkills };
  }, [skills, ratingsBySkill]);

  // 사분면별 카운트(요약용).
  const quadrantCounts = useMemo(() => {
    const counts = { core: 0, basic: 0, optional: 0, low: 0 };
    for (const p of plotted) {
      const right = p.x >= X_MID;
      const top = p.y >= Y_MID;
      if (right && top) counts.core += 1;
      else if (right && !top) counts.basic += 1;
      else if (!right && top) counts.optional += 1;
      else counts.low += 1;
    }
    return counts;
  }, [plotted]);

  // 좌표 → 플롯 내 위치(%). X: 1~5, Y: 1~4(아래가 LV1).
  function leftPct(x: number) {
    return ((x - 1) / 4) * 100;
  }
  function bottomPct(y: number) {
    return ((y - 1) / 3) * 100;
  }

  return (
    <div className="matrixWrap">
      <div className="matrixHead">
        <div>
          <p className="eyebrow">PRIORITY MATRIX</p>
          <h3>{domain.name} 우선순위 매트릭스</h3>
          <span>
            X축 중요도(평가 평균) × Y축 숙련 난이도(LV). 평가된 {plotted.length}
            개 스킬 배치 · 미평가 {unrated.length}개
          </span>
        </div>
        <ul className="legend">
          <li>
            <span className="dot rated" /> 평가됨
          </li>
          <li>
            <span className="dot diverge" /> 이견(σ≥1.2)
          </li>
        </ul>
      </div>

      {!loaded ? (
        <p className="matrixEmpty">불러오는 중...</p>
      ) : plotted.length === 0 ? (
        <p className="matrixEmpty">
          아직 평가된 스킬이 없습니다. 평가 모드나 빠른평가로 점수를 매기면
          여기에 사분면으로 배치됩니다.
        </p>
      ) : (
        <div className="plotArea">
          <span className="axisY">숙련 난이도 (LV) →</span>
          <span className="axisX">중요도 (평가 평균) →</span>
          <div className="plot">
            {/* 사분면 배경 라벨 */}
            <div className="quad core">
              핵심 육성<small>중요·고난이도 · {quadrantCounts.core}</small>
            </div>
            <div className="quad optional">
              선택적<small>덜중요·고난이도 · {quadrantCounts.optional}</small>
            </div>
            <div className="quad basic">
              기본기(OJT)<small>중요·저난이도 · {quadrantCounts.basic}</small>
            </div>
            <div className="quad low">
              후순위<small>덜중요·저난이도 · {quadrantCounts.low}</small>
            </div>

            {/* 점 */}
            {plotted.map((p) => (
              <div
                key={p.skill.skill_id}
                className={`point ${p.divergent ? "diverge" : ""} ${
                  hoveredId === p.skill.skill_id ? "active" : ""
                }`}
                style={{
                  left: `${leftPct(p.x)}%`,
                  bottom: `${bottomPct(p.y)}%`,
                }}
                onMouseEnter={() => setHoveredId(p.skill.skill_id)}
                onMouseLeave={() => setHoveredId(null)}
                title={`${p.skill.preferred_label_ko} · 중요도 ${p.x.toFixed(
                  1,
                )} · LV${p.y} · ${p.count}명`}
              >
                <span className="pointLabel">{p.skill.preferred_label_ko}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 핵심 육성 사분면 스킬 목록(우상단) — 가장 먼저 봐야 할 그룹 */}
      {plotted.some((p) => p.x >= X_MID && p.y >= Y_MID) && (
        <div className="coreList">
          <h4>🎯 핵심 육성 후보 (중요·고난이도)</h4>
          <div className="chips">
            {plotted
              .filter((p) => p.x >= X_MID && p.y >= Y_MID)
              .sort((a, b) => b.x - a.x)
              .map((p) => (
                <Link
                  key={p.skill.skill_id}
                  href={`/skills/${p.skill.skill_id}`}
                  className={`chip ${p.divergent ? "diverge" : ""}`}
                >
                  {p.skill.preferred_label_ko}
                  <small>
                    {p.x.toFixed(1)} · LV{p.y}
                    {p.divergent ? " · ⚠️" : ""}
                  </small>
                </Link>
              ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .matrixWrap {
          max-width: 880px;
          margin: 0 auto;
        }
        .matrixHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.1rem;
        }
        .eyebrow {
          margin: 0;
          font-size: 0.66rem;
          letter-spacing: 0.12em;
          font-weight: 800;
          color: var(--color-primary);
        }
        .matrixHead h3 {
          margin: 0.1rem 0 0.25rem;
          font-size: 1.15rem;
        }
        .matrixHead span {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .legend {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        .legend li {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          display: inline-block;
        }
        .dot.rated {
          background: var(--color-primary);
        }
        .dot.diverge {
          background: hsl(38, 92%, 50%);
        }
        .matrixEmpty {
          padding: 2rem 0;
          text-align: center;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .plotArea {
          position: relative;
          padding-left: 1.6rem;
          padding-bottom: 1.6rem;
        }
        .axisY {
          position: absolute;
          left: -0.2rem;
          top: 50%;
          transform: rotate(-90deg) translateX(50%);
          transform-origin: left center;
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .axisX {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-muted);
        }
        .plot {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border: 1px solid var(--border-color);
          border-radius: 0.6rem;
          background:
            linear-gradient(
              to right,
              transparent calc(50% - 1px),
              var(--border-color) 50%,
              transparent calc(50% + 1px)
            ),
            linear-gradient(
              to bottom,
              transparent calc(50% - 1px),
              var(--border-color) 50%,
              transparent calc(50% + 1px)
            );
          overflow: hidden;
        }
        .quad {
          position: absolute;
          width: 50%;
          height: 50%;
          display: flex;
          flex-direction: column;
          padding: 0.5rem 0.6rem;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--text-muted);
          pointer-events: none;
        }
        .quad small {
          font-size: 0.64rem;
          font-weight: 700;
          opacity: 0.8;
        }
        .quad.core {
          right: 0;
          top: 0;
          align-items: flex-end;
          text-align: right;
          color: var(--color-primary-dark);
          background: hsla(262, 83%, 58%, 0.06);
        }
        .quad.optional {
          left: 0;
          top: 0;
        }
        .quad.basic {
          right: 0;
          bottom: 0;
          align-items: flex-end;
          text-align: right;
          color: hsl(195, 90%, 32%);
          background: hsla(195, 100%, 50%, 0.05);
        }
        .quad.low {
          left: 0;
          bottom: 0;
          justify-content: flex-end;
        }
        .point {
          position: absolute;
          width: 13px;
          height: 13px;
          border-radius: 999px;
          background: var(--color-primary);
          border: 2px solid white;
          box-shadow: var(--shadow-sm);
          transform: translate(-50%, 50%);
          cursor: pointer;
          z-index: 1;
        }
        .point.diverge {
          background: hsl(38, 92%, 50%);
        }
        .point.active {
          z-index: 5;
        }
        .pointLabel {
          position: absolute;
          left: 50%;
          bottom: 150%;
          transform: translateX(-50%);
          padding: 0.2rem 0.45rem;
          border-radius: 0.4rem;
          background: var(--text-primary);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.12s ease;
        }
        .point.active .pointLabel {
          opacity: 1;
        }
        .coreList {
          margin-top: 1.4rem;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: 0.7rem;
          background: hsla(262, 83%, 58%, 0.04);
        }
        .coreList h4 {
          margin: 0 0 0.7rem;
          font-size: 0.95rem;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .chip {
          display: inline-flex;
          flex-direction: column;
          padding: 0.4rem 0.65rem;
          border: 1px solid var(--color-primary);
          border-radius: 0.5rem;
          background: white;
          color: var(--text-primary);
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
        }
        .chip:hover {
          background: hsla(262, 83%, 58%, 0.08);
        }
        .chip.diverge {
          border-color: hsl(38, 92%, 50%);
        }
        .chip small {
          font-size: 0.66rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        @media (max-width: 560px) {
          .matrixHead {
            flex-direction: column;
          }
          .legend {
            flex-direction: row;
          }
          .pointLabel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
