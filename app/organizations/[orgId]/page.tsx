import Link from "next/link";
import { notFound } from "next/navigation";
import EmptyState from "../../components/EmptyState";
import {
  getAllRobotSkills,
  getDevelopmentTracksForOrganization,
  getOrganization,
  getOrganizationIds,
} from "../../lib/server-data";
import styles from "./page.module.css";

export function generateStaticParams() {
  return getOrganizationIds().map((orgId) => ({ orgId }));
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [organization, developmentTracks] = await Promise.all([
    getOrganization(orgId),
    getDevelopmentTracksForOrganization(orgId),
  ]);
  if (!organization) {
    notFound();
  }

  const { organization: info, enablers } = organization;
  const ontologySkills = await getAllRobotSkills();
  const ontologySkillReferences = Object.fromEntries(
    ontologySkills.map((skill) => [skill.skill_id, skill]),
  );
  const totalSkills = enablers.reduce(
    (sum, enabler) => sum + enabler.skills.length,
    0,
  );
  const mappedSkills = enablers.reduce(
    (sum, enabler) =>
      sum +
      enabler.skills.filter((skill) => skill.ontology_skill_id !== null).length,
    0,
  );

  return (
    <main className={styles.pageShell}>
      <Link href="/organizations" className={styles.backLink}>
        ← 조직 목록
      </Link>
      <header className={styles.organizationHeading}>
        <div>
          <p className={styles.eyebrow}>ROBOTICS ORGANIZATION</p>
          <h1>🤖 {info.name}</h1>
          <p>{info.name_en}</p>
          <p>{info.description}</p>
        </div>
        <div className={styles.summary}>
          <strong>{enablers.length}</strong>
          <span>Enablers</span>
          <strong>{totalSkills}</strong>
          <span>조직 역량</span>
          <strong>{mappedSkills}</strong>
          <span>기준 스킬 연결</span>
        </div>
      </header>

      {info.mission_detail && (
        <section className={styles.section}>
          <h2>조직 미션</h2>
          <div className={styles.panel}>
            <p>{info.mission_detail}</p>
          </div>
        </section>
      )}

      {info.challenges && (
        <section className={styles.section}>
          <h2>주요 도전 과제</h2>
          <div className={styles.challengeGrid}>
            {info.challenges.map((challenge) => (
              <article className={styles.panel} key={challenge.title}>
                <h3>{challenge.title}</h3>
                <ul>
                  {challenge.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {developmentTracks.length > 0 && (
        <section className={styles.section}>
          <h2>연관 육성 트랙</h2>
          <div className={styles.trackGrid}>
            {developmentTracks.map((track) => (
              <Link className={styles.trackCard} href="/development-tracks" key={track.id}>
                <span>{track.cohort}</span>
                <strong>{track.name}</strong>
                <p>{track.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2>Enablers와 필요 스킬</h2>
        {enablers.length === 0 ? (
          <EmptyState message="등록된 조직 역량이 없습니다." />
        ) : (
          <div className={styles.enablerList}>
            {enablers.map((enabler) => (
              <article className={styles.enablerCard} key={enabler.id}>
                <header>
                  <div>
                    <p className={styles.priority}>PRIORITY {enabler.priority}</p>
                    <h3>{enabler.name}</h3>
                    <p>{enabler.name_en}</p>
                  </div>
                  <strong>{enabler.skills.length} Skills</strong>
                </header>
                <p className={styles.description}>{enabler.description}</p>
                <div className={styles.skillTable}>
                  {enabler.skills.map((skill) => (
                    <div className={styles.skillRow} key={skill.skill_id}>
                      <div>
                        <b>{skill.label_ko}</b>
                        <span>{skill.label_en}</span>
                      </div>
                      <span>중요도 {skill.importance}</span>
                      <span>{skill.target_proficiency}</span>
                      {skill.ontology_skill_id ? (
                        <Link
                          className={styles.ontologyLink}
                          href={`/skills/${skill.ontology_skill_id}`}
                        >
                          기준 스킬:{" "}
                          {
                            ontologySkillReferences[skill.ontology_skill_id]
                              .preferred_label_ko
                          }
                        </Link>
                      ) : (
                        <span className={styles.unmapped}>조직 고유 역량</span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
