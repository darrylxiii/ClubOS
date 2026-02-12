// Initialize Sentry first, before any other imports
import { initSentry } from "@/lib/sentry";
initSentry();

import { TracingProvider } from "@/lib/tracing/TracingProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicProviders } from "@/contexts/PublicProviders";
import { ProtectedProviders, ProtectedProvidersLoader } from "@/contexts/ProtectedProviders";
import { AuthProvider } from "@/contexts/AuthContext";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import { TranslationProvider } from "@/providers/TranslationProvider";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense, memo, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";
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
const GuestBookingPortal = lazy(() => import("./pages/GuestBookingPortal"));
const PartnerFunnel = lazy(() => import("./pages/PartnerFunnel"));
const PartnershipSubmitted = lazy(() => import("./pages/PartnershipSubmitted"));
const CandidateOnboarding = lazy(() => import("./pages/CandidateOnboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const ApplicationStatusPortal = lazy(() => import("./pages/ApplicationStatusPortal"));
const OAuthOnboarding = lazy(() => import("./pages/OAuthOnboarding"));
const ClubHome = lazy(() => import("./pages/ClubHome"));

// Legal & Public Pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const LegalHub = lazy(() => import("./pages/legal/LegalHub"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/legal/AcceptableUsePolicy"));
const SecurityPolicy = lazy(() => import("./pages/legal/SecurityPolicy"));
const ReferralTerms = lazy(() => import("./pages/legal/ReferralTerms"));
const AccessibilityStatement = lazy(() => import("./pages/legal/AccessibilityStatement"));
const DataProcessingAgreement = lazy(() => import("./pages/legal/DataProcessingAgreement"));

// Misc Protected Pages
const ClubAI = lazy(() => import("./pages/ClubAI"));
const SocialManagement = lazy(() => import("./pages/SocialManagement"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding"));
const PartnerWelcome = lazy(() => import("./pages/PartnerWelcome"));
const WhatsAppImport = lazy(() => import("./pages/WhatsAppImport"));
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
const MyCommunications = lazy(() => import("./pages/MyCommunications"));
const PartnerRelationships = lazy(() => import("./pages/PartnerRelationships"));

// PageLoader is now imported from @/components/PageLoader

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

// Expose queryClient globally for invokeEdgeFunction guard
(window as any).__QUERY_CLIENT__ = queryClient;

// Only enable tracing in development for debugging - reduces production overhead
const isTracingEnabled = import.meta.env.DEV;

const App = () => {
  return (
    <SentryErrorBoundary>
      <HelmetProvider>
      <TracingProvider enabled={isTracingEnabled}>
        <QueryClientProvider client={queryClient}>
          <TranslationProvider>
          <BrowserRouter>
            <AuthProvider>
              <PostHogProvider>
                <Toaster />
                <Sonner />
                <LanguageSync />
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
                <Route path="/booking/:bookingId/guest/:accessToken" element={
                  <PublicProviders>
                    <RouteErrorBoundary>
                      <Suspense fallback={<PageLoader />}><GuestBookingPortal /></Suspense>
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
                <Route path="/application/status/:token" element={
                  <PublicProviders>
                    <RouteErrorBoundary>
                      <Suspense fallback={<PageLoader />}><ApplicationStatusPortal /></Suspense>
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
                <Route path="/partner-welcome" element={
                  <PublicProviders>
                    <RouteErrorBoundary>
                      <Suspense fallback={<PageLoader />}><PartnerWelcome /></Suspense>
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
                  <Route path="/communication-intelligence" element={<Navigate to="/admin/communication-hub?tab=intelligence" replace />} />
                  <Route path="/my-communications" element={<MyCommunications />} />
                  <Route path="/communication-analytics" element={<Navigate to="/admin/communication-hub?tab=analytics" replace />} />
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
      </QueryClientProvider>
      </TracingProvider>
      </HelmetProvider>
    </SentryErrorBoundary>
  );
};

export default App;
