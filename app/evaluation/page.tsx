import Link from "next/link";
import { resolveSkillCollege } from "../lib/college-resolver";
import { getAllRobotSkills, getCollegeMappingData } from "../lib/server-data";
import { getCurrentEvaluatorPublic } from "../lib/session";
import { getDomainChangeRequestStore } from "../lib/domain-change-request-store";
import { getDomainRatingStore } from "../lib/domain-rating-store";
import DomainImportanceRating, {
  type CollegeCardData,
} from "../components/DomainImportanceRating";
import type { BrowserSkill } from "../components/DomainSkillBrowser";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function EvaluationPage() {
  const [skills, collegeMapping, evaluator, changeRequests, domainRatings] =
    await Promise.all([
      getAllRobotSkills(),
      getCollegeMappingData(),
      getCurrentEvaluatorPublic(),
      getDomainChangeRequestStore().list(),
      getDomainRatingStore().list(),
    ]);
  const counts = skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.domain] = (acc[skill.domain] ?? 0) + 1;
    return acc;
  }, {});

  // 칼리지별 구성(기능 도메인 × 스킬 수)은 서브 롤업의 가중치가 된다.
  const compositionByCollege: Record<string, Record<string, number>> = {};
  const skillsByDomain: Record<string, BrowserSkill[]> = {};
  skills.forEach((skill) => {
    const resolution = resolveSkillCollege(
      skill,
      collegeMapping.domainMapping,
      collegeMapping.skillOverrides,
    );
    if (resolution) {
      const byDomain = (compositionByCollege[resolution.primary] ??= {});
      byDomain[skill.domain] = (byDomain[skill.domain] ?? 0) + 1;
    }
    (skillsByDomain[skill.domain] ??= []).push({
      skillId: skill.skill_id,
      label: skill.preferred_label_ko,
      proficiency: skill.proficiency_level,
      collegeId: resolution?.primary ?? null,
    });
  });

  const collegeCards: CollegeCardData[] = [...collegeMapping.colleges]
    .sort((a, b) => a.order - b.order)
    .map((college) => {
      const composition = Object.entries(
        compositionByCollege[college.id] ?? {},
      )
        .map(([domainKey, count]) => ({ domainKey, count }))
        .sort((a, b) => b.count - a.count);
      return {
        id: college.id,
        name: college.name,
        role: college.role,
        isHub: college.isHub,
        skillCount: composition.reduce((sum, entry) => sum + entry.count, 0),
        composition,
      };
    });
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
          평가자가 로보틱스 온톨로지의 상위 도메인 구성을 검토하고, 4대 도메인
          (메인)과 기능 도메인(서브)의 스킬 중요도를 직접 평가할 수 있는 전용
          화면입니다.
        </p>
      </header>

      <section className={styles.domainSection} aria-labelledby="domain-only-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>DOMAIN SCOPE</p>
          <h2 id="domain-only-title">도메인 중요도 평가</h2>
          <p>
            메인은 4대 도메인 직접 평가이며, 서브(기능 도메인) 평가의 스킬 수
            가중 평균이 참고치로 함께 표시됩니다. 하위 스킬 조회를 열면 스킬별로
            도메인 변경요청을 접수할 수 있습니다(평가 저장·변경요청은 평가자
            로그인 필요).
          </p>
        </div>
        <DomainImportanceRating
          collegeCards={collegeCards}
          colleges={collegeSummaries}
          domainCounts={counts}
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
          initialRatings={domainRatings.map((rating) => ({
            id: rating.id,
            axis: rating.axis,
            targetKey: rating.targetKey,
            score: rating.score,
            notes: rating.notes,
            evaluatorName: rating.evaluatorName,
            createdAt: rating.createdAt,
          }))}
          sessionEvaluatorName={evaluator?.name ?? null}
          skillsByDomain={skillsByDomain}
        />
      </section>

      <Link href="/domains" className={styles.referenceLink}>
        전체 도메인 탐색 화면으로 이동
      </Link>
    </main>
  );
}
