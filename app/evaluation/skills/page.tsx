import Link from "next/link";
import { ROBOT_DOMAINS } from "../../lib/robotics-data";
import { getAllRobotSkills } from "../../lib/server-data";
import { getActiveEvaluators, toPublicEvaluator } from "../../lib/evaluator-data";
import { getCurrentEvaluator } from "../../lib/session";
import { getEvaluationStore } from "../../lib/evaluation-store";
import EvaluatorLogin from "../../components/EvaluatorLogin";
import SkillEvaluationWorkbench, {
  type SkillSummary,
} from "../../components/SkillEvaluationWorkbench";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function SkillEvaluationPage() {
  const evaluator = await getCurrentEvaluator();

  if (!evaluator) {
    const evaluators = (await getActiveEvaluators()).map(toPublicEvaluator);
    return (
      <main className={styles.pageShell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>SKILL EVALUATION</p>
          <h1>스킬 평가 워크벤치</h1>
          <p>
            사전 지정된 평가자만 접근할 수 있습니다. 평가자와 접속 코드로
            로그인하면 신원이 자동 적용되어 별도 입력 없이 평가가 기록됩니다.
          </p>
        </header>
        <EvaluatorLogin evaluators={evaluators} />
        <Link href="/evaluation" className={styles.referenceLink}>
          도메인 평가 화면으로 이동
        </Link>
      </main>
    );
  }

  const skills = await getAllRobotSkills();
  const skillSummaries: SkillSummary[] = skills.map((skill) => ({
    skillId: skill.skill_id,
    domain: skill.domain,
    label: skill.preferred_label_ko,
    proficiency: skill.proficiency_level,
    roles: skill.role_mapping,
  }));
  const labels = await getEvaluationStore().list();

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>SKILL EVALUATION</p>
        <h1>스킬 평가 워크벤치</h1>
        <p>
          도메인/역할로 스킬을 추려 한 건씩 중요도와 라벨을 부여합니다. 평가자
          신원은 로그인 세션에서 자동 적용되며, 결과는 서버에 아카이빙됩니다.
        </p>
      </header>

      <SkillEvaluationWorkbench
        evaluator={toPublicEvaluator(evaluator)}
        skills={skillSummaries}
        domains={ROBOT_DOMAINS.map((domain) => ({
          key: domain.key,
          name: domain.name,
          color: domain.color,
        }))}
        initialLabels={labels}
      />

      <Link href="/evaluation" className={styles.referenceLink}>
        도메인 평가 화면으로 이동
      </Link>
    </main>
  );
}
