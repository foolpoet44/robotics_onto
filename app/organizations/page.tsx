"use client";

import Link from "next/link";

const organizations = [
  {
    id: "robot-solution",
    name: "로봇솔루션 Task",
    nameEn: "Robot Solution Task Force",
    description:
      "스마트 팩토리 현장에 즉시 적용 가능한 로봇기술 스택 기반 자동화 솔루션 제공",
    enablerCount: 3,
    skillCount: 29,
  },
];

export default function OrganizationsPage() {
  return (
    <main className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">ORGANIZATION MAPPING</p>
        <h1>조직별 로보틱스 역량</h1>
        <p>조직의 핵심 과제와 필요한 로봇기술 스킬을 연결합니다.</p>
      </header>
      <div className="organization-grid">
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/organizations/${organization.id}`}
            className="organization-card"
          >
            <span className="organization-icon">🤖</span>
            <div>
              <h2>{organization.name}</h2>
              <p className="organization-en">{organization.nameEn}</p>
            </div>
            <p className="description">{organization.description}</p>
            <div className="stats">
              <div>
                <strong>{organization.enablerCount}</strong>
                <span>Enablers</span>
              </div>
              <div>
                <strong>{organization.skillCount}</strong>
                <span>Skills</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <section className="info-panel">
        <h2>조직 스킬 매칭이 필요한 이유</h2>
        <p>
          기술 목록만 보면 무엇부터 준비해야 하는지 판단하기 어렵습니다. 조직 탭은
          실제 과제를 중심으로 필요한 스킬과 목표 숙련도를 연결합니다.
        </p>
      </section>
      <style jsx>{`
        .page-shell {
          max-width: 1100px;
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
        .organization-en,
        .description,
        .info-panel p {
          color: var(--text-secondary);
        }
        .organization-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .organization-card {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding: 1.6rem;
          color: var(--text-primary);
          text-decoration: none;
          background: white;
          border: 1px solid var(--border-color);
          border-top: 4px solid var(--color-primary);
          border-radius: 1rem;
          box-shadow: var(--shadow-sm);
          transition: 180ms ease;
        }
        .organization-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }
        .organization-icon {
          font-size: 3rem;
        }
        .organization-en {
          font-size: 0.88rem;
        }
        .description {
          flex: 1;
        }
        .stats {
          display: flex;
          gap: 1.6rem;
          padding-top: 0.85rem;
          border-top: 1px solid var(--border-color);
        }
        .stats div {
          display: flex;
          flex-direction: column;
        }
        .stats strong {
          color: var(--color-primary-dark);
          font-size: 1.7rem;
        }
        .stats span {
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .info-panel {
          margin-top: 2rem;
          padding: 1.4rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.8rem;
        }
        .info-panel h2 {
          margin-bottom: 0.45rem;
          font-size: 1.2rem;
        }
      `}</style>
    </main>
  );
}
