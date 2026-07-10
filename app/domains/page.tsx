import Link from "next/link";
import styles from "./page.module.css";
import { resolveSkillCollege } from "../lib/college-resolver";
import { collegeColor, collegeIcon } from "../lib/college-ui";
import {
  getAllRobotSkills,
  getCollegeMappingData,
  getCollegeSubcategoryData,
} from "../lib/server-data";

export default async function DomainsPage() {
  const [skills, collegeMapping, subcategoryData] = await Promise.all([
    getAllRobotSkills(),
    getCollegeMappingData(),
    getCollegeSubcategoryData(),
  ]);

  const countBySubcategory: Record<string, number> = {};
  const countByCollege: Record<string, number> = {};
  skills.forEach((skill) => {
    const resolution = resolveSkillCollege(
      skill,
      collegeMapping.domainMapping,
      collegeMapping.skillOverrides,
    );
    if (resolution) {
      countByCollege[resolution.primary] =
        (countByCollege[resolution.primary] ?? 0) + 1;
    }
    const subcategoryId = subcategoryData.skillSubcategories[skill.skill_id];
    if (subcategoryId) {
      countBySubcategory[subcategoryId] =
        (countBySubcategory[subcategoryId] ?? 0) + 1;
    }
  });

  const colleges = [...collegeMapping.colleges].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <main className={styles.pageShell}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>ROBOTICS ONTOLOGY</p>
        <h1>4대 도메인</h1>
        <p>
          현장 운영 체계의 4대 도메인입니다. 모든 스킬은 4대 도메인과 그 아래
          중간분류에 배정됩니다.
        </p>
      </header>
      <div className={styles.collegeGrid}>
        {colleges.map((college) => {
          const subcategories = subcategoryData.subcategories
            .filter((subcategory) => subcategory.collegeId === college.id)
            .sort((a, b) => a.order - b.order);
          return (
            <Link
              href={`/domains/college/${college.id}`}
              className={styles.domainCard}
              key={college.id}
              style={{ borderTopColor: collegeColor(college.id) }}
            >
              <span className={styles.domainIcon}>
                {collegeIcon(college.id)}
              </span>
              <div>
                <h2>{college.name}</h2>
                <p className={styles.domainEn}>
                  {college.role}
                  {college.isHub && !college.role.includes("허브")
                    ? " · 허브"
                    : ""}
                </p>
              </div>
              <ul className={styles.subcategoryList}>
                {subcategories.map((subcategory) => (
                  <li key={subcategory.id}>
                    {subcategory.name}
                    <span>{countBySubcategory[subcategory.id] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.domainCount}>
                <strong>{countByCollege[college.id] ?? 0}</strong>
                <span>스킬</span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className={styles.subPageLink}>
        세부 기준(참고 분류)인 기능 도메인은{" "}
        <Link href="/domains/functional">기능 도메인 서브 페이지</Link>에서
        확인합니다.
      </p>
    </main>
  );
}
