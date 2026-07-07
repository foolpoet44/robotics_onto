import Link from "next/link";
import styles from "../page.module.css";
import { ROBOT_DOMAINS } from "../../lib/robotics-data";
import { getAllRobotSkills } from "../../lib/server-data";

export default async function FunctionalDomainsPage() {
  const counts: Record<string, number> = {};
  const skills = await getAllRobotSkills();
  skills.forEach((skill) => {
    counts[skill.domain] = (counts[skill.domain] ?? 0) + 1;
  });

  return (
    <main className={styles.pageShell}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>SUB — 세부 기준(참고 분류)</p>
        <h1>기능 도메인</h1>
        <p>
          스킬 내용을 기준으로 정리한 기능 도메인입니다. 현장 운영의 기준
          축은 <Link href="/domains">4대 도메인</Link>이며, 기능 도메인은 세부
          탐색과 평가 근거를 위한 참고 분류로 유지됩니다.
        </p>
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

      <p className={styles.subPageLink}>
        <Link href="/domains">← 4대 도메인으로 돌아가기</Link>
      </p>
    </main>
  );
}
