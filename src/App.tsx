// Initialize Sentry first, before any other imports
import { initSentry } from "@/lib/sentry";
initSentry();

import { TracingProvider } from "@/lib/tracing/TracingProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicProviders } from "@/contexts/PublicProviders";
import { ProtectedProvidersLoader } from "@/contexts/ProtectedProviders";
import { AuthProvider } from "@/contexts/AuthContext";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import { TranslationProvider } from "@/providers/TranslationProvider";
import { LanguageSelector } from "@/components/LanguageSelector";
import { lazy, Suspense, memo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import i18n, { preloadNamespacesForRoute } from "@/i18n/config";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslationContext } from "@/providers/TranslationProvider";
import { sharedRoutes } from "@/routes/shared.routes";
import { candidateRoutes } from "@/routes/candidate.routes";
import { AdminAssessmentsRoutes } from "@/routes/admin-assessments.routes";
import { adminRoutes } from "@/routes/admin.routes";
import { partnerRoutes } from "@/routes/partner.routes";
import { analyticsRoutes } from "@/routes/analytics.routes";
import { meetingsRoutes } from "@/routes/meetings.routes";
import { jobsRoutes } from "@/routes/jobs.routes";
import { profilesRoutes } from "@/routes/profiles.routes";
import { projectsRoutes } from "@/routes/projects.routes";
import { crmRoutes } from "@/routes/crm.routes";

// Optimized: Memoized component with scoped invalidation to prevent full app re-renders
const LanguageSync = memo(() => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      // Scoped invalidation: Only invalidate i18n-dependent queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey.some((key) =>
            typeof key === 'string' && (key.includes('translation') || key.includes('content'))
          );
        }
      });

      document.documentElement.lang = lng;
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    };

    i18n.on('languageChanged', handleLanguageChange);
    handleLanguageChange(i18n.language);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [queryClient]);

  return null;
});

// Route-based namespace preloader - must be inside BrowserRouter
const RouteNamespaceLoader = memo(() => {
  const location = useLocation();
  const { isReady } = useTranslationContext();

  useEffect(() => {
    if (isReady) {
      preloadNamespacesForRoute(location.pathname);
    }
  }, [location.pathname, isReady]);

  return null;
});

// Critical: Only eager load Auth page for fastest FCP
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// PWA Components
const InstallPromptBanner = lazy(() => import("./components/pwa/InstallPromptBanner").then(m => ({ default: m.InstallPromptBanner })));
const UpdateAvailableBanner = lazy(() => import("./components/pwa/UpdateAvailableBanner").then(m => ({ default: m.UpdateAvailableBanner })));
const Install = lazy(() => import("./pages/Install"));

// Lazy load ALL other routes
const SharedProfile = lazy(() => import("./pages/SharedProfile"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const GuestBookingPage = lazy(() => import("./pages/GuestBookingPage"));
const PartnerFunnel = lazy(() => import("./pages/PartnerFunnel"));
const PartnershipSubmitted = lazy(() => import("./pages/PartnershipSubmitted"));
const CandidateOnboarding = lazy(() => import("./pages/CandidateOnboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const OAuthOnboarding = lazy(() => import("./pages/OAuthOnboarding"));
const ClubHome = lazy(() => import("./pages/ClubHome"));

// Legal & Public Pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

// Misc Protected Pages
const ClubAI = lazy(() => import("./pages/ClubAI"));
const SocialManagement = lazy(() => import("./pages/SocialManagement"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding"));
const SalaryInsights = lazy(() => import("./pages/SalaryInsights"));
const CareerPath = lazy(() => import("./pages/CareerPath"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ExpertMarketplace = lazy(() => import("./pages/ExpertMarketplace"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const SupportTicketList = lazy(() => import("./pages/support/SupportTicketList"));
const SupportTicketNew = lazy(() => import("./pages/support/SupportTicketNew"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));

// Password Reset Pages
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordVerify from "./pages/ResetPasswordVerify";
import ResetPasswordMagicLink from "./pages/ResetPasswordMagicLink";
import ResetPasswordNew from "./pages/ResetPasswordNew";

// Live Hub
const LiveHub = lazy(() => import("./pages/LiveHub"));
const CommunicationIntelligence = lazy(() => import("./pages/CommunicationIntelligence"));
const MyCommunications = lazy(() => import("./pages/MyCommunications"));
const PartnerRelationships = lazy(() => import("./pages/PartnerRelationships"));
const CommunicationAnalyticsPage = lazy(() => import("@/components/communication/CommunicationAnalyticsDashboard").then(m => ({ default: m.CommunicationAnalyticsDashboard })));

// PageLoader is now imported from @/components/PageLoader

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

// Configure Persistence (LocalStorage)
const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// Only enable tracing in development for debugging - reduces production overhead
const isTracingEnabled = import.meta.env.DEV;

const App = () => {
  return (
    <SentryErrorBoundary>
      <TracingProvider enabled={isTracingEnabled}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }} // 24 hours
        >
          <TranslationProvider>
            <BrowserRouter>
              <AuthProvider>
                <PostHogProvider>
                  <Toaster />
                  <Sonner />
                  <LanguageSync />
                  <RouteNamespaceLoader />
                  <LanguageSelector />
                  {/* PWA Banners */}
                  <Suspense fallback={null}>
                    <InstallPromptBanner />
                    <UpdateAvailableBanner />
                  </Suspense>

                  <Routes>
                    {/* Install Page */}
                    <Route path="/install" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><Install /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />

                    {/* Public Routes */}
                    <Route path="/" element={<Navigate to="/auth" replace />} />
                    <Route path="/auth" element={
                      <PublicProviders>
                        <RouteErrorBoundary><Auth /></RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/profile/:username" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><SharedProfile /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/book/:slug" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><BookingPage /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/bookings/:bookingId" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><GuestBookingPage /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/partner" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><PartnerFunnel /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/partner-funnel" element={<Navigate to="/partner" replace />} />
                    <Route path="/partnership-submitted/:companyName" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><PartnershipSubmitted /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/partner/submitted" element={<Navigate to="/partnership-submitted/partner" replace />} />
                    <Route path="/onboarding" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><CandidateOnboarding /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/pending-approval" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><PendingApproval /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/oauth-onboarding" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><OAuthOnboarding /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/privacy" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/terms" element={
                      <PublicProviders>
                        <RouteErrorBoundary>
                          <Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>
                        </RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/forgot-password" element={
                      <PublicProviders>
                        <RouteErrorBoundary><ForgotPassword /></RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/reset-password/verify" element={
                      <PublicProviders>
                        <RouteErrorBoundary><ResetPasswordVerify /></RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/reset-password/verify-token" element={
                      <PublicProviders>
                        <RouteErrorBoundary><ResetPasswordMagicLink /></RouteErrorBoundary>
                      </PublicProviders>
                    } />
                    <Route path="/reset-password/new" element={
                      <PublicProviders>
                        <RouteErrorBoundary><ResetPasswordNew /></RouteErrorBoundary>
                      </PublicProviders>
                    } />

                    {/* Protected Routes */}
                    <Route element={
                      <PublicProviders>
                        <Suspense fallback={<ProtectedProvidersLoader />}>
                          <ProtectedLayout />
                        </Suspense>
                      </PublicProviders>
                    }>
                      <Route path="/home" element={<ClubHome />} />
                      {sharedRoutes}
                      {candidateRoutes}
                      {adminRoutes}
                      {AdminAssessmentsRoutes}
                      {partnerRoutes}
                      {analyticsRoutes}
                      {meetingsRoutes}
                      {jobsRoutes}
                      {profilesRoutes}
                      {projectsRoutes}
                      {crmRoutes}

                      <Route path="/support/tickets" element={<SupportTicketList />} />
                      <Route path="/support/tickets/new" element={<SupportTicketNew />} />
                      <Route path="/help" element={<KnowledgeBase />} />
                      <Route path="/partner/relationships" element={<PartnerRelationships />} />
                      <Route path="/live-hub" element={<LiveHub />} />
                      <Route path="/club-ai" element={<ClubAI />} />
                      <Route path="/communication-intelligence" element={<CommunicationIntelligence />} />
                      <Route path="/my-communications" element={<MyCommunications />} />
                      <Route path="/communication-analytics" element={<CommunicationAnalyticsPage />} />
                      <Route path="/social-management" element={<SocialManagement />} />
                      <Route path="/partner-onboarding" element={<PartnerOnboarding />} />
                      <Route path="/whatsapp-import" element={<Navigate to="/admin/whatsapp?tab=import" replace />} />
                      <Route path="/salary-insights" element={<SalaryInsights />} />
                      <Route path="/career-path" element={<CareerPath />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/expert-marketplace" element={<ExpertMarketplace />} />
                      <Route path="/agent-dashboard" element={<AgentDashboard />} />

                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </PostHogProvider>
              </AuthProvider>
            </BrowserRouter>
          </TranslationProvider>
        </PersistQueryClientProvider>
      </TracingProvider>
    </SentryErrorBoundary>
  );
};

export default App;
