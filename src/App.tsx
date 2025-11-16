import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicProviders } from "@/contexts/PublicProviders";
import { ProtectedProviders, ProtectedProvidersLoader } from "@/contexts/ProtectedProviders";
import { FeedbackButton } from "@/components/FeedbackButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { TranslationDebugger } from "@/components/TranslationDebugger";
import { lazy, Suspense, useState, useEffect, memo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n/config";
import { useQueryClient } from "@tanstack/react-query";

// Optimized: Memoized component with scoped invalidation to prevent full app re-renders
const LanguageSync = memo(() => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('[App] Language changed to:', lng);
      
      // Scoped invalidation: Only invalidate i18n-dependent queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          // Only invalidate queries that depend on language (e.g., translations, content)
          return query.queryKey.some((key) => 
            typeof key === 'string' && (key.includes('translation') || key.includes('content'))
          );
        }
      });
      
      // Update document attributes for accessibility and RTL
      document.documentElement.lang = lng;
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    // Set initial state
    handleLanguageChange(i18n.language);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [queryClient]);
  
  return null;
});

// Critical: Only eager load Auth page for fastest FCP
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load ALL other routes (public + protected) to reduce initial bundle
const SharedProfile = lazy(() => import("./pages/SharedProfile"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const PartnerFunnel = lazy(() => import("./pages/PartnerFunnel"));
const PartnershipSubmitted = lazy(() => import("./pages/PartnershipSubmitted"));
const CandidateOnboarding = lazy(() => import("./pages/CandidateOnboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));

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
const ClubPilot = lazy(() => import("./pages/ClubPilot"));
const ObjectiveWorkspace = lazy(() => import("./pages/ObjectiveWorkspace"));
const ClubAI = lazy(() => import("./pages/ClubAI"));
const Academy = lazy(() => import("./pages/Academy"));
const AcademyCreatorHub = lazy(() => import("./pages/AcademyCreatorHub"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetail"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const ModuleManagement = lazy(() => import("./pages/ModuleManagement"));
const CertificateVerification = lazy(() => import("./pages/CertificateVerification"));
const MySkillsPage = lazy(() => import("./pages/MySkillsPage"));
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
const EnhancedMLDashboard = lazy(() => import("./pages/EnhancedMLDashboard"));
const HiringIntelligenceHub = lazy(() => import("./pages/HiringIntelligenceHub"));
const TranslationManager = lazy(() => import("./pages/admin/TranslationManager"));
const LanguageManager = lazy(() => import("./pages/admin/LanguageManager"));
const MeetingHistory = lazy(() => import("./pages/MeetingHistory"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const RevenueAnalytics = lazy(() => import("./pages/RevenueAnalytics"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));
const MLDashboard = lazy(() => import("./pages/MLDashboard"));
const InteractionEntry = lazy(() => import("./pages/InteractionEntry"));
const CompanyIntelligence = lazy(() => import("./pages/CompanyIntelligence"));
const WhatsAppImport = lazy(() => import("./pages/WhatsAppImport"));
const InteractionsFeed = lazy(() => import("./pages/InteractionsFeed"));
const CompanyDomainsSettings = lazy(() => import("./pages/CompanyDomainsSettings"));
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
const MemberRequestsPage = lazy(() => import("./pages/admin/MemberRequestsPage"));

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

// PageLoader with aggressive timeout and emergency fallback
const PageLoader = () => {
  const [showError, setShowError] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Show error after 5 seconds
    const errorTimer = setTimeout(() => {
      console.error('[PageLoader] ⏰ Loading timeout - showing error UI');
      setShowError(true);
    }, 5000);

    // Countdown for reload button
    if (showError) {
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }

    return () => clearTimeout(errorTimer);
  }, [showError]);

  if (showError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Page Taking Too Long
            </h1>
            <p className="text-muted-foreground mb-4">
              The application is loading slowly. This might be due to network issues or server problems.
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
              size="lg"
            >
              Reload Page {countdown > 0 && `(${countdown}s)`}
            </Button>
            <Button 
              onClick={() => window.location.href = '/auth'}
              variant="outline"
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If this persists, please clear your browser cache or try a different browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
};

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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LanguageSync />
          <TranslationDebugger />
          <Routes>
            {/* Public Routes - Minimal providers for fastest FCP */}
            <Route
              path="/"
              element={<Navigate to="/auth" replace />}
            />
            <Route
              path="/auth"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Auth />
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/profile/:username"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <SharedProfile />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/book/:slug"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <BookingPage />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/partner"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <PartnerFunnel />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/partner/submitted"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <PartnershipSubmitted />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/onboarding"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <CandidateOnboarding />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/pending-approval"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <PendingApproval />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/privacy"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <PrivacyPolicy />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/terms"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <TermsOfService />
                    </Suspense>
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <ForgotPassword />
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/reset-password/verify"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <ResetPasswordVerify />
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/reset-password/verify-token"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <ResetPasswordMagicLink />
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />
            <Route
              path="/reset-password/new"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <ResetPasswordNew />
                  </RouteErrorBoundary>
                </PublicProviders>
              }
            />

            {/* Protected Routes - Full providers loaded after auth */}
            <Route
              path="/home"
              element={
                <PublicProviders>
                  <Suspense fallback={<ProtectedProvidersLoader />}>
                    <ProtectedProviders>
                      <ProtectedRoute>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}>
                            <ClubHome />
                          </Suspense>
                        </RouteErrorBoundary>
                      </ProtectedRoute>
                    </ProtectedProviders>
                  </Suspense>
                </PublicProviders>
              }
            />
            {/* All other protected routes - wrap with protected providers */}
            <Route path="*" element={
              <PublicProviders>
                <Suspense fallback={<ProtectedProvidersLoader />}>
                  <ProtectedProviders>
                    <Routes>
                      <Route path="/club-ai" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ClubAI /></Suspense></ProtectedRoute>} />
                      <Route path="/jobs" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Jobs /></Suspense></ProtectedRoute>} />
                      <Route path="/jobs/:jobId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><JobDetail /></Suspense></ProtectedRoute>} />
                      <Route path="/jobs/:jobId/dashboard" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><JobDashboard /></Suspense></ProtectedRoute>} />
                      <Route path="/candidates/:candidateId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><UnifiedCandidateProfile /></Suspense></ProtectedRoute>} />
                      <Route path="/meetings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Meetings /></Suspense></ProtectedRoute>} />
                      <Route path="/meetings/:meetingId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MeetingRoom /></Suspense></ProtectedRoute>} />
                      <Route path="/oauth-onboarding" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><OAuthOnboarding /></Suspense></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <FeedbackButton />
                  </ProtectedProviders>
                </Suspense>
              </PublicProviders>
            } />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
