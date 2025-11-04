export interface Department {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  department_type: 'core' | 'support' | 'leadership';
  color_hex: string;
  icon_name: string;
  display_order: number;
  parent_department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnhancedCompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  
  // Org chart specific fields
  department_id: string | null;
  reports_to_member_id: string | null;
  job_title: string | null;
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'consultant';
  start_date: string | null;
  location: string | null;
  is_people_manager: boolean;
  visibility_in_org_chart: 'full' | 'name_only' | 'hidden';
  bio: string | null;
  linkedin_url: string | null;
  display_order_in_dept: number;
  
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  department?: Department;
  reports_to?: EnhancedCompanyMember;
  direct_reports?: EnhancedCompanyMember[];
}

export interface OrgChartNode {
  member: EnhancedCompanyMember;
  children: OrgChartNode[];
  level: number; // 0 = CEO, 1 = C-suite, etc.
  isCandidate?: boolean;
}

export interface CandidatePlacement {
  id: string;
  company_id: string;
  candidate_user_id: string;
  department_id: string | null;
  proposed_job_title: string;
  proposed_reports_to_member_id: string | null;
  placement_status: 'considering' | 'interviewing' | 'offered' | 'declined' | 'hired';
  placement_notes: string | null;
  visibility: 'internal_only' | 'candidate_visible';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  candidate?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    current_title: string | null;
  };
  department?: Department;
  reports_to?: EnhancedCompanyMember;
}

export const STANDARD_DEPARTMENTS = [
  // Leadership
  { name: "Executive Leadership", type: "leadership" as const, icon: "Crown", color: "#C9A24E", order: 1 },
  { name: "Board of Directors", type: "leadership" as const, icon: "Users", color: "#A67C00", order: 2 },
  
  // Core Business
  { name: "Product & Engineering", type: "core" as const, icon: "Code", color: "#4F46E5", order: 10 },
  { name: "Sales & Business Development", type: "core" as const, icon: "TrendingUp", color: "#10B981", order: 11 },
  { name: "Marketing & Communications", type: "core" as const, icon: "Megaphone", color: "#F59E0B", order: 12 },
  { name: "Client Success & Support", type: "core" as const, icon: "Heart", color: "#EF4444", order: 13 },
  
  // Support Functions
  { name: "People & Culture", type: "support" as const, icon: "Users", color: "#8B5CF6", order: 20 },
  { name: "Finance & Operations", type: "support" as const, icon: "DollarSign", color: "#06B6D4", order: 21 },
  { name: "Legal & Compliance", type: "support" as const, icon: "Scale", color: "#6B7280", order: 22 },
  { name: "Talent & Recruitment", type: "support" as const, icon: "Target", color: "#EC4899", order: 23 },
];
