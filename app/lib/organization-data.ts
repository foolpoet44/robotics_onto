import type { CollegeId, LevelTier } from "./college-types";

export interface OrganizationSkill {
  skill_id: string;
  internal_uri: string;
  esco_uri: string | null;
  label_ko: string;
  label_en: string;
  importance: number;
  target_proficiency: string;
  match_type: "exact" | "approximate" | "custom";
  ontology_skill_id: string | null;
  ontology_match_type: "exact" | "approximate" | "none";
  ontology_review_status?: "approved";
  notes?: string;
}

export interface Enabler {
  id: string;
  name: string;
  name_en: string;
  description: string;
  priority: number;
  collegeId?: CollegeId;
  levelTier?: LevelTier;
  skills: OrganizationSkill[];
}

export interface Organization {
  organization: {
    id: string;
    name: string;
    name_en: string;
    description: string;
    mission_detail?: string;
    challenges?: Array<{ title: string; items: string[] }>;
    value_propositions?: Array<{ title: string; description: string }>;
    expectations?: string[];
  };
  enablers: Enabler[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  enablerCount: number;
  skillCount: number;
}

export const ORGANIZATION_IDS = ["robot-solution"] as const;
