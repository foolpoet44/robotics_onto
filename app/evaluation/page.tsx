import Link from "next/link";
import { resolveSkillCollege } from "../lib/college-resolver";
import {
  getAllRobotSkills,
  getCollegeMappingData,
  getCollegeSubcategoryData,
} from "../lib/server-data";
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
  const [
    skills,
    collegeMapping,
    subcategoryData,
    evaluator,
    changeRequests,
    domainRatings,
  ] = await Promise.all([
    getAllRobotSkills(),
    getCollegeMappingData(),
    getCollegeSubcategoryData(),
    getCurrentEvaluatorPublic(),
    getDomainChangeRequestStore().list(),
    getDomainRatingStore().list(),
  ]);

  // 칼리지별 구성(기능 도메인 × 스킬 수)은 서브 롤업의 가중치,
  // 중간분류별 스킬 목록은 하위 스킬 조회의 그룹이 된다.
  const compositionByCollege: Record<string, Record<string, number>> = {};
  const skillsBySubcategory: Record<string, BrowserSkill[]> = {};
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
    const subcategoryId = subcategoryData.skillSubcategories[skill.skill_id];
    if (subcategoryId) {
      (skillsBySubcategory[subcategoryId] ??= []).push({
        skillId: skill.skill_id,
        label: skill.preferred_label_ko,
        proficiency: skill.proficiency_level,
        collegeId: resolution?.primary ?? null,
        domain: skill.domain,
      });
    }
  });

  const collegeCards: CollegeCardData[] = [...collegeMapping.colleges]
    .sort((a, b) => a.order - b.order)
    .map((college) => {
      const composition = Object.entries(
        compositionByCollege[college.id] ?? {},
      )
        .map(([domainKey, count]) => ({ domainKey, count }))
        .sort((a, b) => b.count - a.count);
      const subcategories = subcategoryData.subcategories
        .filter((subcategory) => subcategory.collegeId === college.id)
        .sort((a, b) => a.order - b.order)
        .map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          skills: skillsBySubcategory[subcategory.id] ?? [],
        }));
      return {
        id: college.id,
        name: college.name,
        role: college.role,
        isHub: college.isHub,
        skillCount: composition.reduce((sum, entry) => sum + entry.count, 0),
        composition,
        subcategories,
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
          현장 운영 체계의 4대 도메인이 평가의 기준 축입니다. 도메인별 직접
          평가와 중간분류 단위의 하위 스킬 조회·도메인 변경요청을 제공합니다.
        </p>
      </header>

      <section className={styles.domainSection} aria-labelledby="domain-only-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>DOMAIN SCOPE</p>
          <h2 id="domain-only-title">4대 도메인 중요도 평가</h2>
          <p>
            각 카드는 중간분류 단위로 하위 스킬을 조회하고 스킬별 도메인
            변경요청을 접수할 수 있습니다. 세부 기준(기능 도메인) 평가는 서브
            페이지에서 진행하며 그 결과가 서브 롤업으로 집계됩니다.
          </p>
        </div>
        <DomainImportanceRating
          collegeCards={collegeCards}
          colleges={collegeSummaries}
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
        />
      </section>

      <Link href="/domains" className={styles.referenceLink}>
        전체 4대 도메인 탐색 화면으로 이동
      </Link>
    </main>
  );
}
