import Link from "next/link";
import {
  getAllRobotSkills,
  getCollegeSubcategoryData,
} from "../../lib/server-data";
import {
  getActiveEvaluators,
  toPublicEvaluator,
} from "../../lib/evaluator-data";
import { getCurrentEvaluator } from "../../lib/session";
import { getClusterRatingStore } from "../../lib/cluster-rating-store";
import EvaluatorLogin from "../../components/EvaluatorLogin";
import ClusterWorkbench, {
  type ClusterSummary,
} from "../../components/ClusterWorkbench";
import styles from "../skills/page.module.css";

export const dynamic = "force-dynamic";

// RFM/VLA는 "고급보다 위" — 최신 동향으로 취급. 그 외는 skill_type 기반.
const TREND_SKILLS = new Set(["RSF-IRC-024", "RSF-IRC-025"]);
const LEVELS = ["초급", "중급", "고급", "동향"] as const;
const LEVEL_INDEX: Record<string, number> = {
  초급: 0,
  중급: 1,
  고급: 2,
  동향: 3,
};

function skillLevel(skillId: string, skillType: string): string {
  if (TREND_SKILLS.has(skillId)) return "동향";
  if (skillType === "knowledge") return "초급";
  if (skillType === "competence") return "고급";
  return "중급";
}

export default async function ClusterEvaluationPage() {
  const evaluator = await getCurrentEvaluator();

  if (!evaluator) {
    const evaluators = (await getActiveEvaluators()).map(toPublicEvaluator);
    return (
      <main className={styles.pageShell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>SKILL WORKBENCH · 클러스터 평가</p>
          <h1>스킬 평가 워크벤치 (클러스터)</h1>
          <p>
            Physical AI 통합 클러스터를 필요 역량으로 선별하고 중요도를 평가하는
            화면입니다. 사전 지정된 평가자만 접근할 수 있습니다.
          </p>
        </header>
        <EvaluatorLogin evaluators={evaluators} />
        <Link href="/evaluation/skills" className={styles.referenceLink}>
          개별 스킬 평가 화면으로 이동
        </Link>
      </main>
    );
  }

  const [skills, subcategoryData, ratings] = await Promise.all([
    getAllRobotSkills(),
    getCollegeSubcategoryData(),
    getClusterRatingStore().list(),
  ]);
  const skillById = new Map(skills.map((skill) => [skill.skill_id, skill]));
  const subName = new Map(
    subcategoryData.subcategories.map((sub) => [sub.id, sub.name]),
  );

  const clusters: ClusterSummary[] = (subcategoryData.skillClusters ?? [])
    .filter((cluster) => cluster.collegeId === "physical-ai")
    .map((cluster) => {
      const members = cluster.skillIds.map((skillId) => {
        const skill = skillById.get(skillId);
        return {
          skillId,
          label: skill?.preferred_label_ko ?? skillId,
          proficiency: skill?.proficiency_level ?? 0,
          description: skill?.description_ko ?? "",
        };
      });
      // 클러스터 대표 레벨 = 구성 스킬 레벨 최빈값(동률이면 낮은 레벨)
      const counts: Record<string, number> = {};
      for (const skillId of cluster.skillIds) {
        const skill = skillById.get(skillId);
        const lv = skillLevel(skillId, skill?.skill_type ?? "skill");
        counts[lv] = (counts[lv] ?? 0) + 1;
      }
      const maxN = Math.max(...Object.values(counts));
      const level = LEVELS.filter((lv) => counts[lv] === maxN).sort(
        (a, b) => LEVEL_INDEX[a] - LEVEL_INDEX[b],
      )[0];
      return {
        id: cluster.id,
        name: cluster.name,
        summary: cluster.summary,
        subcategoryId: cluster.subcategoryId,
        subcategoryName:
          subName.get(cluster.subcategoryId) ?? cluster.subcategoryId,
        level,
        members,
      };
    });

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>SKILL WORKBENCH · 클러스터 평가</p>
        <h1>스킬 평가 워크벤치 (클러스터)</h1>
        <p>
          Physical AI 통합 클러스터 {clusters.length}개를{" "}
          <b>필요 역량으로 선별</b>
          하고 중요도(1~5)·라벨로 평가합니다. 선택하지 않은 클러스터는 필요 역량
          항목에서 제외됩니다. 결과는 서버에 아카이빙됩니다.
        </p>
      </header>

      <ClusterWorkbench
        evaluator={toPublicEvaluator(evaluator)}
        clusters={clusters}
        initialRatings={ratings}
      />

      <Link href="/evaluation/skills" className={styles.referenceLink}>
        개별 스킬 평가 화면으로 이동
      </Link>
    </main>
  );
}
