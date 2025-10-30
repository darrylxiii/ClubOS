import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { NavigationHistoryProvider } from "@/contexts/NavigationHistoryContext";
import { MotionProvider } from "@/contexts/MotionContext";
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
import PartnerFunnel from "./pages/PartnerFunnel";
import CandidateOnboarding from "./pages/CandidateOnboarding";
import NotFound from "./pages/NotFound";
import Meetings from "./pages/Meetings";
import MeetingRoom from "./pages/MeetingRoom";

// Lazy load protected routes to reduce initial bundle size
const ClubHome = lazy(() => import("./pages/ClubHome"));
const InviteAcceptance = lazy(() => import("./pages/InviteAcceptance"));
const InviteComplete = lazy(() => import("./pages/InviteComplete"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const UnifiedTasks = lazy(() => import("./pages/UnifiedTasks"));
const ObjectiveWorkspace = lazy(() => import("./pages/ObjectiveWorkspace"));
const ClubAI = lazy(() => import("./pages/ClubAI"));
const Academy = lazy(() => import("./pages/Academy"));
const AcademyCreatorHub = lazy(() => import("./pages/AcademyCreatorHub"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetail"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const ModuleManagement = lazy(() => import("./pages/ModuleManagement"));
const ModuleEdit = lazy(() => import("./pages/ModuleEdit"));
const CourseEdit = lazy(() => import("./pages/CourseEdit"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const EnhancedProfile = lazy(() => import("./pages/EnhancedProfile"));
const PublicUserProfile = lazy(() => import("./pages/PublicUserProfile"));
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"));
const Referrals = lazy(() => import("./pages/Referrals"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const InterviewPrepChat = lazy(() => import("./pages/InterviewPrepChat"));
const MeetingHistory = lazy(() => import("./pages/MeetingHistory"));
const Messages = lazy(() => import("./pages/Messages"));
const Applications = lazy(() => import("./pages/Applications"));
const ApplicationDetail = lazy(() => import("./pages/ApplicationDetail"));
const CompanyApplications = lazy(() => import("./pages/CompanyApplications"));
const CompanyJobsDashboard = lazy(() => import("./pages/CompanyJobsDashboard"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyPage = lazy(() => import("./pages/CompanyPage"));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const JobDashboard = lazy(() => import("./pages/JobDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const ClubSyncRequestsPage = lazy(() => import("./pages/admin/ClubSyncRequestsPage"));
const CompanyManagement = lazy(() => import("./pages/admin/CompanyManagement"));
const GlobalAnalytics = lazy(() => import("./pages/admin/GlobalAnalytics"));
const AIConfiguration = lazy(() => import("./pages/admin/AIConfiguration"));
const Feed = lazy(() => import("./pages/Feed"));
const Post = lazy(() => import("./pages/Post"));
const Settings = lazy(() => import("./pages/Settings"));
const SocialFeed = lazy(() => import("./pages/SocialFeed"));
const SocialManagement = lazy(() => import("./pages/SocialManagement"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Achievements = lazy(() => import("./pages/Achievements"));
const FeedbackDatabase = lazy(() => import("./pages/FeedbackDatabase"));
const FunnelAnalytics = lazy(() => import("./pages/FunnelAnalytics"));
const ClubDJ = lazy(() => import("./pages/ClubDJ"));
const Radio = lazy(() => import("./pages/Radio"));
const RadioListen = lazy(() => import("./pages/RadioListen"));
const Assessments = lazy(() => import("./pages/Assessments"));
const SwipeGame = lazy(() => import("./pages/SwipeGame"));
const Miljoenenjacht = lazy(() => import("./pages/Miljoenenjacht"));

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
                  <MotionProvider>
                    <VideoPlayerProvider>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/book/:slug" element={<BookingPage />} />
                <Route path="/share/:token" element={<SharedProfile />} />
          <Route path="/partner-funnel" element={<PartnerFunnel />} />
          <Route path="/candidate-onboarding" element={<CandidateOnboarding />} />
                <Route
                  path="/funnel-analytics"
                  element={
                    <ProtectedRoute>
                      <FunnelAnalytics />
                    </ProtectedRoute>
                  }
                />
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
            <Route
              path="/jobs/:jobId"
              element={
                <ProtectedRoute>
                  <JobDetail />
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
              path="/company-jobs"
              element={
                <ProtectedRoute>
                  <CompanyJobsDashboard />
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
            <Route path="/invite/:token" element={<InviteAcceptance />} />
            <Route path="/invite/:token/complete" element={<InviteComplete />} />
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
              path="/interview-prep-chat/:applicationId"
              element={
                <ProtectedRoute>
                  <InterviewPrepChat />
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
              path="/admin/club-sync-requests"
              element={
                <ProtectedRoute>
                  <ClubSyncRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute>
                  <CompanyManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <GlobalAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-config"
              element={
                <ProtectedRoute>
                  <AIConfiguration />
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
            <Route path="/academy" element={<Academy />} />
            <Route path="/academy/:slug" element={<Academy />} />
            <Route path="/academy/creator" element={<AcademyCreatorHub />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/courses/edit/:id" element={<ProtectedRoute><CourseEdit /></ProtectedRoute>} />
            <Route path="/academy/courses/:id/edit" element={<ProtectedRoute><CourseEdit /></ProtectedRoute>} />
            <Route path="/courses/manage-modules/:id" element={<ProtectedRoute><ModuleManagement /></ProtectedRoute>} />
            <Route path="/modules/edit/:id" element={<ProtectedRoute><ModuleEdit /></ProtectedRoute>} />
            <Route path="/academy/modules/:slug" element={<ModuleDetail />} />
            <Route path="/module/:moduleId" element={<ModuleDetail />} />
            <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
            <Route path="/meetings/:meetingCode" element={<MeetingRoom />} />
            <Route
              path="/club-dj"
              element={
                <ProtectedRoute>
                  <ClubDJ />
                </ProtectedRoute>
              }
            />
            <Route path="/radio" element={<Radio />} />
            <Route path="/radio/:sessionId" element={<RadioListen />} />
            <Route
              path="/assessments"
              element={
                <ProtectedRoute>
                  <Assessments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/swipe-game"
              element={
                <ProtectedRoute>
                  <SwipeGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/miljoenenjacht"
              element={
                <ProtectedRoute>
                  <Miljoenenjacht />
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
          </MotionProvider>
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
