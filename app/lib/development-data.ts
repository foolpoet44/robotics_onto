export type DevelopmentStageId =
  | "potential_pool"
  | "early_selection"
  | "integrated_bootcamp"
  | "pair_embed"
  | "solo_embed"
  | "lv3_certification";

export type DevelopmentStageStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "held";

export interface ExpertAreaProfile {
  id: string;
  name: string;
  description: string;
  domain_keys: string[];
  core_skill_ids: string[];
  target_proficiency_level: 1 | 2 | 3 | 4;
}

export interface CompetencyAxis {
  id: string;
  name: string;
  description: string;
  scale_max: number;
}

export interface DevelopmentStage {
  id: DevelopmentStageId;
  order: number;
  name: string;
  description: string;
  target_headcount: number;
  completion_evidence: string[];
  required_skill_ids: string[];
}

export interface DevelopmentTrack {
  id: string;
  name: string;
  subtitle: string;
  cohort: string;
  organization_id: string;
  goal: string;
  expert_area_profiles: ExpertAreaProfile[];
  competency_axes: CompetencyAxis[];
  stages: DevelopmentStage[];
}

export interface CandidateDevelopmentRecord {
  candidate_id: string;
  display_name: string;
  track_id: string;
  expert_area_profile_id: string;
  current_stage_id: DevelopmentStageId;
  stage_history: Array<{
    stage_id: DevelopmentStageId;
    status: DevelopmentStageStatus;
    assessed_at?: string;
    reviewer?: string;
    notes?: string;
  }>;
  skill_assessments: Array<{
    skill_id: string;
    current_level: 1 | 2 | 3 | 4;
    target_level: 1 | 2 | 3 | 4;
  }>;
  competency_assessments: Array<{
    axis_id: string;
    score: number;
  }>;
  impact_proposal?: {
    title: string;
    problem: string;
    expected_impact: string;
    status: "draft" | "approved" | "delivered";
  };
}

export const DEVELOPMENT_TRACK_IDS = ["smartfactory-tech-leader"] as const;

export function getStage(
  track: DevelopmentTrack,
  stageId: DevelopmentStageId,
): DevelopmentStage | undefined {
  return track.stages.find((stage) => stage.id === stageId);
}

export function getExpertArea(
  track: DevelopmentTrack,
  areaId: string,
): ExpertAreaProfile | undefined {
  return track.expert_area_profiles.find((area) => area.id === areaId);
}

export function getNextStage(
  track: DevelopmentTrack,
  stageId: DevelopmentStageId,
): DevelopmentStage | undefined {
  const currentStage = getStage(track, stageId);
  if (!currentStage) return undefined;
  return track.stages.find((stage) => stage.order === currentStage.order + 1);
}
