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
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FloatingVideoPlayer } from "@/components/FloatingVideoPlayer";
import { ActivityTracker } from "@/components/ActivityTracker";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical public routes
import Auth from "./pages/Auth";
import SharedProfile from "./pages/SharedProfile";
import BookingPage from "./pages/BookingPage";
import PartnerFunnel from "./pages/PartnerFunnel";
import PartnershipSubmitted from "./pages/PartnershipSubmitted";
import CandidateOnboarding from "./pages/CandidateOnboarding";
import NotFound from "./pages/NotFound";
import Meetings from "./pages/Meetings";
import MeetingRoom from "./pages/MeetingRoom";

// Lazy load protected routes to reduce initial bundle size
const ClubHome = lazy(() => import("./pages/ClubHome"));
const OAuthOnboarding = lazy(() => import("./pages/OAuthOnboarding"));

// Legal pages (public)
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
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
const UnifiedCandidateProfile = lazy(() => import("./pages/UnifiedCandidateProfile"));
const MeetingNotes = lazy(() => import("./pages/MeetingNotes"));
const ModuleEdit = lazy(() => import("./pages/ModuleEdit"));
const CourseEdit = lazy(() => import("./pages/CourseEdit"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const EnhancedProfile = lazy(() => import("./pages/EnhancedProfile"));
const PublicUserProfile = lazy(() => import("./pages/PublicUserProfile"));
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"));
const Referrals = lazy(() => import("./pages/Referrals"));
const InviteDashboard = lazy(() => import("./pages/InviteDashboard"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const InterviewPrepChat = lazy(() => import("./pages/InterviewPrepChat"));
const SalaryInsights = lazy(() => import("./pages/SalaryInsights"));
const CareerPath = lazy(() => import("./pages/CareerPath"));
const MeetingHistory = lazy(() => import("./pages/MeetingHistory"));
const MeetingIntelligence = lazy(() => import("./pages/MeetingIntelligence"));
const MeetingInsights = lazy(() => import("./pages/MeetingInsights"));
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
const AdminCandidates = lazy(() => import("./pages/AdminCandidates"));
const AssessmentsHub = lazy(() => import("./pages/admin/AssessmentsHub"));
const MergeDashboard = lazy(() => import("./pages/admin/MergeDashboard"));
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
const CandidateAnalytics = lazy(() => import("./pages/CandidateAnalytics"));
const PartnerAnalyticsDashboard = lazy(() => import("./pages/PartnerAnalyticsDashboard"));
const Achievements = lazy(() => import("./pages/Achievements"));
const FeedbackDatabase = lazy(() => import("./pages/FeedbackDatabase"));
const FunnelAnalytics = lazy(() => import("./pages/FunnelAnalytics"));
const ClubDJ = lazy(() => import("./pages/ClubDJ"));
const Radio = lazy(() => import("./pages/Radio"));
const RadioListen = lazy(() => import("./pages/RadioListen"));
const Assessments = lazy(() => import("./pages/Assessments"));
const SwipeGame = lazy(() => import("./pages/SwipeGame"));
const Miljoenenjacht = lazy(() => import("./pages/Miljoenenjacht"));
const Incubator20 = lazy(() => import("./pages/assessments/Incubator20"));
const PressureCooker = lazy(() => import("./pages/PressureCooker"));
const BlindSpotDetector = lazy(() => import("./pages/BlindSpotDetector"));
const ValuesPoker = lazy(() => import("./pages/ValuesPoker"));
const Inbox = lazy(() => import("./pages/Inbox"));
const DocumentManagement = lazy(() => import("./pages/DocumentManagement"));
const EmailSettings = lazy(() => import("./pages/EmailSettings"));
const BookingManagement = lazy(() => import("./pages/BookingManagement"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const ExpertMarketplace = lazy(() => import("./pages/ExpertMarketplace"));
const PartnerTargetCompanies = lazy(() => import("./pages/PartnerTargetCompanies"));
const TargetCompaniesOverview = lazy(() => import("./pages/admin/TargetCompaniesOverview"));

// Password Reset Pages
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordVerify from "./pages/ResetPasswordVerify";
import ResetPasswordMagicLink from "./pages/ResetPasswordMagicLink";
import ResetPasswordNew from "./pages/ResetPasswordNew";

// Club Projects
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const ProjectApplyPage = lazy(() => import("./pages/ProjectApplyPage"));
const ContractListPage = lazy(() => import("./pages/ContractListPage"));
const ContractDetailPage = lazy(() => import("./pages/ContractDetailPage"));
const ContractSignaturePage = lazy(() => import("./pages/ContractSignaturePage"));
const TimeTrackingPage = lazy(() => import("./pages/TimeTrackingPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Initialize QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      gcTime: 300000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <AuthProvider>
                  <ErrorBoundary>
                    <RoleProvider>
                      <ActivityTracker>
                        <NavigationHistoryProvider>
                          <MotionProvider>
                            <VideoPlayerProvider>
                              <Suspense fallback={<PageLoader />}>
                                <Routes>
                <Route path="/" element={
                  <RouteErrorBoundary>
                    <Navigate to="/auth" replace />
                  </RouteErrorBoundary>
                } />
                <Route path="/auth" element={
                  <RouteErrorBoundary>
                    <Auth />
                  </RouteErrorBoundary>
                } />
                <Route path="/privacy" element={
                  <RouteErrorBoundary>
                    <PrivacyPolicy />
                  </RouteErrorBoundary>
                } />
                <Route path="/terms" element={
                  <RouteErrorBoundary>
                    <TermsOfService />
                  </RouteErrorBoundary>
                } />
                <Route path="/book/:slug" element={
                  <RouteErrorBoundary>
                    <BookingPage />
                  </RouteErrorBoundary>
                } />
                <Route path="/share/:token" element={
                  <RouteErrorBoundary>
                    <SharedProfile />
                  </RouteErrorBoundary>
                 } />
          
          {/* Password Reset Routes */}
          <Route path="/forgot-password" element={
            <RouteErrorBoundary>
              <ForgotPassword />
            </RouteErrorBoundary>
          } />
          <Route path="/reset-password/verify" element={
            <RouteErrorBoundary>
              <ResetPasswordVerify />
            </RouteErrorBoundary>
          } />
          <Route path="/reset-password/verify-token" element={
            <RouteErrorBoundary>
              <ResetPasswordMagicLink />
            </RouteErrorBoundary>
          } />
          <Route path="/reset-password/new" element={
            <RouteErrorBoundary>
              <ResetPasswordNew />
            </RouteErrorBoundary>
          } />
          
          <Route path="/partner-funnel" element={<PartnerFunnel />} />
          <Route path="/partnership-submitted/:companyName" element={<PartnershipSubmitted />} />
          <Route path="/candidate-onboarding" element={<CandidateOnboarding />} />
          <Route
            path="/oauth-onboarding"
            element={
              <ProtectedRoute>
                <OAuthOnboarding />
              </ProtectedRoute>
            }
          />
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
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <ClubHome />
                  </ProtectedRoute>
                </RouteErrorBoundary>
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
              path="/candidates/:candidateId"
              element={
                <ProtectedRoute>
                  <UnifiedCandidateProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <Jobs />
                  </ProtectedRoute>
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/jobs/:jobId"
              element={
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <JobDetail />
                  </ProtectedRoute>
                </RouteErrorBoundary>
              }
            />
            
            {/* Club Projects Routes */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/apply"
              element={
                <ProtectedRoute>
                  <ProjectApplyPage />
                </ProtectedRoute>
              }
            />
            
            {/* Contract Management Routes */}
            <Route
              path="/contracts"
              element={
                <ProtectedRoute>
                  <ContractListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId"
              element={
                <ProtectedRoute>
                  <ContractDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId/sign"
              element={
                <ProtectedRoute>
                  <ContractSignaturePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractId/time-tracking"
              element={
                <ProtectedRoute>
                  <TimeTrackingPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/applications"
              element={
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <Applications />
                  </ProtectedRoute>
                </RouteErrorBoundary>
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
              path="/invites"
              element={
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <InviteDashboard />
                  </ProtectedRoute>
                </RouteErrorBoundary>
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
              path="/salary-insights"
              element={
                <ProtectedRoute>
                  <SalaryInsights />
                </ProtectedRoute>
              }
            />
            <Route
              path="/career-path"
              element={
                <ProtectedRoute>
                  <CareerPath />
                </ProtectedRoute>
              }
            />
            {/* Redirect old meeting-history route to unified meetings page */}
            <Route path="/meeting-history" element={<Navigate to="/meetings?tab=history" replace />} />
            <Route
              path="/meeting-intelligence"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <MeetingIntelligence />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="/meetings/:meetingId/insights" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <MeetingInsights />
                </Suspense>
              </ProtectedRoute>
            } />
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
              path="/admin/candidates"
              element={
                <ProtectedRoute>
                  <AdminCandidates />
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
              path="/admin/merge-dashboard"
              element={
                <ProtectedRoute>
                  <MergeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assessments-hub"
              element={
                <ProtectedRoute>
                  <AssessmentsHub />
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
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                </RouteErrorBoundary>
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
              path="/candidate/analytics"
              element={
                <ProtectedRoute>
                  <CandidateAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/analytics"
              element={
                <ProtectedRoute>
                  <PartnerAnalyticsDashboard />
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
            <Route path="/meetings/:meetingId/notes" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MeetingNotes /></Suspense></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
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
            <Route
              path="/assessments/incubator-20"
              element={
                <ProtectedRoute>
                  <Incubator20 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/pressure-cooker"
              element={
                <ProtectedRoute>
                  <PressureCooker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/blind-spot-detector"
              element={
                <ProtectedRoute>
                  <BlindSpotDetector />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/values-poker"
              element={
                <ProtectedRoute>
                  <ValuesPoker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/documents"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <DocumentManagement />
                  </RouteErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/email"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <EmailSettings />
                  </RouteErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-management"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <BookingManagement />
                  </RouteErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-settings"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <CompanySettings />
                  </RouteErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expert-marketplace"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <ExpertMarketplace />
                  </RouteErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/targets"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PartnerTargetCompanies />
                  </RouteErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/target-companies"
              element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <TargetCompaniesOverview />
                  </RouteErrorBoundary>
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
      </ActivityTracker>
      </RoleProvider>
      </ErrorBoundary>
      </AuthProvider>
      </ErrorBoundary>
      </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
