import type { CollegeId } from "./college-types";

// 4대 도메인 공용 표시 속성 (클라이언트 안전)
export const COLLEGE_UI: Record<CollegeId, { icon: string; color: string }> = {
  "physical-ai": { icon: "🦾", color: "#4f46e5" },
  "agentic-ai": { icon: "🤖", color: "#0d9488" },
  "data-intelligence": { icon: "📊", color: "#0891b2" },
  "digital-twin": { icon: "🧩", color: "#9333ea" },
};

export function collegeIcon(collegeId: string): string {
  return COLLEGE_UI[collegeId as CollegeId]?.icon ?? "◻";
}

export function collegeColor(collegeId: string): string {
  return COLLEGE_UI[collegeId as CollegeId]?.color ?? "#64748b";
}
