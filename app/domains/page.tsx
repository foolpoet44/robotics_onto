import Link from "next/link";
import styles from "./page.module.css";
import { ROBOT_DOMAINS } from "../lib/robotics-data";
import { getAllRobotSkills } from "../lib/server-data";

export default async function DomainsPage() {
  const counts: Record<string, number> = {};
  const skills = await getAllRobotSkills();
  skills.forEach((skill) => {
    counts[skill.domain] = (counts[skill.domain] ?? 0) + 1;
  });

  return (
    <main className={styles.pageShell}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>ROBOTICS ONTOLOGY</p>
        <h1>Factory Robotics 도메인</h1>
        <p>현장 과업을 기준으로 정리한 6개 로보틱스 전문 영역입니다.</p>
      </header>
      <div className={styles.domainGrid}>
        {ROBOT_DOMAINS.map((domain) => (
          <Link
            href={`/domains/${domain.key}`}
            className={styles.domainCard}
            key={domain.key}
            style={{ borderTopColor: domain.color }}
          >
            <span className={styles.domainIcon}>{domain.icon}</span>
            <div>
              <h2>{domain.name}</h2>
              <p className={styles.domainEn}>{domain.nameEn}</p>
            </div>
            <p className={styles.domainDescription}>{domain.description}</p>
            <div className={styles.domainCount}>
              <strong>{counts[domain.key] ?? 0}</strong>
              <span>스킬</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
