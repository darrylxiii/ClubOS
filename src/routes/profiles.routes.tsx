import { lazy, Suspense } from "react";
import { Route, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Profile Pages
const EnhancedProfile = lazy(() => import("@/pages/EnhancedProfile"));
const PublicUserProfile = lazy(() => import("@/pages/PublicUserProfile"));
const CandidateProfile = lazy(() => import("@/pages/CandidateProfile"));
const UnifiedCandidateProfile = lazy(() => import("@/pages/UnifiedCandidateProfile"));
const MySkillsPage = lazy(() => import("@/pages/MySkillsPage"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Referrals = lazy(() => import("@/pages/Referrals"));
// ReferralProgram is now a redirect — data model differs but canonical page is Referrals
// InviteDashboard is now a tab inside Referrals

export const profilesRoutes = (
  <>
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <EnhancedProfile />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile/:userId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PublicUserProfile />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/candidate-profile/:candidateId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CandidateProfile />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/unified-candidate/:candidateId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <UnifiedCandidateProfile />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-skills"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MySkillsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/achievements"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Achievements />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/referrals"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Referrals />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* ReferralProgram redirect — Referrals is the canonical page */}
    <Route path="/referral-program" element={<Navigate to="/referrals" replace />} />
    {/* InviteDashboard redirect — now a tab inside Referrals */}
    <Route path="/invites" element={<Navigate to="/referrals?tab=invites" replace />} />
    {/* Redirect /candidates/:id to /candidate/:id */}
    <Route
      path="/candidates/:id"
      element={<CandidatesRedirect />}
    />
  </>
);

function CandidatesRedirect() {
  const { id } = useParams();
  return <Navigate to={`/candidate/${id}`} replace />;
}
