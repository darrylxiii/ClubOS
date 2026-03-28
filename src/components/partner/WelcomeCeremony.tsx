import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Building2, Users, Shield, ShieldCheck, ArrowRight, Star, Clock, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import quantumLogoLight from '@/assets/quantum-logo-dark.png';

interface WelcomeCeremonyProps {
  partnerName: string;
  companyInfo: { name: string; role: string } | null;
  strategist: { name: string; email: string; avatarUrl?: string } | null;
  onComplete: () => void;
}

export function WelcomeCeremony({ partnerName, companyInfo, strategist, onComplete }: WelcomeCeremonyProps) {
  const { t } = useTranslation('partner');
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showAgreementReminder, setShowAgreementReminder] = useState(false);
  const mountedRef = useRef(true);

  // Safe reduced-motion detection (SSR-safe, reactive to changes)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const fullName = partnerName || 'Partner';
  const welcomeText = t('welcomeCeremony.welcome', 'Welcome, {{name}}', { name: fullName });

  // Phase progression
  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase(3);
      setTypedText(welcomeText);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 2000));
    timers.push(setTimeout(() => setPhase(2), 4500));
    timers.push(setTimeout(() => setPhase(3), 7000));

    return () => timers.forEach(clearTimeout);
  }, [prefersReducedMotion, welcomeText]);

  // Typewriter effect for Phase 1
  useEffect(() => {
    if (phase < 1 || prefersReducedMotion) return;
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      if (i < welcomeText.length) {
        setTypedText(welcomeText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [phase, welcomeText, prefersReducedMotion]);

  // Confetti on Phase 2
  useEffect(() => {
    if (phase === 2 && !prefersReducedMotion) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'],
      });
    }
  }, [phase, prefersReducedMotion]);

  const agreementsAccepted = dpaAccepted && termsAccepted;

  const handleEnter = useCallback(() => {
    if (!agreementsAccepted) {
      setShowAgreementReminder(true);
      return;
    }
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'],
      });
    }
    setTimeout(() => {
      if (mountedRef.current) onComplete();
    }, 600);
  }, [onComplete, prefersReducedMotion, agreementsAccepted]);

  const benefitItems = useMemo(() => [
    { icon: Clock, label: t('welcomeCeremony.slaGuarantee', '48h Candidate Shortlist SLA') },
    { icon: Star, label: t('welcomeCeremony.dedicatedStrategist', 'Dedicated Talent Strategist') },
    { icon: Shield, label: t('welcomeCeremony.prioritySourcing', 'Priority AI-Powered Sourcing') },
  ], [t]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" aria-live="polite">
      {/* Background */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase >= 3 ? 0.85 : 1 }}
        transition={{ duration: 1.5 }}
      />

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-4">
        {/* Phase 0: Logo reveal */}
        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.div
              key="logo-phase"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -30 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Always use light logo — background is forced black regardless of theme */}
              <img
                src={quantumLogoLight}
                alt="The Quantum Club"
                className="h-32 w-auto drop-shadow-[0_0_40px_rgba(124,58,237,0.4)]"
              />
              <motion.div
                className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 200 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </motion.div>
          )}

          {/* Phase 1: Typewriter name */}
          {phase === 1 && (
            <motion.div
              key="name-phase"
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img
                src={quantumLogoLight}
                alt="The Quantum Club"
                className="h-16 w-auto mb-8 opacity-60"
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight" role="status" aria-label={welcomeText}>
                {typedText}
                <motion.span
                  className="ml-1 text-primary"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  aria-hidden="true"
                >
                  |
                </motion.span>
              </h1>
              <motion.p
                className="mt-4 text-white/50 text-sm tracking-widest uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                {t('welcomeCeremony.exclusiveMember', 'Exclusive Member')}
              </motion.p>
            </motion.div>
          )}

          {/* Phase 2: Info cards stagger in */}
          {phase === 2 && (
            <motion.div
              key="cards-phase"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <motion.img
                src={quantumLogoLight}
                alt="The Quantum Club"
                className="h-12 w-auto mb-4 opacity-40"
              />
              <h2 className="text-2xl font-bold text-white mb-2">{welcomeText}</h2>

              <div className="grid gap-3 w-full">
                {/* Strategist card */}
                {strategist && (
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                          {strategist.avatarUrl ? (
                            <img src={strategist.avatarUrl} alt={strategist.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/50 uppercase tracking-wider">{t('welcomeCeremony.yourStrategist', 'Your Talent Strategist')}</p>
                          <p className="text-white font-semibold truncate">{strategist.name}</p>
                          <p className="text-white/40 text-sm truncate">{strategist.email}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Company card */}
                {companyInfo && (
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/50 uppercase tracking-wider">{t('welcomeCeremony.yourCompany', 'Your Organization')}</p>
                          <p className="text-white font-semibold truncate">{companyInfo.name}</p>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white/70 capitalize shrink-0">
                          {companyInfo.role}
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Benefits card */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <p className="text-xs text-white/50 uppercase tracking-wider">{t('welcomeCeremony.exclusiveBenefits', 'Your Exclusive Benefits')}</p>
                      </div>
                      <div className="grid gap-2">
                        {benefitItems.map((item, i) => {
                          const Icon = item.icon;
                          return (
                            <motion.div
                              key={i}
                              className="flex items-center gap-3 text-white/80 text-sm"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8 + i * 0.15 }}
                            >
                              <Icon className="w-4 h-4 text-primary shrink-0" />
                              <span>{item.label}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Phase 3: Final CTA */}
          {phase >= 3 && (
            <motion.div
              key="cta-phase"
              className="flex flex-col items-center gap-4"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.img
                src={quantumLogoLight}
                alt="The Quantum Club"
                className="h-12 w-auto mb-2 opacity-40"
              />
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">{welcomeText}</h2>
              <p className="text-white/50 text-center max-w-md">
                {t('welcomeCeremony.readyMessage', 'Your exclusive partner portal is ready. Everything you need to hire world-class talent, in one place.')}
              </p>

              {/* Compact info row */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {strategist && (
                  <Badge variant="outline" className="border-white/20 text-white/70 py-1.5 px-3">
                    <Users className="w-3 h-3 mr-1.5" />
                    {strategist.name}
                  </Badge>
                )}
                {companyInfo && (
                  <Badge variant="outline" className="border-white/20 text-white/70 py-1.5 px-3">
                    <Building2 className="w-3 h-3 mr-1.5" />
                    {companyInfo.name}
                  </Badge>
                )}
              </div>

              {/* Data Processing & Legal Agreements */}
              <motion.div
                className="w-full max-w-md mt-4"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Card className={`border-primary/20 bg-white/[0.06] backdrop-blur-xl transition-colors ${showAgreementReminder && !agreementsAccepted ? 'border-amber-400/40 bg-amber-400/[0.06]' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <p className="text-xs text-white/60 uppercase tracking-wider font-medium">
                        {t('welcomeCeremony.agreements.title', 'Partner Agreements')}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* DPA Checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          checked={dpaAccepted}
                          onCheckedChange={(checked) => {
                            setDpaAccepted(checked === true);
                            if (checked) setShowAgreementReminder(false);
                          }}
                          className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="text-sm text-white/80 leading-snug group-hover:text-white transition-colors">
                          {t('welcomeCeremony.agreements.dpaLabel', 'I have read and accept the')}{' '}
                          <Link to="/legal/dpa" target="_blank" className="text-primary hover:text-primary/80 underline underline-offset-2">
                            {t('welcomeCeremony.agreements.dpaLink', 'Data Processing Agreement')}
                          </Link>
                        </span>
                      </label>

                      {/* Terms & Privacy Checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          checked={termsAccepted}
                          onCheckedChange={(checked) => {
                            setTermsAccepted(checked === true);
                            if (checked) setShowAgreementReminder(false);
                          }}
                          className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="text-sm text-white/80 leading-snug group-hover:text-white transition-colors">
                          {t('welcomeCeremony.agreements.termsLabel', 'I agree to the')}{' '}
                          <Link to="/legal/terms" target="_blank" className="text-primary hover:text-primary/80 underline underline-offset-2">
                            {t('welcomeCeremony.agreements.termsLink', 'Terms of Service')}
                          </Link>
                          {' '}{t('welcomeCeremony.agreements.and', 'and')}{' '}
                          <Link to="/legal/privacy" target="_blank" className="text-primary hover:text-primary/80 underline underline-offset-2">
                            {t('welcomeCeremony.agreements.privacyLink', 'Privacy Policy')}
                          </Link>
                        </span>
                      </label>
                    </div>

                    {/* Note */}
                    <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
                      {t('welcomeCeremony.agreements.note', 'As a partner processing personal data on our platform, you are required to accept these agreements.')}
                    </p>

                    {/* Gentle reminder */}
                    <AnimatePresence>
                      {showAgreementReminder && !agreementsAccepted && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-amber-400/90 mt-2 flex items-center gap-1.5"
                        >
                          <Shield className="w-3 h-3 shrink-0" />
                          {t('welcomeCeremony.agreements.reminder', 'Please accept both agreements to continue.')}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                className="mt-6"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                <RainbowButton
                  className={`h-14 px-10 text-lg font-semibold transition-opacity ${!agreementsAccepted ? 'opacity-60' : ''}`}
                  onClick={handleEnter}
                  autoFocus
                >
                  {t('welcomeCeremony.enterPortal', 'Enter Your Portal')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </RainbowButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
