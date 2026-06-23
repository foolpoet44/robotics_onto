import {
  CandidateDevelopmentRecord,
  DevelopmentTrack,
  getStage,
} from "../lib/development-data";
import DevelopmentCandidateDirectory from "./DevelopmentCandidateDirectory";
import styles from "./DevelopmentTrackDashboard.module.css";

export default function DevelopmentTrackDashboard({
  candidates,
  track,
}: {
  candidates: CandidateDevelopmentRecord[];
  track: DevelopmentTrack;
}) {
  const stageCounts = Object.fromEntries(
    track.stages.map((stage) => [
      stage.id,
      candidates.filter((candidate) => candidate.current_stage_id === stage.id)
        .length,
    ]),
  );
  const heldCount = candidates.filter((candidate) =>
    candidate.stage_history.some(
      (history) =>
        history.stage_id === candidate.current_stage_id &&
        history.status === "held",
    ),
  ).length;
  const areaCounts = Object.fromEntries(
    track.expert_area_profiles.map((area) => [
      area.id,
      candidates.filter(
        (candidate) => candidate.expert_area_profile_id === area.id,
      ).length,
    ]),
  );

  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p>SMART FACTORY · TECH EXPERT TRACK</p>
        <h1>{track.name}</h1>
        <span>{track.subtitle}</span>
      </header>

      <section className={styles.introGrid}>
        <div className={styles.funnelPanel}>
          <div className={styles.sectionHeading}>
            <h2>Lv3 Tech Leader 육성 퍼널</h2>
            <span>{track.cohort}</span>
          </div>
          <div className={styles.funnel}>
            {track.stages.map((stage, index) => (
              <article
                className={styles.funnelStage}
                key={stage.id}
                style={{ width: `${100 - index * 9}%` }}
              >
                <small>
                  {index === 0
                    ? "진입"
                    : `STAGE ${String(index).padStart(2, "0")}`}
                </small>
                <strong>{stage.name}</strong>
                <span>{stage.description}</span>
                <b>
                  {stage.target_headcount}
                  {index === 0 ? "+" : ""}명 목표
                </b>
              </article>
            ))}
          </div>
        </div>
        <aside className={styles.messagePanel}>
          <p>WHY · 핵심 메시지</p>
          <h2>{track.goal}</h2>
          <span>
            영역별 깊이 있는 기술과 현장 문제 해결력을 단계적으로 검증합니다.
            교육 이수보다 실제 PoC와 임팩트 과제를 증빙으로 사용합니다.
          </span>
          <div className={styles.messageStats}>
            <div>
              <strong>30</strong>
              <span>명 Lv3 Tech Leader Pool</span>
            </div>
            <div>
              <strong>{track.expert_area_profiles.length}</strong>
              <span>개 기술 전문 영역</span>
            </div>
            <div>
              <strong>{track.competency_axes.length}</strong>
              <span>개 직능 역량</span>
            </div>
            <div>
              <strong>1人1案</strong>
              <span>현장 임팩트 단위</span>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.summaryGrid}>
        <div>
          <strong>{candidates.length}</strong>
          <span>샘플 후보자</span>
        </div>
        <div>
          <strong>{stageCounts.lv3_certification ?? 0}</strong>
          <span>인증 완료</span>
        </div>
        <div>
          <strong>{heldCount}</strong>
          <span>현재 보류</span>
        </div>
        <div>
          <strong>{getAverageCompetency(candidates)}</strong>
          <span>평균 직능 역량</span>
        </div>
      </section>

      <section className={styles.areaSection}>
        <h2>4개 기술 영역</h2>
        <div className={styles.areaGrid}>
          {track.expert_area_profiles.map((area, index) => (
            <article key={area.id}>
              <small>
                DOMAIN {String(index + 1).padStart(2, "0")}
                {area.id === "data-intelligence" ? " · HUB" : ""}
              </small>
              <strong>{area.name}</strong>
              <p>{area.description}</p>
              <span>
                {areaCounts[area.id]}명 · 목표 Lv{area.target_proficiency_level}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.axisSection}>
        <h2>5개 직능 역량 프로필</h2>
        <div className={styles.axisGrid}>
          {track.competency_axes.map((axis) => (
            <article key={axis.id}>
              <strong>{axis.name}</strong>
              <span>
                {getAverageAxisScore(candidates, axis.id)} / {axis.scale_max}
              </span>
              <p>{axis.description}</p>
            </article>
          ))}
        </div>
      </section>

      <DevelopmentCandidateDirectory candidates={candidates} track={track} />
    </main>
  );
}

function getAverageCompetency(candidates: CandidateDevelopmentRecord[]) {
  const scores = candidates.flatMap((candidate) =>
    candidate.competency_assessments.map((assessment) => assessment.score),
  );
  return scores.length
    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
    : "0.0";
}

function getAverageAxisScore(
  candidates: CandidateDevelopmentRecord[],
  axisId: string,
) {
  const scores = candidates.flatMap((candidate) => {
    const assessment = candidate.competency_assessments.find(
      (item) => item.axis_id === axisId,
    );
    return assessment ? [assessment.score] : [];
  });
  return scores.length
    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
    : "0.0";
}
