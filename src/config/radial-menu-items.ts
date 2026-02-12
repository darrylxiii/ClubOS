import {
  Mic,
  Plus,
  Bot,
  History,
  Search,
  Activity,
  Users,
  FileText,
  Calendar,
  ListChecks,
  MessageSquare,
  Building,
  Briefcase,
  UserCircle,
  Share2,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { UserRole } from "@/types/roles";

export interface RadialMenuItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  actionType:
    | "voice-memo"
    | "quick-task"
    | "club-ai"
    | "last-pipeline"
    | "command-palette"
    | "quantum-pulse"
    | "navigate";
  path?: string; // for navigate actions
}

const SHARED_ITEMS: RadialMenuItemConfig[] = [
  { id: "voice-memo", label: "Voice Memo", icon: Mic, actionType: "voice-memo" },
  { id: "club-ai", label: "Club AI", icon: Bot, actionType: "club-ai" },
];

const ADMIN_ITEMS: RadialMenuItemConfig[] = [
  ...SHARED_ITEMS,
  { id: "quick-task", label: "Quick Task", icon: Plus, actionType: "quick-task" },
  { id: "last-pipeline", label: "Last Pipeline", icon: History, actionType: "last-pipeline" },
  { id: "command-palette", label: "Search", icon: Search, actionType: "command-palette" },
  { id: "quantum-pulse", label: "Pulse", icon: Activity, actionType: "quantum-pulse" },
];

const STRATEGIST_ITEMS: RadialMenuItemConfig[] = [
  ...SHARED_ITEMS,
  { id: "quick-task", label: "Quick Task", icon: Plus, actionType: "quick-task" },
  { id: "pipeline", label: "Pipeline", icon: Users, actionType: "navigate", path: "/crm/prospects" },
  { id: "new-dossier", label: "Dossier", icon: FileText, actionType: "navigate", path: "/dossiers" },
  { id: "schedule", label: "Schedule", icon: Calendar, actionType: "navigate", path: "/scheduling" },
];

const PARTNER_ITEMS: RadialMenuItemConfig[] = [
  ...SHARED_ITEMS,
  { id: "shortlist", label: "Shortlist", icon: ListChecks, actionType: "navigate", path: "/partner/shortlist" },
  { id: "messages", label: "Messages", icon: MessageSquare, actionType: "navigate", path: "/messages" },
  { id: "company", label: "Company", icon: Building, actionType: "navigate", path: "/companies" },
];

const CANDIDATE_ITEMS: RadialMenuItemConfig[] = [
  ...SHARED_ITEMS,
  { id: "applications", label: "Applications", icon: Briefcase, actionType: "navigate", path: "/applications" },
  { id: "profile", label: "Profile", icon: UserCircle, actionType: "navigate", path: "/profile" },
  { id: "referrals", label: "Refer", icon: Share2, actionType: "navigate", path: "/referrals" },
];

export function getRadialMenuItems(role: UserRole): RadialMenuItemConfig[] {
  switch (role) {
    case "admin":
      return ADMIN_ITEMS;
    case "strategist":
      return STRATEGIST_ITEMS;
    case "partner":
    case "company_admin":
      return PARTNER_ITEMS;
    case "user":
    case "recruiter":
    default:
      return CANDIDATE_ITEMS;
  }
}
