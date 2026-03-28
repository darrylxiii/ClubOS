import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useReducedMotion } from '@/lib/motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import quantumLogoLight from '@/assets/quantum-logo-dark.png';
import quantumLogoDark from '@/assets/quantum-club-logo.png';
import { GlobalFooter } from '@/components/GlobalFooter';
import { AuthVisualShell } from '@/components/auth/AuthVisualShell';

const APP_DISPLAY_NAME = 'The Quantum Club OS';

/**
 * Public marketing home at `/` — Google OAuth verification: visible H1 + Privacy Policy.
 * Sign-in transitions into the dedicated `/auth` full-page experience.
 */
export default function PublicHome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('common');
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const transitionTimerRef = useRef<number | null>(null);

  const startAuthTransition = useCallback(() => {
    if (authTransitioning) return;
    setAuthTransitioning(true);
    const delayMs = shouldReduceMotion ? 120 : 460;
    transitionTimerRef.current = window.setTimeout(() => {
      navigate('/auth');
    }, delayMs);
  }, [authTransitioning, navigate, shouldReduceMotion]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (searchParams.get('signin') !== '1') return;
    startAuthTransition();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('signin');
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams, startAuthTransition]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden />
        <span className="sr-only">{t('loading', 'Loading…')}</span>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>
          {APP_DISPLAY_NAME} — {t('publicHome.taglineShort', 'Elite career operating system')}
        </title>
        <meta
          name="description"
          content={t(
            'publicHome.metaDescription',
            'The Quantum Club OS — invite-only platform for executive career management, hiring, and syndicate access.'
          )}
        />
      </Helmet>

      <AuthVisualShell innerClassName="justify-between px-4 py-12">
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center w-full"
        >
          <motion.div
            className="w-full max-w-lg text-center space-y-8"
            initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            animate={
              authTransitioning
                ? { opacity: 0, scale: 0.985, y: -20, filter: 'blur(6px)' }
                : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
            }
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex justify-center">
              <img
                src={quantumLogoDark}
                alt={APP_DISPLAY_NAME}
                className="h-20 w-auto dark:hidden"
                width={200}
                height={80}
              />
              <img
                src={quantumLogoLight}
                alt={APP_DISPLAY_NAME}
                className="h-20 w-auto hidden dark:block"
                width={200}
                height={80}
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {APP_DISPLAY_NAME}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                {t(
                  'publicHome.subtitle',
                  'Private syndicate access and elite career management — sign in to continue.'
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                type="button"
                size="lg"
                className="rounded-xl"
                onClick={startAuthTransition}
                disabled={authTransitioning}
              >
                {t('publicHome.signIn', 'Sign in')}
              </Button>
            </div>

            <nav
              className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
              aria-label={t('publicHome.legalNavLabel', 'Legal')}
            >
              <Link
                to="/legal/privacy"
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                {t('footer.privacy_policy', 'Privacy Policy')}
              </Link>
              <Link
                to="/legal/terms"
                className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
              >
                {t('footer.terms_of_service', 'Terms of Service')}
              </Link>
              <Link
                to="/legal"
                className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
              >
                {t('footer.all_legal', 'All Legal')}
              </Link>
            </nav>
          </motion.div>
        </main>

        <GlobalFooter variant="minimal" className="relative z-10 shrink-0 border-t-0 bg-transparent" />
        <AnimatePresence>
          {authTransitioning && (
            <motion.div
              key="auth-route-transition"
              className="fixed inset-0 z-50 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="absolute inset-0 bg-background/70"
                initial={{ backdropFilter: 'blur(0px)' }}
                animate={{ backdropFilter: shouldReduceMotion ? 'blur(0px)' : 'blur(16px)' }}
                transition={{ duration: shouldReduceMotion ? 0.1 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <motion.div
                  className="rounded-2xl border border-border/30 bg-card/65 px-6 py-5 backdrop-blur-xl shadow-glass-md"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96, filter: 'blur(8px)' }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={shouldReduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 }}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {t('publicHome.enteringAuth', 'Entering secure sign in…')}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthVisualShell>
    </>
  );
}
