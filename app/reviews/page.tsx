import Link from "next/link";
import { ReviewItem } from "../lib/review-data";
import { getReviewQueue } from "../lib/server-data";
import styles from "./page.module.css";

const RELATION_LABELS = {
  prerequisite: "선행 관계",
  co_required: "동반 관계",
  specialization: "특화 관계",
  cross_domain: "도메인 연결",
};

const BIDIRECTIONAL_RELATIONS = new Set(["co_required", "cross_domain"]);
const STATUS_LABELS = {
  pending: "검수 대기",
  approved: "승인",
  held: "보류",
  rejected: "반려",
};

function SkillLink({
  skill,
}: {
  skill: { skill_id: string; label_ko: string; domain: string };
}) {
  return (
    <Link href={`/skills/${skill.skill_id}`}>
      {skill.label_ko}
      <small>{skill.skill_id}</small>
    </Link>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  if (item.kind === "organization_mapping") {
    return (
      <article className={styles.reviewCard}>
        <header>
          <span className={styles.highPriority}>우선 검수</span>
          <span>조직 역량 매핑</span>
          <span className={styles[item.status]}>
            {STATUS_LABELS[item.status]}
          </span>
        </header>
        <h2>{item.organization_skill.label_ko}</h2>
        <p>
          {item.organization_name} · {item.enabler_name}
        </p>
        <div className={styles.mapping}>
          <strong>{item.organization_skill.skill_id}</strong>
          <span>→</span>
          <SkillLink skill={item.ontology_skill} />
        </div>
        <p className={styles.question}>
          두 역량을 같은 기준 스킬로 연결해도 되는지 확인해 주세요.
        </p>
        {item.decision && (
          <p className={styles.decision}>
            {item.decision.reviewer} · {item.decision.reviewed_at}
          </p>
        )}
      </article>
    );
  }

  return (
    <article className={styles.reviewCard}>
      <header>
        <span className={styles[item.priority]}>관계 후보</span>
        <span>{RELATION_LABELS[item.relation_type]}</span>
        <span className={styles[item.status]}>
          {STATUS_LABELS[item.status]}
        </span>
      </header>
      <div className={styles.mapping}>
        <SkillLink skill={item.source_skill} />
        <span>
          {BIDIRECTIONAL_RELATIONS.has(item.relation_type) ? "↔" : "→"}
        </span>
        <SkillLink skill={item.target_skill} />
      </div>
      <p className={styles.question}>
        현장 역량 관점에서 이 연결이 유효한지 확인해 주세요.
      </p>
      {item.decision && (
        <p className={styles.decision}>
          {item.decision.reviewer} · {item.decision.reviewed_at}
        </p>
      )}
    </article>
  );
}

export default async function ReviewsPage() {
  const queue = await getReviewQueue();
  const highPriorityItems = queue.items.filter(
    (item) => item.status === "pending" && item.priority === "high",
  );
  const normalItems = queue.items.filter(
    (item) => item.status === "pending" && item.priority === "normal",
  );
  const recordedItems = queue.items.filter((item) => item.status !== "pending");

  return (
    <main className={styles.pageShell}>
      <header className={styles.pageHeading}>
        <p>EXPERT REVIEW QUEUE</p>
        <h1>현장 전문가 검수 큐</h1>
        <span>
          자동 생성된 후보입니다. 연결을 확정하기 전에 HR·현장 전문가의 판단이
          필요합니다.
        </span>
      </header>

      <section className={styles.summaryGrid} aria-label="검수 큐 요약">
        <div>
          <strong>{queue.stats.total}</strong>
          <span>전체 후보</span>
        </div>
        <div>
          <strong>{queue.stats.organizationMappings}</strong>
          <span>조직 근사 매핑</span>
        </div>
        <div>
          <strong>{queue.stats.ontologyRelations}</strong>
          <span>온톨로지 관계</span>
        </div>
        <div>
          <strong>{queue.stats.statuses.pending}</strong>
          <span>검수 대기</span>
        </div>
        <div>
          <strong>{queue.stats.statuses.approved}</strong>
          <span>승인</span>
        </div>
        <div>
          <strong>{queue.stats.statuses.held}</strong>
          <span>보류</span>
        </div>
        <div>
          <strong>{queue.stats.statuses.rejected}</strong>
          <span>반려</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>우선 검수</h2>
        <p>근사 매핑과 도메인 간 연결처럼 판단 영향이 큰 후보입니다.</p>
        <div className={styles.reviewGrid}>
          {highPriorityItems.length === 0 ? (
            <p>우선 검수 대기 항목이 없습니다.</p>
          ) : (
            highPriorityItems.map((item) => (
              <ReviewCard item={item} key={item.id} />
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2>일반 검수</h2>
        <p>같은 도메인 안에서 자동 생성된 관계 후보입니다.</p>
        <div className={styles.reviewGrid}>
          {normalItems.map((item) => (
            <ReviewCard item={item} key={item.id} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>검수 기록</h2>
        <p>승인·보류·반려가 기록된 후보입니다.</p>
        <div className={styles.reviewGrid}>
          {recordedItems.length === 0 ? (
            <p>아직 기록된 검수 결과가 없습니다.</p>
          ) : (
            recordedItems.map((item) => (
              <ReviewCard item={item} key={item.id} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}
