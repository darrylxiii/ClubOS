import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicProviders } from "@/contexts/PublicProviders";
import { ProtectedProviders, ProtectedProvidersLoader } from "@/contexts/ProtectedProviders";
import { FeedbackButton } from "@/components/FeedbackButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JobDashboardRoute } from "@/components/routes/JobDashboardRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { TranslationDebugger } from "@/components/TranslationDebugger";
import { lazy, Suspense, useState, useEffect, memo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n/config";
import { useQueryClient } from "@tanstack/react-query";
import { sharedRoutes } from "@/routes/shared.routes";
import { candidateRoutes } from "@/routes/candidate.routes";
import { AdminAssessmentsRoutes } from "@/routes/admin-assessments.routes";
import { adminRoutes } from "@/routes/admin.routes";
import { partnerRoutes } from "@/routes/partner.routes";
import { analyticsRoutes } from "@/routes/analytics.routes";
import { meetingsRoutes } from "@/routes/meetings.routes";
import { jobsRoutes } from "@/routes/jobs.routes";
import { profilesRoutes } from "@/routes/profiles.routes";
import { QuickAccessHub } from '@/components/QuickAccessHub';
import { CookieConsentBanner } from '@/components/support/CookieConsentBanner';

// Optimized: Memoized component with scoped invalidation to prevent full app re-renders
const LanguageSync = memo(() => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      
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
const OAuthOnboarding = lazy(() => import("./pages/OAuthOnboarding"));
const ClubHome = lazy(() => import("./pages/ClubHome"));

// Legal & Public Pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const InviteAcceptance = lazy(() => import("./pages/InviteAcceptance"));
const InviteComplete = lazy(() => import("./pages/InviteComplete"));

// Misc Protected Pages (not in dedicated route files yet)
const ClubAI = lazy(() => import("./pages/ClubAI"));
const SocialManagement = lazy(() => import("./pages/SocialManagement"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding"));
const WhatsAppImport = lazy(() => import("./pages/WhatsAppImport"));
const SalaryInsights = lazy(() => import("./pages/SalaryInsights"));
const CareerPath = lazy(() => import("./pages/CareerPath"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const ExpertMarketplace = lazy(() => import("./pages/ExpertMarketplace"));
const SupportTicketList = lazy(() => import("./pages/support/SupportTicketList"));
const SupportTicketNew = lazy(() => import("./pages/support/SupportTicketNew"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));

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
              path="/oauth-onboarding"
              element={
                <PublicProviders>
                  <RouteErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <OAuthOnboarding />
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
                      {/* Shared Routes - Available to all roles */}
                      {sharedRoutes}
                      
                      {/* Candidate Routes */}
                      {candidateRoutes}
                      
                      {/* Admin Routes */}
                      {adminRoutes}
                      {AdminAssessmentsRoutes}
                      
                      {/* Partner Routes */}
                      {partnerRoutes}
                      
                      {/* Analytics Routes */}
                      {analyticsRoutes}
                      
                      {/* Meetings Routes */}
                      {meetingsRoutes}
                      
                      {/* Jobs Routes */}
                      {jobsRoutes}
                      
                      {/* Profile Routes */}
                      {profilesRoutes}
                      
                      {/* Support & Help */}
                      <Route path="/support/tickets" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SupportTicketList /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/support/tickets/new" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SupportTicketNew /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/help" element={<RouteErrorBoundary><Suspense fallback={<PageLoader />}><KnowledgeBase /></Suspense></RouteErrorBoundary>} />
                      
                      {/* Remaining Misc Routes */}
                      <Route path="/club-ai" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ClubAI /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/social-management" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SocialManagement /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/partner-onboarding" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><PartnerOnboarding /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/whatsapp-import" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><WhatsAppImport /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/salary-insights" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SalaryInsights /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/career-path" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CareerPath /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/subscription" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><Subscription /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/subscription/success" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SubscriptionSuccess /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      <Route path="/expert-marketplace" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ExpertMarketplace /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
                      
                      {/* 404 Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <QuickAccessHub />
                    <CookieConsentBanner />
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
