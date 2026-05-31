export interface RobotSkill {
  skill_id: string;
  domain: string;
  domain_en: string;
  esco_uri: string;
  preferred_label_ko: string;
  preferred_label_en: string;
  description_ko: string;
  description_en: string;
  skill_type: "knowledge" | "skill" | "competence";
  proficiency_level: 1 | 2 | 3 | 4;
  role_mapping: ("operator" | "engineer" | "developer")[];
  parent_skill_id: string | null;
  related_skills: string[];
  esco_broader: string | null;
  smartfactory_context: string;
}

export interface RobotDomain {
  key: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
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
];

export async function loadRobotSkills(): Promise<RobotSkill[]> {
  const response = await fetch("/data/robot-smartfactory.json");
  if (!response.ok) {
    throw new Error("로보틱스 스킬 데이터를 불러오지 못했습니다.");
  }
  return response.json();
}

export function getDomain(domainKey: string): RobotDomain | undefined {
  return ROBOT_DOMAINS.find((domain) => domain.key === domainKey);
}

export function getDomainName(domainKey: string): string {
  return getDomain(domainKey)?.name ?? domainKey;
}
