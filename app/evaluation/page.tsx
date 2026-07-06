import Link from "next/link";
import { resolveSkillCollege } from "../lib/college-resolver";
import { getAllRobotSkills, getCollegeMappingData } from "../lib/server-data";
import DomainImportanceRating from "../components/DomainImportanceRating";
import styles from "./page.module.css";

export default async function EvaluationPage() {
  const [skills, collegeMapping] = await Promise.all([
    getAllRobotSkills(),
    getCollegeMappingData(),
  ]);
  const counts = skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.domain] = (acc[skill.domain] ?? 0) + 1;
    return acc;
  }, {});

  const collegeCounts = skills.reduce<Record<string, number>>((acc, skill) => {
    const resolution = resolveSkillCollege(
      skill,
      collegeMapping.domainMapping,
      collegeMapping.skillOverrides,
    );
    if (resolution) {
      acc[resolution.primary] = (acc[resolution.primary] ?? 0) + 1;
    }
    return acc;
  }, {});
  const collegeCards = [...collegeMapping.colleges].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>EVALUATION ONLY</p>
        <h1>도메인 분류 평가 페이지</h1>
        <p>
          평가자가 로보틱스 온톨로지의 상위 도메인 구성을 검토하고, 각 도메인의
          스킬 중요도를 직접 평가할 수 있는 전용 화면입니다.
        </p>
      </header>

      <section className={styles.collegeStrip} aria-label="4대 도메인 분포">
        {collegeCards.map((college) => (
          <div className={styles.collegeCard} key={college.id}>
            <strong>{college.name}</strong>
            <span>
              {college.role}
              {college.isHub ? " · 허브" : ""}
            </span>
            <span className={styles.collegeCount}>
              {collegeCounts[college.id] ?? 0}개 스킬
            </span>
          </div>
        ))}
      </section>

      <section className={styles.domainSection} aria-labelledby="domain-only-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>DOMAIN SCOPE</p>
          <h2 id="domain-only-title">평가 대상 도메인</h2>
          <p>
            각 카드는 도메인명, 영문명, 설명, 현재 매핑된 스킬 수와 함께 도메인별
            스킬 중요도 평가 기능을 제공합니다.
          </p>
        </div>
        <DomainImportanceRating domainCounts={counts} />
      </section>

      <Link href="/domains" className={styles.referenceLink}>
        전체 도메인 탐색 화면으로 이동
      </Link>
    </main>
  );
}
