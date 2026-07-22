import Link from "next/link";
import { getAllRobotSkills } from "../../lib/server-data";
import { getCurrentEvaluatorPublic } from "../../lib/session";
import { getDomainRatingStore } from "../../lib/domain-rating-store";
import FunctionalDomainRating from "../../components/FunctionalDomainRating";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function FunctionalEvaluationPage() {
  const [skills, evaluator, domainRatings] = await Promise.all([
    getAllRobotSkills(),
    getCurrentEvaluatorPublic(),
    getDomainRatingStore().list("functional"),
  ]);
  const counts = skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.domain] = (acc[skill.domain] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>SUB — 세부 기준(참고 분류)</p>
        <h1>기능 도메인 중요도 평가</h1>
        <p>
          스킬 내용을 기준으로 한 기능 도메인 평가 화면입니다. 현장 운영의
          기준 축은 <Link href="/evaluation">3대 도메인 평가</Link>이며, 이
          평가는 그 세부 근거(서브 롤업)로 활용됩니다.
        </p>
      </header>

      <FunctionalDomainRating
        domainCounts={counts}
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

      <Link href="/evaluation" className={styles.referenceLink}>
        ← 3대 도메인 평가로 돌아가기
      </Link>
    </main>
  );
}
