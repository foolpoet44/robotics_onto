import Link from "next/link";
import { resolveSkillCollege } from "../lib/college-resolver";
import {
  getAllRobotSkills,
  getCollegeMappingData,
  getCollegeSubcategoryData,
} from "../lib/server-data";
import { getCurrentEvaluatorPublic } from "../lib/session";
import { getDomainChangeRequestStore } from "../lib/domain-change-request-store";
import DomainSkillTreemap, {
  type TreemapCollege,
} from "../components/DomainSkillTreemap";
import type { BrowserSkill } from "../components/DomainSkillBrowser";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function EvaluationPage() {
  const [skills, collegeMapping, subcategoryData, evaluator, changeRequests] =
    await Promise.all([
      getAllRobotSkills(),
      getCollegeMappingData(),
      getCollegeSubcategoryData(),
      getCurrentEvaluatorPublic(),
      getDomainChangeRequestStore().list(),
    ]);

  const skillsBySubcategory: Record<string, BrowserSkill[]> = {};
  skills.forEach((skill) => {
    const resolution = resolveSkillCollege(
      skill,
      collegeMapping.domainMapping,
      collegeMapping.skillOverrides,
    );
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

  const collegeBlocks: TreemapCollege[] = [...collegeMapping.colleges]
    .sort((a, b) => a.order - b.order)
    .map((college) => {
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
        skillCount: subcategories.reduce(
          (sum, subcategory) => sum + subcategory.skills.length,
          0,
        ),
        subcategories,
      };
    });
  const collegeSummaries = collegeBlocks.map((college) => ({
    id: college.id,
    name: college.name,
  }));

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>EVALUATION ONLY</p>
        <h1>도메인 분류 평가 페이지</h1>
        <p>
          현장 운영 체계의 3대 도메인이 기준 축입니다. 트리맵으로 스킬 체계를
          한눈에 파악하고, 중간분류 단위로 하위 스킬을 조회하며 스킬별 도메인
          변경요청을 접수할 수 있습니다.
        </p>
      </header>

      <section className={styles.domainSection} aria-labelledby="domain-only-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>DOMAIN SCOPE</p>
          <h2 id="domain-only-title">스킬 체계 한눈에 보기</h2>
          <p>
            3대 도메인 → 중간분류 → 스킬의 3단 체계입니다. 변경요청 접수는
            평가자 로그인이 필요합니다(조회는 자유).
          </p>
        </div>
        <DomainSkillTreemap
          collegeBlocks={collegeBlocks}
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
          sessionEvaluatorName={evaluator?.name ?? null}
        />
      </section>

      <p className={styles.subLinks}>
        <Link href="/evaluation/functional">기능 도메인(세부 기준) 평가 →</Link>
        <Link href="/domains">전체 3대 도메인 탐색 화면으로 이동 →</Link>
      </p>
    </main>
  );
}
