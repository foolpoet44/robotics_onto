import Link from "next/link";
import { resolveSkillCollege } from "../lib/college-resolver";
import { getAllRobotSkills, getCollegeMappingData } from "../lib/server-data";
import { getCurrentEvaluatorPublic } from "../lib/session";
import { getDomainChangeRequestStore } from "../lib/domain-change-request-store";
import DomainImportanceRating from "../components/DomainImportanceRating";
import type { BrowserSkill } from "../components/DomainSkillBrowser";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function EvaluationPage() {
  const [skills, collegeMapping, evaluator, changeRequests] =
    await Promise.all([
      getAllRobotSkills(),
      getCollegeMappingData(),
      getCurrentEvaluatorPublic(),
      getDomainChangeRequestStore().list(),
    ]);
  const counts = skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.domain] = (acc[skill.domain] ?? 0) + 1;
    return acc;
  }, {});

  const collegeCounts: Record<string, number> = {};
  const skillsByDomain: Record<string, BrowserSkill[]> = {};
  skills.forEach((skill) => {
    const resolution = resolveSkillCollege(
      skill,
      collegeMapping.domainMapping,
      collegeMapping.skillOverrides,
    );
    if (resolution) {
      collegeCounts[resolution.primary] =
        (collegeCounts[resolution.primary] ?? 0) + 1;
    }
    (skillsByDomain[skill.domain] ??= []).push({
      skillId: skill.skill_id,
      label: skill.preferred_label_ko,
      proficiency: skill.proficiency_level,
      collegeId: resolution?.primary ?? null,
    });
  });
  const collegeCards = [...collegeMapping.colleges].sort(
    (a, b) => a.order - b.order,
  );
  const collegeSummaries = collegeCards.map((college) => ({
    id: college.id,
    name: college.name,
  }));

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
            스킬 중요도 평가 기능을 제공합니다. 하위 스킬 조회를 열면 스킬별로
            도메인 변경요청을 접수할 수 있습니다(평가자 로그인 필요).
          </p>
        </div>
        <DomainImportanceRating
          colleges={collegeSummaries}
          domainCounts={counts}
          sessionEvaluatorName={evaluator?.name ?? null}
          initialChangeRequests={changeRequests.map((request) => ({
            id: request.id,
            skillId: request.skillId,
            axis: request.axis,
            currentValue: request.currentValue,
            requestedValue: request.requestedValue,
            reason: request.reason,
            evaluatorName: request.evaluatorName,
            createdAt: request.createdAt,
          }))}
          skillsByDomain={skillsByDomain}
        />
      </section>

      <Link href="/domains" className={styles.referenceLink}>
        전체 도메인 탐색 화면으로 이동
      </Link>
    </main>
  );
}
