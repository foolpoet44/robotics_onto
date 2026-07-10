import type { CollegeId, LevelTier } from "./college-types";

export interface RobotSkill {
  skill_id: string;
  domain: string;
  domain_en: string;
  internal_uri: string;
  esco_uri: string | null;
  preferred_label_ko: string;
  preferred_label_en: string;
  description_ko: string;
  description_en: string;
  skill_type: "knowledge" | "skill" | "competence";
  proficiency_level: 1 | 2 | 3 | 4;
  role_mapping: ("operator" | "engineer" | "developer")[];
  parent_skill_id: string | null;
  related_skills: SkillRelation[];
  esco_broader: string | null;
  smartfactory_context: string;
  collegeId?: CollegeId;
  levelTier?: LevelTier;
}

export type RelationType =
  | "prerequisite"
  | "co_required"
  | "specialization"
  | "cross_domain";

export interface SkillRelation {
  target: string;
  type: RelationType;
  weight?: number;
  source?: "heuristic" | "reviewed";
}

export interface RobotDomain {
  key: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
}

export interface RobotSmartFactoryStatistics {
  totalSkills: number;
  domainCount: number;
  domainDistribution: Array<{ domain: string; count: number }>;
  roleDistribution: Array<{ role: string; count: number }>;
  proficiencyDistribution: Array<{ level: number; count: number }>;
  skillTypeDistribution: Array<{ type: string; count: number }>;
}

export const ROBOT_DOMAINS: RobotDomain[] = [
  {
    key: "industrial-robot-control",
    name: "산업용 로봇 제어",
    nameEn: "Industrial Robot Control",
    description: "로봇 운용, 티칭, 프로그래밍, 모션 제어와 안전 기준",
    icon: "🦾",
    color: "#4f46e5",
  },
  {
    key: "machine-vision-sensor",
    name: "머신비전 & 센서 통합",
    nameEn: "Machine Vision & Sensor Integration",
    description: "비전 검사, 센서 신호 처리, 캘리브레이션과 데이터 분석",
    icon: "👁️",
    color: "#0891b2",
  },
  {
    key: "collaborative-robot",
    name: "협동로봇 운용",
    nameEn: "Collaborative Robot Operation",
    description: "인간-로봇 협업, 안전 설정, 티칭과 워크셀 검증",
    icon: "🤝",
    color: "#ea580c",
  },
  {
    key: "autonomous-mobile-robot",
    name: "자율이동로봇",
    nameEn: "AMR / AGV Systems",
    description: "SLAM, 경로 계획, 충돌 회피와 함대 운영",
    icon: "🧭",
    color: "#16a34a",
  },
  {
    key: "robot-maintenance-diagnostics",
    name: "로봇 유지보수 & 진단",
    nameEn: "Robot Maintenance & Diagnostics",
    description: "예방 정비, 고장 진단, 부품 수명과 성능 관리",
    icon: "🛠️",
    color: "#dc2626",
  },
  {
    key: "digital-twin-simulation",
    name: "디지털트윈 & 시뮬레이션",
    nameEn: "Digital Twin & Simulation",
    description: "가상 검증, 라인 시뮬레이션, 실제 설비와 데이터 동기화",
    icon: "🧩",
    color: "#9333ea",
  },
  {
    key: "agentic-ai-manufacturing",
    name: "Agentic AI 제조",
    nameEn: "Agentic AI Manufacturing",
    description: "AI 에이전트, MES 자율화, 품질 자동 판정과 휴먼-인-더-루프 운영",
    icon: "🤖",
    color: "#0d9488",
  },
];

export function getDomain(domainKey: string): RobotDomain | undefined {
  return ROBOT_DOMAINS.find((domain) => domain.key === domainKey);
}

export function getDomainName(domainKey: string): string {
  return getDomain(domainKey)?.name ?? domainKey;
}

export function computeRobotStatistics(
  skills: RobotSkill[],
): RobotSmartFactoryStatistics {
  const domainMap = new Map<string, number>();
  const roleMap = new Map<string, number>();
  const proficiencyMap = new Map<number, number>();
  const typeMap = new Map<string, number>();

  skills.forEach((skill) => {
    domainMap.set(skill.domain, (domainMap.get(skill.domain) ?? 0) + 1);
    skill.role_mapping.forEach((role) => {
      roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
    });
    proficiencyMap.set(
      skill.proficiency_level,
      (proficiencyMap.get(skill.proficiency_level) ?? 0) + 1,
    );
    typeMap.set(skill.skill_type, (typeMap.get(skill.skill_type) ?? 0) + 1);
  });

  return {
    totalSkills: skills.length,
    domainCount: domainMap.size,
    domainDistribution: Array.from(domainMap).map(([domain, count]) => ({
      domain,
      count,
    })),
    roleDistribution: Array.from(roleMap).map(([role, count]) => ({
      role,
      count,
    })),
    proficiencyDistribution: Array.from(proficiencyMap)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level),
    skillTypeDistribution: Array.from(typeMap).map(([type, count]) => ({
      type,
      count,
    })),
  };
}
