import Link from "next/link";
import { ROBOT_DOMAINS } from "../lib/robotics-data";
import { getAllRobotSkills } from "../lib/server-data";
import styles from "./page.module.css";

const evaluationChecks = [
  {
    label: "도메인만 표시",
    status: "적합",
    detail:
      "스킬, 조직, 역량, 육성, 검수 정보는 제외하고 6개 도메인 요약만 노출합니다.",
  },
  {
    label: "평가 목적 명확성",
    status: "적합",
    detail:
      "상단 안내와 검증 기준을 통해 도메인 분류 적합성 평가용 페이지임을 명시합니다.",
  },
  {
    label: "데이터 완전성 확인",
    status: "보완 필요",
    detail:
      "도메인별 스킬 수는 자동 집계하지만, 평가자 코멘트 입력/저장 기능은 아직 제공하지 않습니다.",
  },
];

const improvements = [
  "평가자가 도메인별 적합/부적합 의견을 남길 수 있는 입력 폼 추가",
  "도메인별 대표 스킬 예시를 토글 방식으로 선택 노출해 평가 근거 강화",
  "평가 결과를 review-decisions 데이터와 연계해 후속 보완 이력 관리",
];

export default async function EvaluationPage() {
  const skills = await getAllRobotSkills();
  const counts = skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.domain] = (acc[skill.domain] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>EVALUATION ONLY</p>
        <h1>도메인 분류 평가 페이지</h1>
        <p>
          평가자가 로보틱스 온톨로지의 상위 도메인 구성만 검토할 수 있도록 스킬
          상세와 부가 운영 메뉴를 제외한 전용 화면입니다.
        </p>
      </header>

      <section
        className={styles.domainSection}
        aria-labelledby="domain-only-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>DOMAIN SCOPE</p>
          <h2 id="domain-only-title">평가 대상 도메인</h2>
          <p>
            각 카드는 도메인명, 영문명, 설명, 현재 매핑된 스킬 수만 표시합니다.
          </p>
        </div>
        <div className={styles.domainGrid}>
          {ROBOT_DOMAINS.map((domain) => (
            <article
              className={styles.domainCard}
              key={domain.key}
              style={{ borderTopColor: domain.color }}
            >
              <span className={styles.domainIcon} aria-hidden="true">
                {domain.icon}
              </span>
              <div>
                <h3>{domain.name}</h3>
                <p className={styles.domainEn}>{domain.nameEn}</p>
              </div>
              <p className={styles.domainDescription}>{domain.description}</p>
              <dl className={styles.domainMeta}>
                <div>
                  <dt>도메인 키</dt>
                  <dd>{domain.key}</dd>
                </div>
                <div>
                  <dt>스킬 수</dt>
                  <dd>{counts[domain.key] ?? 0}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.reportSection}
        aria-labelledby="evaluation-report-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>VALIDATION REPORT</p>
          <h2 id="evaluation-report-title">평가 목적 적합성 검증</h2>
        </div>
        <div className={styles.checkGrid}>
          {evaluationChecks.map((check) => (
            <article className={styles.checkCard} key={check.label}>
              <span
                className={
                  check.status === "적합"
                    ? styles.statusPass
                    : styles.statusNeedsWork
                }
              >
                {check.status}
              </span>
              <h3>{check.label}</h3>
              <p>{check.detail}</p>
            </article>
          ))}
        </div>
        <div className={styles.improvementBox}>
          <h3>보완사항</h3>
          <ul>
            {improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <Link href="/domains" className={styles.referenceLink}>
          전체 도메인 탐색 화면으로 이동
        </Link>
      </section>
    </main>
  );
}
