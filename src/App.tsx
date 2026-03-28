// Build cache reset: 2026-03-01

import { lazy, Suspense, memo, useEffect } from 'react';
import { TracingProvider } from '@/lib/tracing/TracingProvider';

import { Toaster as Sonner } from '@/components/ui/sonner';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicProviders } from '@/contexts/PublicProviders';
// PERF: Lazy-load protected-route shell — unauthenticated users never pay for it
const ProtectedProvidersModule = import('@/contexts/ProtectedProviders');
const ProtectedProvidersLoader = lazy(() =>
  ProtectedProvidersModule.then((m) => ({ default: m.ProtectedProvidersLoader }))
);
import { AuthProvider } from '@/contexts/AuthContext';
// PostHog lazy-loaded to defer ~90KB posthog-js SDK from root chunk
const LazyPostHogProvider = lazy(() =>
  import('@/providers/PostHogProvider').then((m) => ({ default: m.PostHogProvider }))
);
// PERF: ProtectedLayout is lazy – the entire 500KB+ shell (sidebar, header,
// spotlight, music player) only loads after auth succeeds.
const ProtectedLayout = lazy(() =>
  import('@/components/ProtectedLayout').then((m) => ({ default: m.ProtectedLayout }))
);
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { SentryErrorBoundary } from '@/components/SentryErrorBoundary';
import { TranslationProvider } from '@/providers/TranslationProvider';
import { LanguageSelector } from '@/components/LanguageSelector';
import { SEOHelmet } from '@/components/SEO/SEOHelmet';
import { HelmetProvider } from 'react-helmet-async';
import { PageLoader } from '@/components/PageLoader';
import i18n, { loadDeferredEnglish } from '@/i18n/config';
import { useQueryClient } from '@tanstack/react-query';

// PERF: Kick off deferred English locale loading after initial paint
// This merges the full common.json (~640KB) asynchronously
requestIdleCallback?.(() => loadDeferredEnglish()) ?? setTimeout(() => loadDeferredEnglish(), 100);

import { useGeoLocale } from '@/hooks/useGeoLocale';

// Optimized: Memoized component with scoped invalidation to prevent full app re-renders
const LanguageSync = memo(() => {
  const queryClient = useQueryClient();
  
  // Initialize geo-detection silently
  useGeoLocale();

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      // Scoped invalidation: Only invalidate i18n-dependent queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey.some(
            (key) =>
              typeof key === 'string' && (key.includes('translation') || key.includes('content'))
          );
        },
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

// PERF: Lazy load Auth and NotFound pages to massively shrink the main index chunk
// The auth chunk will be fetched immediately after the tiny index chunk executes
const Auth = lazy(() => import('./pages/Auth'));
const PublicHome = lazy(() => import('./pages/PublicHome'));
const NotFound = lazy(() => import('./pages/NotFound'));

// PWA Components
const InstallPromptBanner = lazy(() =>
  import('./components/pwa/InstallPromptBanner').then((m) => ({ default: m.InstallPromptBanner }))
);
const UpdateAvailableBanner = lazy(() =>
  import('./components/pwa/UpdateAvailableBanner').then((m) => ({
    default: m.UpdateAvailableBanner,
  }))
);
const Install = lazy(() => import('./pages/Install'));


const PartnerWelcome = lazy(() => import('./pages/PartnerWelcome'));
const PartnerSetup = lazy(() => import('./pages/PartnerSetup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordVerify = lazy(() => import('./pages/ResetPasswordVerify'));
const ResetPasswordMagicLink = lazy(() => import('./pages/ResetPasswordMagicLink'));
const ResetPasswordNew = lazy(() => import('./pages/ResetPasswordNew'));
const ResetPasswordSuccess = lazy(() => import('./pages/ResetPasswordSuccess'));
const MfaSetup = lazy(() => import('./pages/MfaSetup'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// Lazy load ALL other routes
const ProtectedAppRoutes = lazy(() => import('@/routes/ProtectedAppRoutes'));
const SharedProfile = lazy(() => import('./pages/SharedProfile'));
const PublicCourseView = lazy(() => import('./pages/PublicCourseView'));
const CertificateVerify = lazy(() => import('./pages/CertificateVerify'));
const SharedPipelineView = lazy(() => import('./pages/SharedPipelineView'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const GuestBookingPage = lazy(() => import('./pages/GuestBookingPage'));
const GuestBookingPortal = lazy(() => import('./pages/GuestBookingPortal'));
const PartnerFunnel = lazy(() => import('./pages/PartnerFunnel'));
const PartnershipSubmitted = lazy(() => import('./pages/PartnershipSubmitted'));
const CandidateOnboarding = lazy(() => import('./pages/CandidateOnboarding'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const ApplicationStatusPortal = lazy(() => import('./pages/ApplicationStatusPortal'));
const OAuthOnboarding = lazy(() => import('./pages/OAuthOnboarding'));
// Legal & Public Pages
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const LegalHub = lazy(() => import('./pages/legal/LegalHub'));
const DataProcessingAgreement = lazy(() => import('./pages/legal/DataProcessingAgreement'));
const AcceptableUsePolicy = lazy(() => import('./pages/legal/AcceptableUsePolicy'));
const AITransparencyPolicy = lazy(() => import('./pages/legal/AITransparencyPolicy'));
const CCPANotice = lazy(() => import('./pages/legal/CCPANotice'));
const ModernSlaveryStatement = lazy(() => import('./pages/legal/ModernSlaveryStatement'));
const DisclaimerPolicy = lazy(() => import('./pages/legal/DisclaimerPolicy'));
const DataTransferPolicy = lazy(() => import('./pages/legal/DataTransferPolicy'));
const CookiePolicy = lazy(() => import('./pages/legal/CookiePolicy'));
const SecurityPolicy = lazy(() => import('./pages/legal/SecurityPolicy'));
const ReferralTerms = lazy(() => import('./pages/legal/ReferralTerms'));
const AccessibilityStatement = lazy(() => import('./pages/legal/AccessibilityStatement'));
const WhistleblowerPolicy = lazy(() => import('./pages/legal/WhistleblowerPolicy'));
const ThirdPartyRegistry = lazy(() => import('./pages/legal/ThirdPartyRegistry'));
const LGPDNotice = lazy(() => import('./pages/legal/LGPDNotice'));
const POPIANotice = lazy(() => import('./pages/legal/POPIANotice'));


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
(window as unknown as { __QUERY_CLIENT__: typeof queryClient }).__QUERY_CLIENT__ = queryClient;

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
                  <Suspense fallback={null}>
                    <LazyPostHogProvider>
                      <Sonner />
                      {/* Skip to content — accessibility */}
                      <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-glass-lg focus:outline-none"
                      >
                        Skip to main content
                      </a>
                      <LanguageSync />
                      <LanguageSelector />
                      <SEOHelmet />
                      {/* PWA Banners */}
                      <Suspense fallback={null}>
                        <InstallPromptBanner />
                        <UpdateAvailableBanner />
                      </Suspense>

                      <Routes>
                        {/* Install Page */}
                        <Route
                          path="/install"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <Install />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />

                        {/* Public Routes */}
                        <Route
                          path="/"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <PublicHome />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
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
                          path="/pipeline/:token"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <SharedPipelineView />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        {/* Public Academy Routes */}
                        <Route
                          path="/learn/:slug"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <PublicCourseView />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/learn/share/:token"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <PublicCourseView />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/certificates/verify/:code"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <CertificateVerify />
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
                          path="/bookings/:bookingId"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <GuestBookingPage />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/booking/:bookingId/guest/:accessToken"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <GuestBookingPortal />
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
                          path="/partner-funnel"
                          element={<Navigate to="/partner" replace />}
                        />
                        <Route
                          path="/partnership-submitted/:companyName"
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
                          path="/partner/submitted"
                          element={<Navigate to="/partnership-submitted/partner" replace />}
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
                          path="/application/status/:token"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ApplicationStatusPortal />
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
                          path="/partner-welcome"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <PartnerWelcome />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/partner-setup"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <PartnerSetup />
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

                        {/* Legal Hub & Legal Pages */}
                        <Route
                          path="/legal"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <LegalHub />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/terms"
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
                          path="/legal/privacy"
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
                          path="/legal/dpa"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <DataProcessingAgreement />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/acceptable-use"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <AcceptableUsePolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/ai-transparency"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <AITransparencyPolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/ccpa"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <CCPANotice />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/modern-slavery"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ModernSlaveryStatement />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/disclaimer"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <DisclaimerPolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/cookies"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <CookiePolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/data-transfers"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <DataTransferPolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/security"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <SecurityPolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/referral-terms"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ReferralTerms />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/accessibility"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <AccessibilityStatement />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/whistleblower"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <WhistleblowerPolicy />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/third-party"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ThirdPartyRegistry />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/lgpd"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <LGPDNotice />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/legal/popia"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <POPIANotice />
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
                                <Suspense fallback={<PageLoader />}>
                                  <ForgotPassword />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/reset-password/verify"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ResetPasswordVerify />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/reset-password/verify-token"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ResetPasswordMagicLink />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/reset-password/new"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ResetPasswordNew />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/reset-password/success"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ResetPasswordSuccess />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/mfa-setup"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <MfaSetup />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />
                        <Route
                          path="/change-password"
                          element={
                            <PublicProviders>
                              <RouteErrorBoundary>
                                <Suspense fallback={<PageLoader />}>
                                  <ChangePassword />
                                </Suspense>
                              </RouteErrorBoundary>
                            </PublicProviders>
                          }
                        />

                        {/* Blog Routes moved inside protected layout below */}

                        {/* Protected Routes */}
                        <Route
                          element={
                            <PublicProviders>
                              <Suspense fallback={<ProtectedProvidersLoader />}>
                                <ProtectedLayout />
                              </Suspense>
                            </PublicProviders>
                          }
                        >
                          <Route path="*" element={<ProtectedAppRoutes />} />
                        </Route>
                      </Routes>
                    </LazyPostHogProvider>
                  </Suspense>
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
