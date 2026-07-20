import Link from "next/link";
import {
  getAllRobotSkills,
  getCollegeMappingData,
  getCollegeSubcategoryData,
} from "../../lib/server-data";
import {
  getActiveEvaluators,
  toPublicEvaluator,
} from "../../lib/evaluator-data";
import { getCurrentEvaluator } from "../../lib/session";
import { getClusterReviewStore } from "../../lib/cluster-review-store";
import EvaluatorLogin from "../../components/EvaluatorLogin";
import ClusterReviewWorkbench, {
  type ClusterSummary,
} from "../../components/ClusterReviewWorkbench";
import styles from "../skills/page.module.css";

export const dynamic = "force-dynamic";

export default async function ClusterReviewPage() {
  const evaluator = await getCurrentEvaluator();

  if (!evaluator) {
    const evaluators = (await getActiveEvaluators()).map(toPublicEvaluator);
    return (
      <main className={styles.pageShell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>CLUSTER REVIEW</p>
          <h1>검증 클러스터 평가</h1>
          <p>
            Physical AI 스킬 간소화안(검증 클러스터)의 적절성을 판정하는
            화면입니다. 사전 지정된 평가자만 접근할 수 있습니다.
          </p>
        </header>
        <EvaluatorLogin evaluators={evaluators} />
        <Link
          href="/domains/college/physical-ai"
          className={styles.referenceLink}
        >
          Physical AI 도메인 화면 보기
        </Link>
      </main>
    );
  }

  const [skills, collegeMapping, subcategoryData, labels] = await Promise.all([
    getAllRobotSkills(),
    getCollegeMappingData(),
    getCollegeSubcategoryData(),
    getClusterReviewStore().list(),
  ]);
  const skillById = new Map(skills.map((skill) => [skill.skill_id, skill]));
  const subcategoryById = new Map(
    subcategoryData.subcategories.map((subcategory) => [
      subcategory.id,
      subcategory,
    ]),
  );
  const clusters: ClusterSummary[] = (subcategoryData.skillClusters ?? []).map(
    (cluster) => ({
      id: cluster.id,
      subcategoryId: cluster.subcategoryId,
      subcategoryName:
        subcategoryById.get(cluster.subcategoryId)?.name ??
        cluster.subcategoryId,
      name: cluster.name,
      summary: cluster.summary,
      priority: cluster.priority,
      members: cluster.skillIds.map((skillId) => {
        const skill = skillById.get(skillId);
        return {
          skillId,
          label: skill?.preferred_label_ko ?? skillId,
          proficiency: skill?.proficiency_level ?? 0,
        };
      }),
    }),
  );
  const collegeNames = new Map(
    collegeMapping.colleges.map((college) => [college.id, college.name]),
  );
  const clusterCollegeIds = [
    ...new Set(
      (subcategoryData.skillClusters ?? []).map((cluster) => cluster.collegeId),
    ),
  ];

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>CLUSTER REVIEW</p>
        <h1>검증 클러스터 평가</h1>
        <p>
          {clusterCollegeIds.map((id) => collegeNames.get(id) ?? id).join(", ")}{" "}
          도메인의 세부 스킬을 묶은 검증 클러스터 {clusters.length}개의 적절성을
          판정합니다. 결과는 서버에 아카이빙되어 온톨로지 통합 여부의 근거가
          됩니다.
        </p>
      </header>

      <ClusterReviewWorkbench
        evaluator={toPublicEvaluator(evaluator)}
        clusters={clusters}
        initialLabels={labels}
      />

      <Link
        href="/domains/college/physical-ai"
        className={styles.referenceLink}
      >
        Physical AI 도메인 화면 보기
      </Link>
    </main>
  );
}
