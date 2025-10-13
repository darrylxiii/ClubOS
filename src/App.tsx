import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { NavigationHistoryProvider } from "@/contexts/NavigationHistoryContext";
import { FeedbackButton } from "@/components/FeedbackButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FloatingVideoPlayer } from "@/components/FloatingVideoPlayer";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical public routes
import Auth from "./pages/Auth";
import SharedProfile from "./pages/SharedProfile";
import BookingPage from "./pages/BookingPage";
import NotFound from "./pages/NotFound";

// Lazy load protected routes to reduce initial bundle size
const ClubHome = lazy(() => import("./pages/ClubHome"));
const Jobs = lazy(() => import("./pages/Jobs"));
const UnifiedTasks = lazy(() => import("./pages/UnifiedTasks"));
const ObjectiveWorkspace = lazy(() => import("./pages/ObjectiveWorkspace"));
const ClubAI = lazy(() => import("./pages/ClubAI"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const EnhancedProfile = lazy(() => import("./pages/EnhancedProfile"));
const PublicUserProfile = lazy(() => import("./pages/PublicUserProfile"));
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"));
const Referrals = lazy(() => import("./pages/Referrals"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const MeetingHistory = lazy(() => import("./pages/MeetingHistory"));
const Messages = lazy(() => import("./pages/Messages"));
const Applications = lazy(() => import("./pages/Applications"));
const ApplicationDetail = lazy(() => import("./pages/ApplicationDetail"));
const CompanyApplications = lazy(() => import("./pages/CompanyApplications"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyPage = lazy(() => import("./pages/CompanyPage"));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const JobDashboard = lazy(() => import("./pages/JobDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Feed = lazy(() => import("./pages/Feed"));
const Post = lazy(() => import("./pages/Post"));
const Settings = lazy(() => import("./pages/Settings"));
const SocialFeed = lazy(() => import("./pages/SocialFeed"));
const SocialManagement = lazy(() => import("./pages/SocialManagement"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Achievements = lazy(() => import("./pages/Achievements"));
const FeedbackDatabase = lazy(() => import("./pages/FeedbackDatabase"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-eclipse">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <RoleProvider>
                <NavigationHistoryProvider>
                  <VideoPlayerProvider>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/book/:slug" element={<BookingPage />} />
                <Route path="/share/:token" element={<SharedProfile />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <ClubHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club-ai"
              element={
                <ProtectedRoute>
                  <ClubAI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/dashboard"
              element={
                <ProtectedRoute>
                  <JobDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            {/* Redirect old task routes to unified tasks */}
            <Route path="/tasks-pilot" element={<Navigate to="/unified-tasks" replace />} />
            <Route path="/club-tasks" element={<Navigate to="/unified-tasks" replace />} />
            <Route
              path="/unified-tasks"
              element={
                <ProtectedRoute>
                  <UnifiedTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={<Navigate to="/unified-tasks" replace />}
            />
            <Route
              path="/objectives/:id"
              element={
                <ProtectedRoute>
                  <ObjectiveWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner-onboarding"
              element={
                <ProtectedRoute>
                  <PartnerOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-settings"
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <EnhancedProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userIdOrSlug"
              element={
                <ProtectedRoute>
                  <PublicUserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidates/:candidateId"
              element={
                <ProtectedRoute>
                  <CandidateProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview-prep"
              element={
                <ProtectedRoute>
                  <InterviewPrep />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting-history"
              element={
                <ProtectedRoute>
                  <MeetingHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <Applications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/:applicationId"
              element={
                <ProtectedRoute>
                  <ApplicationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-applications"
              element={
                <ProtectedRoute>
                  <CompanyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:slug"
              element={
                <ProtectedRoute>
                  <CompanyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduling"
              element={
                <ProtectedRoute>
                  <Scheduling />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              }
            />
            <Route path="/post/:id" element={<Post />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social-feed"
              element={
                <ProtectedRoute>
                  <SocialFeed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social-management"
              element={
                <ProtectedRoute>
                  <SocialManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback-database"
              element={
                <ProtectedRoute>
                  <FeedbackDatabase />
                </ProtectedRoute>
              }
            />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <FeedbackButton />
              <FloatingVideoPlayer />
            </VideoPlayerProvider>
          </NavigationHistoryProvider>
        </RoleProvider>
      </AuthProvider>
      </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
