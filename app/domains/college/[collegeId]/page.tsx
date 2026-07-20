import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { resolveSkillCollege } from "../../../lib/college-resolver";
import { collegeColor, collegeIcon } from "../../../lib/college-ui";
import { getDomainName } from "../../../lib/robotics-data";
import type { SkillPriority } from "../../../lib/college-types";
import {
  getAllRobotSkills,
  getCollegeMappingData,
  getCollegeSubcategoryData,
} from "../../../lib/server-data";

export const dynamic = "force-dynamic";

const PRIORITY_LABELS: Record<SkillPriority, string> = {
  core: "★ 핵심",
  foundation: "기초 역량",
  review: "재정의 검토",
};

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  const { collegeId } = await params;
  const [skills, collegeMapping, subcategoryData] = await Promise.all([
    getAllRobotSkills(),
    getCollegeMappingData(),
    getCollegeSubcategoryData(),
  ]);
  const college = collegeMapping.colleges.find((item) => item.id === collegeId);
  if (!college) {
    notFound();
  }

  const skillById = new Map(skills.map((skill) => [skill.skill_id, skill]));
  const collegeSkills = skills.filter(
    (skill) =>
      resolveSkillCollege(
        skill,
        collegeMapping.domainMapping,
        collegeMapping.skillOverrides,
      )?.primary === collegeId,
  );
  const subcategories = subcategoryData.subcategories
    .filter((subcategory) => subcategory.collegeId === collegeId)
    .sort((a, b) => a.order - b.order);

  const skillOrder = subcategoryData.skillOrder ?? {};
  const skillPriority = subcategoryData.skillPriority ?? {};
  const workflowLinks = subcategoryData.workflowLinks ?? {};
  const isWorkflow = (subcategoryData.workflowColleges ?? []).includes(
    collegeId,
  );

  return (
    <main className={styles.pageShell}>
      <Link href="/domains" className={styles.backLink}>
        ← 4대 도메인
      </Link>

      <header
        className={styles.heading}
        style={{ borderTopColor: collegeColor(collegeId) }}
      >
        <span className={styles.icon} aria-hidden="true">
          {collegeIcon(collegeId)}
        </span>
        <div>
          <p className={styles.eyebrow}>4대 도메인</p>
          <h1>{college.name}</h1>
          <p className={styles.role}>
            {college.role}
            {college.isHub && !college.role.includes("허브") ? " · 허브" : ""}
            {" · "}
            {collegeSkills.length}개 스킬 · 중간분류 {subcategories.length}개
          </p>
          {isWorkflow && (
            <p className={styles.workflowNote}>
              현장 업무 흐름 순서(①→⑦)로 배열했습니다. 스킬은 단계 내
              우선순위 순이며, ★핵심·기초 역량·재정의 검토를 표시합니다.
            </p>
          )}
        </div>
      </header>

      {subcategories.map((subcategory) => {
        const subcategorySkills = collegeSkills
          .filter(
            (skill) =>
              subcategoryData.skillSubcategories[skill.skill_id] ===
              subcategory.id,
          )
          .sort(
            (a, b) =>
              (skillOrder[a.skill_id] ?? 99) - (skillOrder[b.skill_id] ?? 99) ||
              a.skill_id.localeCompare(b.skill_id),
          );
        const links = workflowLinks[subcategory.id] ?? [];
        return (
          <section className={styles.subcategorySection} key={subcategory.id}>
            <div className={styles.subcategoryHead}>
              <h2>{subcategory.name}</h2>
              <span>{subcategorySkills.length}개 스킬</span>
            </div>
            <ul className={styles.skillList}>
              {subcategorySkills.map((skill) => {
                const priority = skillPriority[skill.skill_id];
                return (
                  <li key={skill.skill_id}>
                    <Link
                      className={
                        priority === "core"
                          ? `${styles.skillRow} ${styles.skillRowCore}`
                          : styles.skillRow
                      }
                      href={`/skills/${skill.skill_id}`}
                    >
                      <span className={styles.skillLabel}>
                        {skill.preferred_label_ko}
                        {priority && (
                          <span
                            className={`${styles.priority} ${styles[`priority_${priority}`]}`}
                          >
                            {PRIORITY_LABELS[priority]}
                          </span>
                        )}
                      </span>
                      <span className={styles.skillMeta}>
                        {skill.skill_id} · Lv{skill.proficiency_level} ·{" "}
                        {getDomainName(skill.domain)}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {links.map((link) => {
                const linkedSkill = skillById.get(link.skillId);
                const linkedCollege = linkedSkill
                  ? resolveSkillCollege(
                      linkedSkill,
                      collegeMapping.domainMapping,
                      collegeMapping.skillOverrides,
                    )?.primary
                  : null;
                const linkedCollegeName = collegeMapping.colleges.find(
                  (item) => item.id === linkedCollege,
                )?.name;
                return (
                  <li key={link.skillId}>
                    <Link
                      className={`${styles.skillRow} ${styles.skillRowLinked}`}
                      href={`/skills/${link.skillId}`}
                    >
                      <span className={styles.skillLabel}>
                        {linkedSkill?.preferred_label_ko ?? link.skillId}
                        <span className={styles.linkedBadge}>
                          연계 · {linkedCollegeName ?? "타 도메인"}
                        </span>
                      </span>
                      <span className={styles.skillMeta}>
                        {link.note ?? "타 도메인 연계 스킬"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className={styles.footNote}>
        기능 도메인 표기는 세부 기준(참고 분류)입니다. 분류·순서가 어색한
        스킬은 <Link href="/evaluation">평가 페이지</Link>에서 도메인
        변경요청으로 접수해 주세요.
      </p>
    </main>
  );
}
