"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CandidateDevelopmentRecord,
  DevelopmentTrack,
  getExpertArea,
  getStage,
} from "../lib/development-data";
import styles from "./DevelopmentCandidateDirectory.module.css";

export default function DevelopmentCandidateDirectory({
  candidates,
  track,
}: {
  candidates: CandidateDevelopmentRecord[];
  track: DevelopmentTrack;
}) {
  const [areaId, setAreaId] = useState("all");
  const [stageId, setStageId] = useState("all");
  const visibleCandidates = candidates.filter(
    (candidate) =>
      (areaId === "all" || candidate.expert_area_profile_id === areaId) &&
      (stageId === "all" || candidate.current_stage_id === stageId),
  );

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p>CANDIDATE DEVELOPMENT RECORDS</p>
          <h2>후보자 육성 현황</h2>
        </div>
        <strong>{visibleCandidates.length}명</strong>
      </div>
      <div className={styles.filters}>
        <label>
          전문 영역
          <select onChange={(event) => setAreaId(event.target.value)} value={areaId}>
            <option value="all">전체 영역</option>
            {track.expert_area_profiles.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          현재 단계
          <select onChange={(event) => setStageId(event.target.value)} value={stageId}>
            <option value="all">전체 단계</option>
            {track.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.grid}>
        {visibleCandidates.map((candidate) => {
          const stage = getStage(track, candidate.current_stage_id);
          const area = getExpertArea(track, candidate.expert_area_profile_id);
          const currentHistory = candidate.stage_history.find(
            (history) => history.stage_id === candidate.current_stage_id,
          );
          return (
            <Link
              className={styles.card}
              href={`/development-tracks/${track.id}/candidates/${candidate.candidate_id}`}
              key={candidate.candidate_id}
            >
              <span className={styles.area}>{area?.name}</span>
              <h3>{candidate.display_name}</h3>
              <p>{candidate.candidate_id}</p>
              <div>
                <strong>{stage?.name}</strong>
                <small className={styles[currentHistory?.status ?? "pending"]}>
                  {getStatusLabel(currentHistory?.status)}
                </small>
              </div>
            </Link>
          );
        })}
      </div>
      {visibleCandidates.length === 0 && (
        <p className={styles.empty}>선택한 조건에 해당하는 후보자가 없습니다.</p>
      )}
    </section>
  );
}

function getStatusLabel(status?: string) {
  return (
    {
      completed: "완료",
      in_progress: "진행 중",
      held: "보류",
      pending: "대기",
    }[status ?? "pending"] ?? status
  );
}
