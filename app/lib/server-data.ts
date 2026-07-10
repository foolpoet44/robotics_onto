import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ORGANIZATION_IDS,
  Organization,
  OrganizationSummary,
} from "./organization-data";
import {
  CandidateDevelopmentRecord,
  DEVELOPMENT_TRACK_IDS,
  DevelopmentTrack,
} from "./development-data";
import { EmployeeCompetencyDataset } from "./employee-competency-data";
import { RobotSkill } from "./robotics-data";
import { ReviewQueue } from "./review-data";
import { CollegeMappingData, CollegeSubcategoryData } from "./college-types";

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.join(process.cwd(), "public", "data", relativePath);
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export async function getAllRobotSkills(): Promise<RobotSkill[]> {
  return readJsonFile<RobotSkill[]>("robot-smartfactory.json");
}

export async function getRobotSkill(
  skillId: string,
): Promise<RobotSkill | null> {
  const skills = await getAllRobotSkills();
  return skills.find((skill) => skill.skill_id === skillId) ?? null;
}

export async function getReviewQueue(): Promise<ReviewQueue> {
  return readJsonFile<ReviewQueue>("review-queue.json");
}

export async function getCollegeMappingData(): Promise<CollegeMappingData> {
  return readJsonFile<CollegeMappingData>("college-mapping.json");
}

export async function getCollegeSubcategoryData(): Promise<CollegeSubcategoryData> {
  return readJsonFile<CollegeSubcategoryData>("college-subcategories.json");
}

export async function getEmployeeCompetencyDataset(): Promise<EmployeeCompetencyDataset> {
  return readJsonFile<EmployeeCompetencyDataset>(
    "employee-competency-assessments.json",
  );
}

export function getDevelopmentTrackIds(): string[] {
  return [...DEVELOPMENT_TRACK_IDS];
}

export async function getDevelopmentTrack(
  trackId: string,
): Promise<DevelopmentTrack | null> {
  if (!getDevelopmentTrackIds().includes(trackId)) {
    return null;
  }
  return readJsonFile<DevelopmentTrack>(`development-tracks/${trackId}.json`);
}

export async function getDevelopmentCandidates(
  trackId: string,
): Promise<CandidateDevelopmentRecord[]> {
  if (!getDevelopmentTrackIds().includes(trackId)) {
    return [];
  }
  const candidates = await readJsonFile<CandidateDevelopmentRecord[]>(
    "development-candidates/sample-candidates.json",
  );
  return candidates.filter((candidate) => candidate.track_id === trackId);
}

export async function getDevelopmentCandidate(
  trackId: string,
  candidateId: string,
): Promise<CandidateDevelopmentRecord | null> {
  const candidates = await getDevelopmentCandidates(trackId);
  return (
    candidates.find((candidate) => candidate.candidate_id === candidateId) ??
    null
  );
}

export async function getDevelopmentTracksForOrganization(
  organizationId: string,
): Promise<DevelopmentTrack[]> {
  const tracks = await Promise.all(
    getDevelopmentTrackIds().map((trackId) => getDevelopmentTrack(trackId)),
  );
  return tracks.filter(
    (track): track is DevelopmentTrack =>
      track !== null && track.organization_id === organizationId,
  );
}

export async function getDomainSkills(
  domainKey: string,
): Promise<RobotSkill[]> {
  const skills = await getAllRobotSkills();
  return skills.filter((skill) => skill.domain === domainKey);
}

export function getOrganizationIds(): string[] {
  return [...ORGANIZATION_IDS];
}

export async function getOrganization(
  orgId: string,
): Promise<Organization | null> {
  if (!getOrganizationIds().includes(orgId)) {
    return null;
  }
  return readJsonFile<Organization>(`organizations/${orgId}.json`);
}

export async function getOrganizationSummaries(): Promise<
  OrganizationSummary[]
> {
  const summaries = await Promise.all(
    getOrganizationIds().map(async (id) => {
      const data = await getOrganization(id);
      if (!data) {
        throw new Error(`조직 데이터를 찾을 수 없습니다: ${id}`);
      }
      return {
        id,
        name: data.organization.name,
        nameEn: data.organization.name_en,
        description: data.organization.description,
        enablerCount: data.enablers.length,
        skillCount: data.enablers.reduce(
          (total, enabler) => total + enabler.skills.length,
          0,
        ),
      };
    }),
  );
  return summaries;
}
