import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const MigrationBanner = () => {
  const { t } = useTranslation('auth');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slight delay for dramatic effect when arriving on the Auth page
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 w-full z-50 px-4 py-3 bg-[url('/videos/ocean-background.mp4')] bg-cover bg-center before:absolute before:inset-0 before:bg-background/80 before:backdrop-blur-2xl border-b border-foreground/10 shadow-glass-hover"
        >
          <div className="relative z-10 max-w-5xl mx-auto flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0 shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-sm sm:text-base font-medium text-foreground/90 leading-tight">
                <strong className="text-foreground">{t('systemUpgraded', 'System Upgraded.')}</strong>{' '}{t('forYourAbsolutePrivacyWe', 'Your security infrastructure has been elevated. All legacy credentials were cryptographically purged during the transition. Sign in effortlessly via')}{' '}<strong className="text-primary">{t('magicLink', 'Magic Link')}</strong>{' '}or connect your{' '}<strong className="text-primary">{t('oauthProvider', 'OAuth Provider')}</strong>{' '}to continue.
              </p>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1.5 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
