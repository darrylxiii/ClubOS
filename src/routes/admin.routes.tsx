import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load admin-specific pages
const Admin = lazy(() => import("@/pages/Admin"));
const AdminCandidates = lazy(() => import("@/pages/AdminCandidates"));
const AdminUserProfile = lazy(() => import("@/pages/admin/AdminUserProfile"));
const ClubSyncRequestsPage = lazy(() => import("@/pages/admin/ClubSyncRequestsPage"));
const CompanyManagement = lazy(() => import("@/pages/admin/CompanyManagement"));
const GlobalAnalytics = lazy(() => import("@/pages/admin/GlobalAnalytics"));
const AIConfiguration = lazy(() => import("@/pages/admin/AIConfiguration"));
const FeedbackDatabase = lazy(() => import("@/pages/FeedbackDatabase"));
const FunnelAnalytics = lazy(() => import("@/pages/FunnelAnalytics"));
const SocialManagement = lazy(() => import("@/pages/SocialManagement"));

/**
 * Admin-specific routes
 * Platform management, analytics, configuration
 */
export const adminRoutes = (
  <>
    {/* Admin Panel */}
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    
    {/* User Management */}
    <Route path="/admin/candidates" element={<ProtectedRoute><AdminCandidates /></ProtectedRoute>} />
    <Route path="/admin/users/:userId/profile" element={<ProtectedRoute><AdminUserProfile /></ProtectedRoute>} />
    
    {/* Company Management */}
    <Route path="/admin/companies" element={<ProtectedRoute><CompanyManagement /></ProtectedRoute>} />
    
    {/* Club Sync */}
    <Route path="/admin/club-sync-requests" element={<ProtectedRoute><ClubSyncRequestsPage /></ProtectedRoute>} />
    
    {/* Analytics */}
    <Route path="/admin/analytics" element={<ProtectedRoute><GlobalAnalytics /></ProtectedRoute>} />
    <Route path="/funnel-analytics" element={<ProtectedRoute><FunnelAnalytics /></ProtectedRoute>} />
    
    {/* Configuration */}
    <Route path="/admin/ai-config" element={<ProtectedRoute><AIConfiguration /></ProtectedRoute>} />
    
    {/* Feedback & Social */}
    <Route path="/feedback-database" element={<ProtectedRoute><FeedbackDatabase /></ProtectedRoute>} />
    <Route path="/social-management" element={<ProtectedRoute><SocialManagement /></ProtectedRoute>} />
  </>
);
