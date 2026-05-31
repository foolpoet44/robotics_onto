export interface OrganizationSkill {
  skill_id: string;
  label_ko: string;
  label_en: string;
  importance: number;
  target_proficiency: string;
  match_type: "exact" | "approximate" | "custom";
  notes?: string;
}

export interface Enabler {
  id: string;
  name: string;
  name_en: string;
  description: string;
  priority: number;
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

export async function loadOrganization(orgId: string): Promise<Organization> {
  const response = await fetch(`/data/organizations/${orgId}.json`);
  if (!response.ok) {
    throw new Error("조직 데이터를 불러오지 못했습니다.");
  }
  return response.json();
}
