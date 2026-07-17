export type CompetencySkillRelation = "direct" | "adjacent";

export interface CompetencySkillMapping {
  skillIds: string[];
  relation: CompetencySkillRelation;
  note: string;
}

export interface CompetencyOutOfScope {
  majorCategory: string;
  reason: string;
}

export interface CompetencySkillMapData {
  version: string;
  note: string;
  source: string;
  coverage: {
    totalMinorCategories: number;
    mapped: number;
    outOfScope: number;
  };
  mappings: Record<string, CompetencySkillMapping>;
  outOfScope: Record<string, CompetencyOutOfScope>;
}

export interface CompetencySkillResolution {
  status: "mapped" | "out-of-scope" | "unknown";
  skillIds: string[];
  relation: CompetencySkillRelation | null;
  note: string;
  /** out-of-scope 인 경우의 사유(그 외 null) */
  reason: string | null;
}
