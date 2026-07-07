import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { resolveSkillCollege } from "../../../lib/college-resolver";
import { collegeColor, collegeIcon } from "../../../lib/college-ui";
import { getDomainName } from "../../../lib/robotics-data";
import {
  getAllRobotSkills,
  getCollegeMappingData,
  getCollegeSubcategoryData,
} from "../../../lib/server-data";

const COLLEGE_IDS = [
  "physical-ai",
  "agentic-ai",
  "data-intelligence",
  "digital-twin",
];

export function generateStaticParams() {
  return COLLEGE_IDS.map((collegeId) => ({ collegeId }));
}

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
  const college = collegeMapping.colleges.find(
    (item) => item.id === collegeId,
  );
  if (!college) {
    notFound();
  }

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
        </div>
      </header>

      {subcategories.map((subcategory) => {
        const subcategorySkills = collegeSkills
          .filter(
            (skill) =>
              subcategoryData.skillSubcategories[skill.skill_id] ===
              subcategory.id,
          )
          .sort((a, b) => a.skill_id.localeCompare(b.skill_id));
        return (
          <section className={styles.subcategorySection} key={subcategory.id}>
            <div className={styles.subcategoryHead}>
              <h2>{subcategory.name}</h2>
              <span>{subcategorySkills.length}개 스킬</span>
            </div>
            <ul className={styles.skillList}>
              {subcategorySkills.map((skill) => (
                <li key={skill.skill_id}>
                  <Link
                    className={styles.skillRow}
                    href={`/skills/${skill.skill_id}`}
                  >
                    <span className={styles.skillLabel}>
                      {skill.preferred_label_ko}
                    </span>
                    <span className={styles.skillMeta}>
                      {skill.skill_id} · Lv{skill.proficiency_level} ·{" "}
                      {getDomainName(skill.domain)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className={styles.footNote}>
        기능 도메인 표기는 세부 기준(참고 분류)입니다. 분류가 어색한 스킬은{" "}
        <Link href="/evaluation">평가 페이지</Link>에서 도메인 변경요청으로
        접수해 주세요.
      </p>
    </main>
  );
}
