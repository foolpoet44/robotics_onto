import type { CollegeId } from "./college-types";

export interface EmployeeCompetencySource {
  title: string;
  spreadsheetId: string;
  sheetName: string;
  importedAt: string;
  rowCount: number;
}

export interface EmployeeCompetencyAssessment {
  year: number;
  roundName: string;
}

export interface EmployeeCompetencyCollege {
  id: CollegeId;
  name: string;
  nameKo: string;
  order: number;
}

export interface EmployeeCompetencyItem {
  year: number;
  roundName: string;
  majorCategory: string;
  middleCategory: string;
  minorCategory: string;
  isCore: boolean;
  score: number;
  collegeId: CollegeId;
  collegeName: string;
  collegeNameKo: string;
}

export interface EmployeeCompetencyCollegeSummary {
  collegeId: CollegeId;
  collegeName: string;
  collegeNameKo: string;
  count: number;
  coreCount: number;
  averageScore: number;
  maxScore: number;
}

export interface EmployeeCompetencyRecord {
  employeeId: string;
  name: string;
  headquarters: string;
  division: string;
  team: string;
  position: string;
  job: string;
  competencyCount: number;
  coreCompetencyCount: number;
  averageScore: number;
  maxScore: number;
  primaryCollegeId: CollegeId;
  primaryCollegeName: string;
  primaryCollegeNameKo: string;
  byCollege: Record<CollegeId, EmployeeCompetencyCollegeSummary>;
  competencies: EmployeeCompetencyItem[];
}

export interface EmployeeCompetencyDataset {
  source: EmployeeCompetencySource;
  assessment: EmployeeCompetencyAssessment;
  colleges: EmployeeCompetencyCollege[];
  summary: {
    employeeCount: number;
    competencyCount: number;
    coreCompetencyCount: number;
    averageScore: number;
    byCollege: Record<CollegeId, EmployeeCompetencyCollegeSummary>;
    teams: string[];
  };
  employees: EmployeeCompetencyRecord[];
}
