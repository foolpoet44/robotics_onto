import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DevelopmentStageStatus,
  getExpertArea,
  getNextStage,
  getStage,
} from "../../../../lib/development-data";
import {
  getAllRobotSkills,
  getDevelopmentCandidate,
  getDevelopmentCandidates,
  getDevelopmentTrack,
  getDevelopmentTrackIds,
} from "../../../../lib/server-data";
import styles from "./page.module.css";

const STATUS_LABELS: Record<DevelopmentStageStatus, string> = {
  pending: "대기",
  in_progress: "진행 중",
  completed: "완료",
  held: "보류",
};

const IMPACT_STATUS_LABELS = {
  draft: "초안",
  approved: "승인",
  delivered: "현장 적용",
};

export async function generateStaticParams() {
  const params = await Promise.all(
    getDevelopmentTrackIds().map(async (trackId) => {
      const candidates = await getDevelopmentCandidates(trackId);
      return candidates.map((candidate) => ({
        trackId,
        candidateId: candidate.candidate_id,
      }));
    }),
  );
  return params.flat();
}

export default async function CandidateDevelopmentPage({
  params,
}: {
  params: Promise<{ trackId: string; candidateId: string }>;
}) {
  const { trackId, candidateId } = await params;
  const [track, candidate, skills] = await Promise.all([
    getDevelopmentTrack(trackId),
    getDevelopmentCandidate(trackId, candidateId),
    getAllRobotSkills(),
  ]);
  if (!track || !candidate) {
    notFound();
  }

  const skillsById = new Map(skills.map((skill) => [skill.skill_id, skill]));
  const expertArea = getExpertArea(track, candidate.expert_area_profile_id);
  const currentStage = getStage(track, candidate.current_stage_id);
  const nextStage = getNextStage(track, candidate.current_stage_id);

  return (
    <main className={styles.pageShell}>
      <Link className={styles.backLink} href="/development-tracks">
        ← 육성 트랙
      </Link>
      <header className={styles.hero}>
        <div>
          <p>CANDIDATE DEVELOPMENT CARD</p>
          <h1>{candidate.display_name}</h1>
          <span>{candidate.candidate_id} · {track.cohort}</span>
        </div>
        <div className={styles.currentStage}>
          <small>현재 단계</small>
          <strong>{currentStage?.name}</strong>
          <span>{expertArea?.name}</span>
        </div>
      </header>

      <section className={styles.section}>
        <h2>단계별 육성 여정</h2>
        <div className={styles.journey}>
          {track.stages.map((stage) => {
            const history = candidate.stage_history.find(
              (item) => item.stage_id === stage.id,
            );
            const status = history?.status ?? "pending";
            return (
              <article className={styles[status]} key={stage.id}>
                <small>STAGE {String(stage.order).padStart(2, "0")}</small>
                <strong>{stage.name}</strong>
                <span>{STATUS_LABELS[status]}</span>
                {history?.notes && <p>{history.notes}</p>}
              </article>
            );
          })}
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.section}>
          <h2>핵심 스킬 갭</h2>
          <div className={styles.skillList}>
            {candidate.skill_assessments.map((assessment) => {
              const skill = skillsById.get(assessment.skill_id);
              return (
                <Link href={`/skills/${assessment.skill_id}`} key={assessment.skill_id}>
                  <div>
                    <strong>{skill?.preferred_label_ko ?? assessment.skill_id}</strong>
                    <span>{assessment.skill_id}</span>
                  </div>
                  <b>
                    Lv{assessment.current_level} → Lv{assessment.target_level}
                  </b>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h2>5개 직능 역량</h2>
          <div className={styles.axisList}>
            {track.competency_axes.map((axis) => {
              const score =
                candidate.competency_assessments.find(
                  (assessment) => assessment.axis_id === axis.id,
                )?.score ?? 0;
              return (
                <div key={axis.id}>
                  <span>{axis.name}</span>
                  <div><i style={{ width: `${(score / axis.scale_max) * 100}%` }} /></div>
                  <strong>{score}/{axis.scale_max}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.section}>
          <h2>1人1案 현장 임팩트 과제</h2>
          {candidate.impact_proposal ? (
            <article className={styles.proposal}>
              <span>{IMPACT_STATUS_LABELS[candidate.impact_proposal.status]}</span>
              <h3>{candidate.impact_proposal.title}</h3>
              <p>{candidate.impact_proposal.problem}</p>
              <strong>{candidate.impact_proposal.expected_impact}</strong>
            </article>
          ) : (
            <p className={styles.empty}>아직 등록된 현장 임팩트 과제가 없습니다.</p>
          )}
        </section>

        <section className={styles.section}>
          <h2>다음 단계 진입 조건</h2>
          {nextStage ? (
            <>
              <h3>{nextStage.name}</h3>
              <p className={styles.description}>{nextStage.description}</p>
              <ul>
                {nextStage.completion_evidence.map((evidence) => (
                  <li key={evidence}>{evidence}</li>
                ))}
              </ul>
              {nextStage.required_skill_ids.length > 0 && (
                <div className={styles.requirements}>
                  {nextStage.required_skill_ids.map((skillId) => (
                    <Link href={`/skills/${skillId}`} key={skillId}>
                      {skillsById.get(skillId)?.preferred_label_ko ?? skillId}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className={styles.empty}>최종 인증 단계에 도달했습니다.</p>
          )}
        </section>
      </div>
    </main>
  );
}
