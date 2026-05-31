"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadRobotSkills, ROBOT_DOMAINS } from "../lib/robotics-data";

export default function DomainsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRobotSkills()
      .then((skills) => {
        const nextCounts: Record<string, number> = {};
        skills.forEach((skill) => {
          nextCounts[skill.domain] = (nextCounts[skill.domain] ?? 0) + 1;
        });
        setCounts(nextCounts);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">ROBOTICS ONTOLOGY</p>
        <h1>Factory Robotics 도메인</h1>
        <p>현장 과업을 기준으로 정리한 6개 로보틱스 전문 영역입니다.</p>
      </header>
      <div className="domain-grid">
        {ROBOT_DOMAINS.map((domain) => (
          <Link
            href={`/domains/${domain.key}`}
            className="domain-card"
            key={domain.key}
            style={{ borderTopColor: domain.color }}
          >
            <span className="domain-icon">{domain.icon}</span>
            <div>
              <h2>{domain.name}</h2>
              <p className="domain-en">{domain.nameEn}</p>
            </div>
            <p className="domain-description">{domain.description}</p>
            <div className="domain-count">
              <strong>{loading ? "-" : counts[domain.key] ?? 0}</strong>
              <span>스킬</span>
            </div>
          </Link>
        ))}
      </div>
      <style jsx>{`
        .page-shell {
          max-width: 1280px;
          margin: 0 auto;
          padding: 3.5rem 1.25rem;
        }
        .page-heading {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .eyebrow {
          color: var(--color-primary-dark);
          font-weight: 800;
          letter-spacing: 0.14em;
          font-size: 0.75rem;
        }
        h1 {
          margin: 0.45rem 0;
          font-size: clamp(2rem, 5vw, 3rem);
        }
        .page-heading > p:last-child,
        .domain-description,
        .domain-en {
          color: var(--text-secondary);
        }
        .domain-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .domain-card {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          min-height: 260px;
          padding: 1.5rem;
          color: var(--text-primary);
          text-decoration: none;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-top: 4px solid;
          border-radius: 1rem;
          box-shadow: var(--shadow-sm);
          transition: 180ms ease;
        }
        .domain-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }
        .domain-icon {
          font-size: 2.5rem;
        }
        h2 {
          font-size: 1.25rem;
        }
        .domain-en {
          font-size: 0.85rem;
        }
        .domain-description {
          flex: 1;
        }
        .domain-count {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          padding-top: 0.8rem;
          border-top: 1px solid var(--border-color);
        }
        .domain-count strong {
          font-size: 1.8rem;
          color: var(--color-primary-dark);
        }
      `}</style>
    </main>
  );
}
