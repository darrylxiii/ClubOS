import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load shared pages accessible to all authenticated users
const ClubHome = lazy(() => import("@/pages/ClubHome"));
const ClubPilot = lazy(() => import("@/pages/ClubPilot"));
const Feed = lazy(() => import("@/pages/Feed"));
const Post = lazy(() => import("@/pages/Post"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Messages = lazy(() => import("@/pages/Messages"));
const MeetingIntelligence = lazy(() => import("@/pages/MeetingIntelligence"));
const MeetingInsights = lazy(() => import("@/pages/MeetingInsights"));
const UnifiedTasks = lazy(() => import("@/pages/UnifiedTasks"));
const ObjectiveWorkspace = lazy(() => import("@/pages/ObjectiveWorkspace"));
const ClubAI = lazy(() => import("@/pages/ClubAI"));
const Academy = lazy(() => import("@/pages/Academy"));
const AcademyCreatorHub = lazy(() => import("@/pages/AcademyCreatorHub"));
const ModuleDetail = lazy(() => import("@/pages/ModuleDetail"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const ModuleManagement = lazy(() => import("@/pages/ModuleManagement"));
const ModuleEdit = lazy(() => import("@/pages/ModuleEdit"));
const CourseEdit = lazy(() => import("@/pages/CourseEdit"));
const Settings = lazy(() => import("@/pages/Settings"));
const EnhancedProfile = lazy(() => import("@/pages/EnhancedProfile"));
const PublicUserProfile = lazy(() => import("@/pages/PublicUserProfile"));
const UnifiedCandidateProfile = lazy(() => import("@/pages/UnifiedCandidateProfile"));
const ClubDJ = lazy(() => import("@/pages/ClubDJ"));
const Radio = lazy(() => import("@/pages/Radio"));
const RadioListen = lazy(() => import("@/pages/RadioListen"));
const DocumentManagement = lazy(() => import("@/pages/DocumentManagement"));

// Workspace / Quantum OS Pages
const WorkspaceList = lazy(() => import("@/pages/WorkspaceList"));
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage"));

// Compliance Hub - Unified page with tabs
const ComplianceHub = lazy(() => import("@/pages/compliance/ComplianceHub"));

// Financial & Billing Pages - Financial routes consolidated into FinanceHub in admin.routes.tsx
const FinanceHub = lazy(() => import("@/pages/admin/FinanceHub"));
const PartnerBilling = lazy(() => import("@/pages/partner/PartnerBilling"));

/**
 * Shared routes accessible to all authenticated users
 * Core platform features, communication, learning
 * 
 * CONSOLIDATION: Removed duplicate pages:
 * - /user-settings → redirects to /settings
 * - /social-feed → redirects to /feed
 * - /email-settings → redirects to /settings?tab=connections
 * - /company-settings → redirects to /settings?tab=company
 * - Compliance pages → unified at /compliance
 */
export const sharedRoutes = (
  <>
    {/* Home route defined in App.tsx to avoid duplicate */}
    <Route path="/club-pilot" element={<ProtectedRoute><ClubPilot /></ProtectedRoute>} />
    
    {/* Feed & Social - Unified */}
    <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
    <Route path="/posts/:id" element={<ProtectedRoute><Post /></ProtectedRoute>} />
    <Route path="/social-feed" element={<Navigate to="/feed" replace />} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
    
    {/* Communication */}
    <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/meeting-intelligence" element={<ProtectedRoute><MeetingIntelligence /></ProtectedRoute>} />
    <Route path="/meeting-insights/:meetingId" element={<ProtectedRoute><MeetingInsights /></ProtectedRoute>} />
    
    {/* Tasks */}
    <Route path="/unified-tasks" element={<ProtectedRoute><UnifiedTasks /></ProtectedRoute>} />
    <Route path="/objectives/:id" element={<ProtectedRoute><ObjectiveWorkspace /></ProtectedRoute>} />
    
    {/* AI */}
    <Route path="/club-ai" element={<ProtectedRoute><ClubAI /></ProtectedRoute>} />
    
    {/* Academy & Learning */}
    <Route path="/academy" element={<ProtectedRoute><Academy /></ProtectedRoute>} />
    <Route path="/academy/creator" element={<ProtectedRoute><AcademyCreatorHub /></ProtectedRoute>} />
    <Route path="/modules/:moduleId" element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>} />
    <Route path="/modules/:moduleId/manage" element={<ProtectedRoute><ModuleManagement /></ProtectedRoute>} />
    <Route path="/modules/:moduleId/edit" element={<ProtectedRoute><ModuleEdit /></ProtectedRoute>} />
    <Route path="/courses/:slug" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
    <Route path="/courses/:slug/edit" element={<ProtectedRoute><CourseEdit /></ProtectedRoute>} />
    
    {/* Profile & Settings - Consolidated */}
    <Route path="/profile" element={<ProtectedRoute><EnhancedProfile /></ProtectedRoute>} />
    <Route path="/profile/:username" element={<ProtectedRoute><PublicUserProfile /></ProtectedRoute>} />
    <Route path="/candidate/:candidateId" element={<ProtectedRoute><UnifiedCandidateProfile /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    
    {/* Legacy Settings Routes - Redirect to unified Settings */}
    <Route path="/user-settings" element={<Navigate to="/settings" replace />} />
    <Route path="/email-settings" element={<Navigate to="/settings?tab=connections" replace />} />
    <Route path="/company-settings" element={<Navigate to="/settings?tab=company" replace />} />
    
    {/* Radio & Music */}
    <Route path="/club-dj" element={<ProtectedRoute><ClubDJ /></ProtectedRoute>} />
    <Route path="/radio" element={<ProtectedRoute><Radio /></ProtectedRoute>} />
    <Route path="/radio/:playlistId" element={<ProtectedRoute><RadioListen /></ProtectedRoute>} />
    
    {/* Documents */}
    <Route path="/documents" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />
    
    {/* WhatsApp Business - Redirect to unified hub */}
    <Route path="/whatsapp" element={<Navigate to="/admin/whatsapp" replace />} />
    
    {/* Quantum OS Workspace */}
    <Route path="/pages" element={<ProtectedRoute><WorkspaceList /></ProtectedRoute>} />
    <Route path="/pages/:pageId" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
    
    {/* Compliance Hub - Unified with tabs */}
    <Route path="/compliance" element={<ProtectedRoute><ComplianceHub /></ProtectedRoute>} />
    <Route path="/compliance/dashboard" element={<Navigate to="/compliance?tab=dashboard" replace />} />
    <Route path="/compliance/legal-agreements" element={<Navigate to="/compliance?tab=legal" replace />} />
    <Route path="/compliance/subprocessors" element={<Navigate to="/compliance?tab=subprocessors" replace />} />
    <Route path="/compliance/data-classification" element={<Navigate to="/compliance?tab=classification" replace />} />
    <Route path="/compliance/audit-requests" element={<Navigate to="/compliance?tab=audits" replace />} />

    {/* Financial & Billing Routes */}
    <Route path="/admin/financial" element={<ProtectedRoute><FinancialDashboard /></ProtectedRoute>} />
    <Route path="/admin/deals-pipeline" element={<ProtectedRoute><DealsPipeline /></ProtectedRoute>} />
    <Route path="/partner/billing" element={<ProtectedRoute><PartnerBilling /></ProtectedRoute>} />
  </>
);
