import Link from "next/link";
import { notFound } from "next/navigation";
import SkillImportanceRating from "../../components/SkillImportanceRating";
import { getDomainName } from "../../lib/robotics-data";
import { getAllRobotSkills, getRobotSkill } from "../../lib/server-data";
import styles from "./page.module.css";

const ROLE_LABELS = {
  operator: "조작자",
  engineer: "엔지니어",
  developer: "개발자",
};

const TYPE_LABELS = {
  knowledge: "지식",
  skill: "기술",
  competence: "역량",
};

const PROFICIENCY_LABELS = {
  1: "기초",
  2: "중급",
  3: "고급",
  4: "전문가",
};

const RELATION_LABELS = {
  prerequisite: "선행",
  co_required: "동반",
  specialization: "특화",
  cross_domain: "도메인 연결",
};

export async function generateStaticParams() {
  const skills = await getAllRobotSkills();
  return skills.map((skill) => ({ skillId: skill.skill_id }));
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  const [skill, allSkills] = await Promise.all([
    getRobotSkill(skillId),
    getAllRobotSkills(),
  ]);
  if (!skill) {
    notFound();
  }

  const skillsById = new Map(allSkills.map((item) => [item.skill_id, item]));
  const parentSkill = skill.parent_skill_id
    ? skillsById.get(skill.parent_skill_id)
    : null;

  return (
    <main className={styles.pageShell}>
      <Link href={`/domains/${skill.domain}`} className={styles.backLink}>
        ← {getDomainName(skill.domain)}
      </Link>

      <header className={styles.heading}>
        <p className={styles.eyebrow}>ROBOTICS SKILL DEFINITION</p>
        <h1>{skill.preferred_label_ko}</h1>
        <p className={styles.englishLabel}>{skill.preferred_label_en}</p>
        <div className={styles.tags}>
          <span>{skill.skill_id}</span>
          <span>{getDomainName(skill.domain)}</span>
          <span>{TYPE_LABELS[skill.skill_type]}</span>
          <span>
            LV{skill.proficiency_level} ·{" "}
            {PROFICIENCY_LABELS[skill.proficiency_level]}
          </span>
        </div>
      </header>

      <section className={styles.definitionGrid}>
        <article className={styles.panel}>
          <h2>스킬 정의</h2>
          <p>{skill.description_ko}</p>
          <p className={styles.englishText}>{skill.description_en}</p>
        </article>
        <article className={styles.panel}>
          <h2>스마트팩토리 적용 맥락</h2>
          <p>{skill.smartfactory_context}</p>
        </article>
      </section>

      <section className={styles.panel}>
        <h2>역할과 분류</h2>
        <dl className={styles.definitionList}>
          <div>
            <dt>필요 역할</dt>
            <dd>
              {skill.role_mapping.map((role) => ROLE_LABELS[role]).join(", ")}
            </dd>
          </div>
          <div>
            <dt>내부 식별자</dt>
            <dd>{skill.internal_uri}</dd>
          </div>
          <div>
            <dt>ESCO 출처</dt>
            <dd>{skill.esco_uri ?? "검증된 ESCO 연결 없음"}</dd>
          </div>
          <div>
            <dt>상위 스킬</dt>
            <dd>
              {parentSkill ? (
                <Link href={`/skills/${parentSkill.skill_id}`}>
                  {parentSkill.preferred_label_ko}
                </Link>
              ) : (
                "최상위 스킬"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <SkillImportanceRating
        defaultDomain={skill.domain}
        skillId={skill.skill_id}
      />

      <section className={styles.panel}>
        <h2>관련 스킬</h2>
        <div className={styles.relatedGrid}>
          {skill.related_skills.map((relation) => {
            const relatedSkill = skillsById.get(relation.target);
            return (
              <Link
                href={`/skills/${relation.target}`}
                className={styles.relatedCard}
                key={`${relation.type}-${relation.target}`}
              >
                <span>{RELATION_LABELS[relation.type]}</span>
                <strong>
                  {relatedSkill?.preferred_label_ko ?? relation.target}
                </strong>
                <small>
                  {relation.target} ·{" "}
                  {relation.source === "reviewed" ? "전문가 승인" : "검수 대기"}
                </small>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
