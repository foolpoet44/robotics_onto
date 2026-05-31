"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadOrganization, Organization } from "../../lib/organization-data";

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrganization(orgId).then(setOrganization).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "조직 로딩 실패");
    });
  }, [orgId]);

  if (error) {
    return <main className="page-shell">{error}</main>;
  }
  if (!organization) {
    return <main className="page-shell">조직 데이터 로딩 중...</main>;
  }

  const { organization: info, enablers } = organization;
  const totalSkills = enablers.reduce((sum, enabler) => sum + enabler.skills.length, 0);

  return (
    <main className="page-shell">
      <Link href="/organizations" className="back-link">
        ← 조직 목록
      </Link>
      <header className="organization-heading">
        <div>
          <p className="eyebrow">ROBOTICS ORGANIZATION</p>
          <h1>🤖 {info.name}</h1>
          <p>{info.name_en}</p>
          <p>{info.description}</p>
        </div>
        <div className="summary">
          <strong>{enablers.length}</strong>
          <span>Enablers</span>
          <strong>{totalSkills}</strong>
          <span>Mapped Skills</span>
        </div>
      </header>

      {info.mission_detail && (
        <section>
          <h2>조직 미션</h2>
          <div className="panel">
            <p>{info.mission_detail}</p>
          </div>
        </section>
      )}

      {info.challenges && (
        <section>
          <h2>주요 도전 과제</h2>
          <div className="challenge-grid">
            {info.challenges.map((challenge) => (
              <article className="panel" key={challenge.title}>
                <h3>{challenge.title}</h3>
                <ul>
                  {challenge.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Enablers와 필요 스킬</h2>
        <div className="enabler-list">
          {enablers.map((enabler) => (
            <article className="enabler-card" key={enabler.id}>
              <header>
                <div>
                  <p className="priority">PRIORITY {enabler.priority}</p>
                  <h3>{enabler.name}</h3>
                  <p>{enabler.name_en}</p>
                </div>
                <strong>{enabler.skills.length} Skills</strong>
              </header>
              <p className="description">{enabler.description}</p>
              <div className="skill-table">
                {enabler.skills.map((skill) => (
                  <div className="skill-row" key={skill.skill_id}>
                    <div>
                      <b>{skill.label_ko}</b>
                      <span>{skill.label_en}</span>
                    </div>
                    <span>중요도 {skill.importance}</span>
                    <span>{skill.target_proficiency}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
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
        .organization-heading,
        .panel,
        .enabler-card {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 0.9rem;
          box-shadow: var(--shadow-sm);
        }
        .organization-heading {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          padding: 1.6rem;
          margin-bottom: 2rem;
        }
        .organization-heading p,
        .panel p,
        .description,
        li,
        .enabler-card header p,
        .skill-row span {
          color: var(--text-secondary);
        }
        .eyebrow,
        .priority {
          color: var(--color-primary-dark) !important;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
        }
        h1 {
          margin: 0.3rem 0;
        }
        .summary {
          display: grid;
          grid-template-columns: auto auto;
          align-content: center;
          gap: 0.2rem 0.55rem;
          min-width: 150px;
        }
        .summary strong {
          color: var(--color-primary-dark);
          font-size: 1.5rem;
        }
        section {
          margin-bottom: 2rem;
        }
        section > h2 {
          margin-bottom: 0.8rem;
        }
        .panel {
          padding: 1.2rem;
        }
        .challenge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        ul {
          padding-left: 1.2rem;
          margin-top: 0.7rem;
        }
        .enabler-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .enabler-card {
          padding: 1.2rem;
        }
        .enabler-card header,
        .skill-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .enabler-card header strong {
          color: var(--color-primary-dark);
        }
        .description {
          margin: 0.85rem 0;
        }
        .skill-table {
          border-top: 1px solid var(--border-color);
        }
        .skill-row {
          align-items: center;
          padding: 0.7rem 0;
          border-bottom: 1px solid var(--border-color);
        }
        .skill-row div {
          display: flex;
          flex: 1;
          flex-direction: column;
        }
        .skill-row span {
          font-size: 0.82rem;
        }
        @media (max-width: 680px) {
          .organization-heading,
          .enabler-card header,
          .skill-row {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
