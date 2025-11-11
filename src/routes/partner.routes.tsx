import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load partner-specific pages
const CompanyApplications = lazy(() => import("@/pages/CompanyApplications"));
const CompanyJobsDashboard = lazy(() => import("@/pages/CompanyJobsDashboard"));
const JobDashboard = lazy(() => import("@/pages/JobDashboard"));
const BookingManagement = lazy(() => import("@/pages/BookingManagement"));
const CompanySettings = lazy(() => import("@/pages/CompanySettings"));
const ExpertMarketplace = lazy(() => import("@/pages/ExpertMarketplace"));
const PartnerRejections = lazy(() => import("@/pages/PartnerRejections"));
const PartnerTargetCompanies = lazy(() => import("@/pages/PartnerTargetCompanies"));

/**
 * Partner-specific routes
 * Hiring, company management, analytics
 */
export const partnerRoutes = (
  <>
    {/* Company Management */}
    <Route path="/company/:companyId/applications" element={<ProtectedRoute><CompanyApplications /></ProtectedRoute>} />
    <Route path="/company/:companyId/jobs" element={<ProtectedRoute><CompanyJobsDashboard /></ProtectedRoute>} />
    <Route path="/company/:companyId/settings" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
    
    {/* Job Management */}
    <Route path="/jobs/:jobId/dashboard" element={<ProtectedRoute><JobDashboard /></ProtectedRoute>} />
    <Route path="/partner/rejections" element={<ProtectedRoute><PartnerRejections /></ProtectedRoute>} />
    <Route path="/partner/targets" element={<ProtectedRoute><PartnerTargetCompanies /></ProtectedRoute>} />
    
    {/* Booking & Marketplace */}
    <Route path="/booking-management" element={<ProtectedRoute><BookingManagement /></ProtectedRoute>} />
    <Route path="/expert-marketplace" element={<ProtectedRoute><ExpertMarketplace /></ProtectedRoute>} />
  </>
);
