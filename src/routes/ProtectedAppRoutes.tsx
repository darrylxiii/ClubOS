import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

import { sharedRoutes } from '@/routes/shared.routes';
import { candidateRoutes } from '@/routes/candidate.routes';
import { AdminAssessmentsRoutes } from '@/routes/admin-assessments.routes';
import { adminRoutes } from '@/routes/admin.routes';
import { partnerRoutes } from '@/routes/partner.routes';
import { analyticsRoutes } from '@/routes/analytics.routes';
import { meetingsRoutes } from '@/routes/meetings.routes';
import { jobsRoutes } from '@/routes/jobs.routes';
import { profilesRoutes } from '@/routes/profiles.routes';
import { projectsRoutes } from '@/routes/projects.routes';
import { crmRoutes } from '@/routes/crm.routes';

// Core
const ClubHome = lazy(() => import('@/pages/ClubHome'));

// App Pages
const ClubAI = lazy(() => import('@/pages/ClubAI'));
const PartnerWelcome = lazy(() => import('@/pages/PartnerWelcome'));
const PartnerSetup = lazy(() => import('@/pages/PartnerSetup'));
const Subscription = lazy(() => import('@/pages/Subscription'));
const SubscriptionSuccess = lazy(() => import('@/pages/SubscriptionSuccess'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const ExpertMarketplace = lazy(() => import('@/pages/ExpertMarketplace'));
const AgentDashboard = lazy(() => import('@/pages/AgentDashboard'));
const SupportTicketList = lazy(() => import('@/pages/support/SupportTicketList'));
const SupportTicketNew = lazy(() => import('@/pages/support/SupportTicketNew'));
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'));

// Account Settings Pages
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPasswordVerify = lazy(() => import('@/pages/ResetPasswordVerify'));
const ResetPasswordMagicLink = lazy(() => import('@/pages/ResetPasswordMagicLink'));
const ResetPasswordNew = lazy(() => import('@/pages/ResetPasswordNew'));
const ResetPasswordSuccess = lazy(() => import('@/pages/ResetPasswordSuccess'));
const MfaSetup = lazy(() => import('@/pages/MfaSetup'));
const ChangePassword = lazy(() => import('@/pages/ChangePassword'));

const LiveHub = lazy(() => import('@/pages/LiveHub'));
const PartnerRelationships = lazy(() => import('@/pages/PartnerRelationships'));

// Blog Pages
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const BlogCategory = lazy(() => import('@/pages/BlogCategory'));

export default function ProtectedAppRoutes() {
  return (
    <Routes>
      <Route path="/home" element={<ClubHome />} />
      {sharedRoutes}
      {candidateRoutes}
      {adminRoutes}
      {AdminAssessmentsRoutes}
      {partnerRoutes}
      {analyticsRoutes}
      {meetingsRoutes}
      {jobsRoutes}
      {profilesRoutes}
      {projectsRoutes}
      {crmRoutes}

      <Route path="/support/tickets" element={<SupportTicketList />} />
      <Route path="/support/tickets/new" element={<SupportTicketNew />} />
      <Route path="/help" element={<KnowledgeBase />} />
      <Route path="/partner/relationships" element={<PartnerRelationships />} />
      <Route path="/live-hub" element={<LiveHub />} />

      {/* Blog Routes */}
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:category" element={<BlogCategory />} />
      <Route path="/blog/:category/:slug" element={<BlogPost />} />
      <Route path="/club-ai" element={<ClubAI />} />
      
      {/* Route Redirects */}
      <Route path="/communication-intelligence" element={<Navigate to="/admin/communication-hub?tab=intelligence" replace />} />
      <Route path="/my-communications" element={<Navigate to="/profile?tab=communications" replace />} />
      <Route path="/communication-analytics" element={<Navigate to="/admin/communication-hub?tab=analytics" replace />} />
      <Route path="/social-management" element={<Navigate to="/partner/hub?tab=social" replace />} />
      <Route path="/partner-onboarding" element={<Navigate to="/partner-setup" replace />} />
      <Route path="/whatsapp-import" element={<Navigate to="/admin/whatsapp?tab=import" replace />} />
      <Route path="/salary-insights" element={<Navigate to="/analytics?tab=salary" replace />} />
      <Route path="/career-path" element={<Navigate to="/analytics?tab=career-path" replace />} />

      <Route path="/subscription" element={<Subscription />} />
      <Route path="/subscription/success" element={<SubscriptionSuccess />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/expert-marketplace" element={<ExpertMarketplace />} />
      <Route path="/agent-dashboard" element={<AgentDashboard />} />

      {/* Protected Routes Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
