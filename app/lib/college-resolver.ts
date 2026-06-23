import type {
  CollegeDomainMapping,
  CollegeId,
  CollegeMappingData,
  CollegeResolution,
  Level,
} from "./college-types";

export function makeLevelId(collegeId: CollegeId, tier: number): string {
  return `${collegeId}-lv${tier}`;
}

export function resolveCollege(
  domainId: string,
  mapping: Record<string, CollegeDomainMapping>,
): CollegeResolution | null {
  const domainMapping = mapping[domainId];
  if (!domainMapping) {
    return null;
  }

  return {
    primary: domainMapping.primary,
    secondary: [...domainMapping.secondary],
    levelTier: domainMapping.defaultLevelTier,
    levelId: makeLevelId(domainMapping.primary, domainMapping.defaultLevelTier),
  };
}

export function resolveSkillCollege(
  skill: { domain: string; proficiency_level?: number },
  mapping: Record<string, CollegeDomainMapping>,
): CollegeResolution | null {
  const domainMapping = mapping[skill.domain];
  if (!domainMapping) {
    return null;
  }

  const levelTier = toLevelTier(
    skill.proficiency_level,
    domainMapping.defaultLevelTier,
  );

  return {
    primary: domainMapping.primary,
    secondary: [...domainMapping.secondary],
    levelTier,
    levelId: makeLevelId(domainMapping.primary, levelTier),
  };
}

export function getLevel(levelId: string, levels: Level[]): Level | null {
  return levels.find((level) => level.id === levelId) ?? null;
}

export function resolvePrerequisiteChain(
  levelId: string,
  levels: Level[],
): string[] {
  const levelsById = new Map(levels.map((level) => [level.id, level]));
  const visited = new Set<string>();
  const chain: string[] = [];

  function visit(currentLevelId: string, path: Set<string>) {
    const level = levelsById.get(currentLevelId);
    if (!level) {
      throw new Error(`존재하지 않는 레벨입니다: ${currentLevelId}`);
    }

    for (const prerequisiteId of level.prerequisites) {
      if (path.has(prerequisiteId)) {
        throw new Error(
          `레벨 선수관계 순환이 감지되었습니다: ${prerequisiteId}`,
        );
      }
      if (visited.has(prerequisiteId)) {
        continue;
      }

      // 재귀는 선수의 선수까지 따라가기 때문에 방문 기록으로 중복과 순환을 막는다.
      visited.add(prerequisiteId);
      chain.push(prerequisiteId);
      visit(prerequisiteId, new Set([...path, prerequisiteId]));
    }
  }

  visit(levelId, new Set([levelId]));
  return chain;
}

export function hasHubPrerequisite(
  levelId: string,
  completedLevels: string[],
  levels: Level[],
  hubCollegeId: CollegeId = "data-intelligence",
): boolean {
  const prerequisiteChain = resolvePrerequisiteChain(levelId, levels);
  const levelsById = new Map(levels.map((level) => [level.id, level]));
  const hubPrerequisites = prerequisiteChain.filter(
    (prerequisiteId) =>
      levelsById.get(prerequisiteId)?.collegeId === hubCollegeId,
  );

  if (hubPrerequisites.length === 0) {
    return true;
  }

  const completed = new Set(completedLevels);
  return hubPrerequisites.every((prerequisiteId) =>
    completed.has(prerequisiteId),
  );
}

export function validateCollegeMappingData(data: CollegeMappingData): string[] {
  const errors: string[] = [];
  const collegeIds = new Set(data.colleges.map((college) => college.id));
  const levelIds = new Set(data.levels.map((level) => level.id));

  for (const level of data.levels) {
    if (!collegeIds.has(level.collegeId)) {
      errors.push(`${level.id}: 존재하지 않는 collegeId '${level.collegeId}'`);
    }

    for (const prerequisiteId of level.prerequisites) {
      if (!levelIds.has(prerequisiteId)) {
        errors.push(`${level.id}: 존재하지 않는 선수 레벨 '${prerequisiteId}'`);
      }
    }
  }

  for (const [domainId, mapping] of Object.entries(data.domainMapping)) {
    if (!collegeIds.has(mapping.primary)) {
      errors.push(
        `${domainId}: 존재하지 않는 primary college '${mapping.primary}'`,
      );
    }

    for (const collegeId of mapping.secondary) {
      if (!collegeIds.has(collegeId)) {
        errors.push(
          `${domainId}: 존재하지 않는 secondary college '${collegeId}'`,
        );
      }
    }

    const levelId = makeLevelId(mapping.primary, mapping.defaultLevelTier);
    if (!levelIds.has(levelId)) {
      errors.push(`${domainId}: 기본 레벨 '${levelId}'이 존재하지 않습니다.`);
    }
  }

  return errors;
}

function toLevelTier(value: number | undefined, fallback: 1 | 2 | 3 | 4) {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }
  return fallback;
}
