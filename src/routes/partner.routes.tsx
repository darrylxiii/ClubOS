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
    
    {/* Booking & Marketplace */}
    <Route path="/booking-management" element={<ProtectedRoute><BookingManagement /></ProtectedRoute>} />
    <Route path="/expert-marketplace" element={<ProtectedRoute><ExpertMarketplace /></ProtectedRoute>} />
  </>
);
