import Link from "next/link";
import EmptyState from "../components/EmptyState";
import { getOrganizationSummaries } from "../lib/server-data";
import styles from "./page.module.css";

export default async function OrganizationsPage() {
  const organizations = await getOrganizationSummaries();

  if (organizations.length === 0) {
    return (
      <main className={styles.pageShell}>
        <EmptyState message="표시할 조직이 없습니다." />
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>ORGANIZATION MAPPING</p>
        <h1>조직별 로보틱스 역량</h1>
        <p>조직의 핵심 과제와 필요한 로봇기술 스킬을 연결합니다.</p>
      </header>
      <div className={styles.organizationGrid}>
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/organizations/${organization.id}`}
            className={styles.organizationCard}
          >
            <span className={styles.organizationIcon}>🤖</span>
            <div>
              <h2>{organization.name}</h2>
              <p className={styles.organizationEn}>{organization.nameEn}</p>
            </div>
            <p className={styles.description}>{organization.description}</p>
            <div className={styles.stats}>
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
      <section className={styles.infoPanel}>
        <h2>조직 스킬 매칭이 필요한 이유</h2>
        <p>
          기술 목록만 보면 무엇부터 준비해야 하는지 판단하기 어렵습니다. 조직 탭은
          실제 과제를 중심으로 필요한 스킬과 목표 숙련도를 연결합니다.
        </p>
      </section>
    </main>
  );
}
