export type CollegeId =
  | "physical-ai"
  | "data-intelligence"
  | "agentic-ai"
  | "digital-twin";

export type LevelTier = 1 | 2 | 3 | 4;

export interface College {
  id: CollegeId;
  name: string;
  nameKo: string;
  role: string;
  isHub: boolean;
  order: number;
}

export interface Level {
  id: string;
  collegeId: CollegeId;
  tier: LevelTier;
  name: string;
  certification: string;
  prerequisites: string[];
}

export interface CollegeDomainMapping {
  primary: CollegeId;
  secondary: CollegeId[];
  defaultLevelTier: LevelTier;
}

export interface CollegeSkillOverride {
  primary: CollegeId;
  secondary: CollegeId[];
  source: "proposed" | "reviewed";
}

export interface CollegeMappingData {
  colleges: College[];
  levels: Level[];
  domainMapping: Record<string, CollegeDomainMapping>;
  skillOverrides?: Record<string, CollegeSkillOverride>;
}

export interface CollegeSubcategory {
  id: string;
  collegeId: CollegeId;
  name: string;
  order: number;
}

export type SkillPriority = "core" | "foundation" | "review";

export interface WorkflowLink {
  skillId: string;
  note?: string;
}

export interface SkillCluster {
  id: string;
  collegeId: CollegeId;
  subcategoryId: string;
  name: string;
  summary: string;
  priority: SkillPriority;
  skillIds: string[];
}

export interface CollegeSubcategoryData {
  version: string;
  note?: string;
  subcategories: CollegeSubcategory[];
  skillSubcategories: Record<string, string>;
  skillOrder?: Record<string, number>;
  skillPriority?: Record<string, SkillPriority>;
  workflowLinks?: Record<string, WorkflowLink[]>;
  workflowColleges?: string[];
  skillClusters?: SkillCluster[];
}

export interface EnablerCollegeMeta {
  enablerId: string;
  collegeId: CollegeId;
  levelTier: LevelTier;
  secondaryColleges?: CollegeId[];
}

export interface LearningPath {
  id: string;
  personaName: string;
  steps: Array<{
    levelId: string;
    order: number;
    exemptible?: boolean;
  }>;
  targetTier: LevelTier;
}

export interface CollegeResolution {
  primary: CollegeId;
  secondary: CollegeId[];
  levelTier: LevelTier;
  levelId: string;
}
