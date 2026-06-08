export type ReviewPriority = "high" | "normal";
export type ReviewStatus = "pending" | "approved" | "held" | "rejected";

export interface ReviewDecision {
  item_id: string;
  status: Exclude<ReviewStatus, "pending">;
  reviewer: string;
  reviewed_at: string;
  notes?: string;
}

export interface ReviewSkillReference {
  skill_id: string;
  label_ko: string;
  domain: string;
}

export interface OrganizationMappingReviewItem {
  id: string;
  kind: "organization_mapping";
  priority: ReviewPriority;
  status: ReviewStatus;
  decision?: ReviewDecision;
  organization_id: string;
  organization_name: string;
  enabler_name: string;
  organization_skill: {
    skill_id: string;
    label_ko: string;
  };
  ontology_skill: ReviewSkillReference;
}

export interface OntologyRelationReviewItem {
  id: string;
  kind: "ontology_relation";
  priority: ReviewPriority;
  status: ReviewStatus;
  decision?: ReviewDecision;
  relation_type:
    | "prerequisite"
    | "co_required"
    | "specialization"
    | "cross_domain";
  source_skill: ReviewSkillReference;
  target_skill: ReviewSkillReference;
}

export type ReviewItem =
  | OrganizationMappingReviewItem
  | OntologyRelationReviewItem;

export interface ReviewQueue {
  stats: {
    total: number;
    organizationMappings: number;
    ontologyRelations: number;
    statuses: Record<ReviewStatus, number>;
  };
  items: ReviewItem[];
}
