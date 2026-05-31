"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDomain, loadRobotSkills, RobotSkill } from "../../lib/robotics-data";

export default function DomainDetailPage() {
  const params = useParams();
  const domainKey = params.domain as string;
  const domain = getDomain(domainKey);
  const [skills, setSkills] = useState<RobotSkill[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadRobotSkills().then((items) =>
      setSkills(items.filter((skill) => skill.domain === domainKey)),
    );
  }, [domainKey]);

  const filtered = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) return skills;
    return skills.filter((skill) =>
      `${skill.preferred_label_ko} ${skill.preferred_label_en} ${skill.description_ko}`
        .toLowerCase()
        .includes(lowerQuery),
    );
  }, [query, skills]);

  if (!domain) {
    return <main className="page-shell">도메인을 찾을 수 없습니다.</main>;
  }

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
      </header>
      <input
        className="search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="이 도메인에서 스킬 검색..."
      />
      <p className="result-count">{filtered.length}개 스킬</p>
      <div className="skill-grid">
        {filtered.map((skill) => (
          <article className="skill-card" key={skill.skill_id}>
            <div className="skill-header">
              <h2>{skill.preferred_label_ko}</h2>
              <span>{skill.skill_type}</span>
            </div>
            <p>{skill.description_ko}</p>
            <footer>
              <span>LV{skill.proficiency_level}</span>
              <span>{skill.skill_id}</span>
            </footer>
          </article>
        ))}
      </div>
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
        .skill-header span,
        footer span {
          color: var(--color-primary-dark);
          font-size: 0.75rem;
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
