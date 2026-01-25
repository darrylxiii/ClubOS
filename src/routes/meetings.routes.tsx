import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Meeting Pages
const Meetings = lazy(() => import("@/pages/Meetings"));
const MeetingRoom = lazy(() => import("@/pages/MeetingRoom"));
const JoinMeeting = lazy(() => import("@/pages/JoinMeeting"));
const MeetingNotes = lazy(() => import("@/pages/MeetingNotes"));
const Scheduling = lazy(() => import("@/pages/Scheduling"));
const BookingManagement = lazy(() => import("@/pages/BookingManagement"));
const SchedulingSettings = lazy(() => import("@/pages/SchedulingSettings"));
const RecordingPlaybackPage = lazy(() => import("@/components/meetings/RecordingPlaybackPage"));
const DossierView = lazy(() => import("@/pages/DossierView"));
const InterviewComparison = lazy(() => import("@/pages/InterviewComparison"));

export const meetingsRoutes = (
  <>
    <Route
      path="/meetings"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Meetings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/meeting/:meetingCode"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MeetingRoom />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/join/:meetingCode"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <JoinMeeting />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/meeting-notes/:meetingId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MeetingNotes />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* Redirect legacy /meeting-history to /meetings?tab=history */}
    <Route
      path="/meeting-history"
      element={<Navigate to="/meetings?tab=history" replace />}
    />
    <Route
      path="/scheduling"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Scheduling />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/booking-management"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <BookingManagement />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/scheduling/settings"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <SchedulingSettings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/recording/:recordingId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <RecordingPlaybackPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/dossier/:shareToken"
      element={
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <DossierView />
          </Suspense>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/interview-comparison"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <InterviewComparison />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
