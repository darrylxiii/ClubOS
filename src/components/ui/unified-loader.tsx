import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export interface UnifiedLoaderProps {
  variant?: 'page' | 'section' | 'inline' | 'overlay';
  text?: string;
  showBranding?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Unified loading component — sleek black + glowing logo.
 * 
 * Design: Pure black (#0E0E10), centered Quantum logo with a
 * subtle breathing glow (opacity pulse). No spinners, no text by default.
 */
export function UnifiedLoader({
  variant = 'page',
  text,
  showBranding = false,
  className,
  size = 'md'
}: UnifiedLoaderProps) {
  const { t } = useTranslation('common');

  const logoSrc = "/quantum-logo.svg";

  // Logo dimensions per variant
  const getLogoDims = () => {
    if (variant === 'inline') return 'h-4 w-4';
    if (variant === 'page' || variant === 'overlay') return 'h-20 w-20';
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'lg': return 'h-16 w-16';
      case 'xl': return 'h-20 w-20';
      default: return 'h-12 w-12';
    }
  };

  const logoDims = getLogoDims();

  // -- Render: Glowing logo (page / overlay / section) --
  const renderGlowingLogo = () => (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className={cn("relative flex items-center justify-center", logoDims)}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          src={logoSrc}
          alt={t("loading", "Loading")}
          className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        />
      </motion.div>

      {/* Optional text — only shown if explicitly passed */}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-xs font-medium tracking-[0.2em] text-muted-foreground/60 uppercase"
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  // -- Inline: keep tiny spinner (not a "screen") --
  const renderInline = () => (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className="animate-spin text-muted-foreground h-4 w-4" />
      {text && <span>{text}</span>}
    </div>
  );

  // -- Containers --

  if (variant === 'page') {
    return (
      <div className={cn("min-h-screen w-full flex items-center justify-center bg-[#0E0E10]", className)}>
        {renderGlowingLogo()}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("fixed inset-0 z-[9999] bg-[#0E0E10]/90 backdrop-blur-sm flex items-center justify-center", className)}
        >
          {renderGlowingLogo()}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === 'inline') {
    return renderInline();
  }

  // Section
  return (
    <div className={cn("flex-1 flex items-center justify-center min-h-[200px] w-full p-4", className)}>
      {renderGlowingLogo()}
    </div>
  );
}

// Convenience exports
export const PageLoader = () => <UnifiedLoader variant="page" />;
export const SectionLoader = ({ text, className }: { text?: string, className?: string }) => <UnifiedLoader variant="section" text={text} className={className} />;
export const InlineLoader = ({ text, className }: { text?: string, className?: string }) => <UnifiedLoader variant="inline" text={text} className={className} />;
export const OverlayLoader = ({ text }: { text?: string }) => <UnifiedLoader variant="overlay" text={text} />;
