import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/lib/motion";
import { X, ShieldCheck } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

export const MigrationBanner = () => {
  const { t } = useTranslation("auth");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
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
          role="region"
          aria-label={t("migrationBanner.regionLabel")}
          className="fixed left-0 top-0 z-50 w-full border-b border-foreground/10 bg-gradient-to-r from-primary/[0.12] via-background/95 to-primary/[0.08] px-4 py-3 shadow-glass-hover backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:bg-background/75"
        >
          <div className="relative z-10 mx-auto flex max-w-5xl items-start justify-between gap-4 sm:items-center">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-full border border-primary/30 bg-primary/20 p-2 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm font-medium leading-tight text-foreground/90 sm:text-base">
                <strong className="text-foreground">{t("systemUpgraded", "System Upgraded.")}</strong>{" "}
                {t(
                  "forYourAbsolutePrivacyWe",
                  "Your security infrastructure has been elevated. All legacy credentials were cryptographically purged during the transition.",
                )}{" "}
                <Trans
                  i18nKey="migrationBanner.signInOptions"
                  ns="auth"
                  components={{
                    ml: <strong className="font-semibold text-primary" />,
                    oauth: <strong className="font-semibold text-primary" />,
                  }}
                />
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              aria-label={t("migrationBanner.dismiss")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
