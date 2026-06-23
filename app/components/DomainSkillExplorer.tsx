"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "./EmptyState";
import DomainEvaluationMode from "./DomainEvaluationMode";
import DomainRapidDeck from "./DomainRapidDeck";
import DomainPriorityMatrix from "./DomainPriorityMatrix";
import type { CollegeId } from "../lib/college-types";
import { resolveDefaultExpertDomain } from "../lib/skill-rating-store";
import { RelationType, RobotDomain, RobotSkill } from "../lib/robotics-data";

type ExplorerMode = "browse" | "evaluate" | "rapid" | "matrix";

const MODE_LABELS: { id: ExplorerMode; label: string }[] = [
  { id: "browse", label: "둘러보기" },
  { id: "evaluate", label: "평가 모드" },
  { id: "rapid", label: "빠른평가" },
  { id: "matrix", label: "매트릭스" },
];

interface SkillReference {
  domain: string;
  label: string;
}

interface DomainSkillExplorerProps {
  domain: RobotDomain;
  skills: RobotSkill[];
  skillReferences: Record<string, SkillReference>;
}

const RELATION_LABELS: Record<RelationType, string> = {
  prerequisite: "선행",
  co_required: "동반",
  specialization: "특화",
  cross_domain: "도메인 연결",
};

export default function DomainSkillExplorer({
  domain,
  skills,
  skillReferences,
}: DomainSkillExplorerProps) {
  const [query, setQuery] = useState("");
  // 둘러보기 / 평가(테이블) / 빠른평가(덱) / 매트릭스 4개 모드.
  const [mode, setMode] = useState<ExplorerMode>("browse");
  // 평가자 정보는 여기서 소유해 평가·빠른평가 모드가 공유한다(모드 전환 시 재입력 방지).
  const [expertName, setExpertName] = useState("");
  const [expertDomain, setExpertDomain] = useState<CollegeId>(
    resolveDefaultExpertDomain(domain.key),
  );

  const filtered = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) return skills;
    return skills.filter((skill) =>
      `${skill.preferred_label_ko} ${skill.preferred_label_en} ${skill.description_ko}`
        .toLowerCase()
        .includes(lowerQuery),
    );
  }, [query, skills]);

  return (
    <main className="page-shell">
      <Link href="/domains" className="back-link">
        ← 도메인 목록
      </Link>
      <header className="domain-heading" style={{ borderColor: domain.color }}>
        <span>{domain.icon}</span>
        <div>
          <h1>{domain.name}</h1>
          <p>{domain.nameEn}</p>
          <p>{domain.description}</p>
        </div>
        <div className="mode-toggle" role="group" aria-label="보기 모드">
          {MODE_LABELS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={mode === item.id ? "active" : ""}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      {mode === "evaluate" ? (
        <DomainEvaluationMode
          domain={domain}
          skills={skills}
          expertName={expertName}
          expertDomain={expertDomain}
          onExpertNameChange={setExpertName}
          onExpertDomainChange={setExpertDomain}
        />
      ) : mode === "rapid" ? (
        <DomainRapidDeck
          domain={domain}
          skills={skills}
          expertName={expertName}
          expertDomain={expertDomain}
          onExpertNameChange={setExpertName}
          onExpertDomainChange={setExpertDomain}
        />
      ) : mode === "matrix" ? (
        <DomainPriorityMatrix domain={domain} skills={skills} />
      ) : (
        <>
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이 도메인에서 스킬 검색..."
          />
          <p className="result-count">{filtered.length}개 스킬</p>
          {filtered.length === 0 ? (
            <EmptyState message="검색 조건에 맞는 스킬이 없습니다." />
          ) : (
            <div className="skill-grid">
              {filtered.map((skill) => (
                <article
                  className="skill-card"
                  id={skill.skill_id}
                  key={skill.skill_id}
                >
                  <div className="skill-header">
                    <h2>
                      <Link href={`/skills/${skill.skill_id}`}>
                        {skill.preferred_label_ko}
                      </Link>
                    </h2>
                    <span>{skill.skill_type}</span>
                  </div>
                  <p>{skill.description_ko}</p>
                  <div className="related-skills">
                    <strong>관련 스킬</strong>
                    <div>
                      {skill.related_skills.map((relation) => {
                        const reference = skillReferences[relation.target];
                        return (
                          <Link
                            href={`/skills/${relation.target}`}
                            className="relation-link"
                            key={`${relation.type}-${relation.target}`}
                          >
                            <span>{RELATION_LABELS[relation.type]}</span>
                            {reference?.label ?? relation.target}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <footer>
                    <span>LV{skill.proficiency_level}</span>
                    <span>{skill.skill_id}</span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <style jsx>{`
        .page-shell {
          max-width: 1280px;
          margin: 0 auto;
          padding: 2.5rem 1.25rem;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 1.25rem;
          color: var(--color-primary-dark);
          text-decoration: none;
          font-weight: 700;
        }
        .domain-heading {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.2rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border-left: 5px solid;
          border-radius: 0.8rem;
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
        }
        .domain-heading > span {
          font-size: 3.4rem;
        }
        .mode-toggle {
          display: inline-flex;
          margin-left: auto;
          align-self: flex-start;
          border: 1px solid var(--border-color);
          border-radius: 0.6rem;
          overflow: hidden;
          background: white;
        }
        .mode-toggle button {
          padding: 0.55rem 0.85rem;
          border: none;
          border-right: 1px solid var(--border-color);
          background: white;
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .mode-toggle button:last-child {
          border-right: none;
        }
        .mode-toggle button.active {
          background: var(--color-primary);
          color: white;
        }
        @media (max-width: 640px) {
          .mode-toggle {
            margin-left: 0;
            width: 100%;
          }
          .mode-toggle button {
            flex: 1;
          }
        }
        h1 {
          margin-bottom: 0.2rem;
        }
        .domain-heading p,
        .skill-card p,
        .result-count {
          color: var(--text-secondary);
        }
        .search-input {
          width: 100%;
          padding: 0.9rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: 0.7rem;
          background: white;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .result-count {
          margin: 1rem 0;
        }
        .skill-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        .skill-card {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          padding: 1.1rem;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 0.8rem;
        }
        .skill-header,
        footer {
          display: flex;
          justify-content: space-between;
          gap: 0.6rem;
        }
        h2 {
          font-size: 1.05rem;
        }
        h2 a {
          color: inherit;
          text-decoration: none;
        }
        h2 a:hover {
          color: var(--color-primary-dark);
        }
        .skill-header span,
        footer span {
          color: var(--color-primary-dark);
          font-size: 0.75rem;
          font-weight: 800;
        }
        .related-skills {
          padding-top: 0.7rem;
          border-top: 1px solid var(--border-color);
        }
        .related-skills > strong {
          display: block;
          margin-bottom: 0.45rem;
          font-size: 0.82rem;
        }
        .related-skills > div {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .relation-link {
          padding: 0.3rem 0.45rem;
          color: var(--text-secondary);
          font-size: 0.72rem;
          text-decoration: none;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.4rem;
        }
        .relation-link:hover {
          border-color: var(--color-primary);
        }
        .relation-link span {
          margin-right: 0.3rem;
          color: var(--color-primary-dark);
          font-weight: 800;
        }
        footer {
          margin-top: auto;
          padding-top: 0.7rem;
          border-top: 1px solid var(--border-color);
        }
      `}</style>
    </main>
  );
}
