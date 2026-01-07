import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load candidate-specific pages
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const Applications = lazy(() => import("@/pages/Applications"));
const ApplicationDetail = lazy(() => import("@/pages/ApplicationDetail"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyPage = lazy(() => import("@/pages/CompanyPage"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const InterviewPrep = lazy(() => import("@/pages/InterviewPrep"));
const InterviewPrepChat = lazy(() => import("@/pages/InterviewPrepChat"));
const Assessments = lazy(() => import("@/pages/Assessments"));
const SwipeGame = lazy(() => import("@/pages/SwipeGame"));
const Miljoenenjacht = lazy(() => import("@/pages/Miljoenenjacht"));
const Incubator20 = lazy(() => import("@/pages/assessments/Incubator20"));
const PressureCooker = lazy(() => import("@/pages/PressureCooker"));
const BlindSpotDetector = lazy(() => import("@/pages/BlindSpotDetector"));
const ValuesPoker = lazy(() => import("@/pages/ValuesPoker"));

/**
 * Candidate-specific routes
 * Career management, job search, applications, assessments
 */
export const candidateRoutes = (
  <>
    {/* Jobs routes are handled in jobsRoutes to avoid conflicts with /jobs/map */}
    
    {/* Applications */}
    <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
    <Route path="/applications/:id" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
    
    {/* Companies */}
    <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
    <Route path="/companies/:slug" element={<ProtectedRoute><CompanyPage /></ProtectedRoute>} />
    
    {/* Referrals */}
    <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
    
    {/* Interview Preparation */}
    <Route path="/interview-prep" element={<ProtectedRoute><InterviewPrep /></ProtectedRoute>} />
    <Route path="/interview-prep/chat/:sessionId" element={<ProtectedRoute><InterviewPrepChat /></ProtectedRoute>} />
    
    {/* Assessments & Games */}
    <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
    <Route path="/assessments/swipe-game" element={<ProtectedRoute><SwipeGame /></ProtectedRoute>} />
    <Route path="/assessments/miljoenenjacht" element={<ProtectedRoute><Miljoenenjacht /></ProtectedRoute>} />
    <Route path="/assessments/incubator-20" element={<ProtectedRoute><Incubator20 /></ProtectedRoute>} />
    <Route path="/assessments/pressure-cooker" element={<ProtectedRoute><PressureCooker /></ProtectedRoute>} />
    <Route path="/assessments/blind-spot-detector" element={<ProtectedRoute><BlindSpotDetector /></ProtectedRoute>} />
    <Route path="/assessments/values-poker" element={<ProtectedRoute><ValuesPoker /></ProtectedRoute>} />
  </>
);
