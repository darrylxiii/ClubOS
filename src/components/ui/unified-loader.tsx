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
 * Unified loading component for consistent loading experience.
 * 
 * Design: Clean, premium spinner with centered Quantum logo.
 */
export function UnifiedLoader({
  variant = 'page',
  text,
  showBranding = false,
  className,
  size = 'md'
}: UnifiedLoaderProps) {

  // Correct asset path from public directory
  const logoSrc = "/quantum-logo.svg";

  // -- Dimensions --
  const getDimensions = () => {
    if (variant === 'inline') return 'h-4 w-4';
    if (variant === 'page' || variant === 'overlay') return 'h-20 w-20'; // Logo size
    // Section variant sizing
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'lg': return 'h-16 w-16';
      case 'xl': return 'h-24 w-24';
      default: return 'h-12 w-12';
    }
  };

  const logoDims = getDimensions();

  // Spinner ring dimensions (larger than logo)
  const getSpinnerDims = () => {
    if (variant === 'page' || variant === 'overlay') return 'h-32 w-32';
    switch (size) {
      case 'sm': return 'h-12 w-12';
      case 'lg': return 'h-24 w-24';
      case 'xl': return 'h-32 w-32';
      default: return 'h-20 w-20';
    }
  };
  const spinnerDims = getSpinnerDims();

  // -- Text Defaults --
  const defaultText = {
    page: showBranding ? 'Loading Quantum OS...' : undefined,
    section: undefined,
    inline: undefined,
    overlay: undefined,
  };
  const displayText = text ?? defaultText[variant];

  // -- Render Content --

  const renderPageOrOverlay = () => (
    <div className="relative flex flex-col items-center justify-center z-50">
      <div className="relative flex items-center justify-center">
        {/* Spinning Ring - Premium White/Silver with Glow */}
        <motion.div
          className={cn("absolute rounded-full border-t-[3px] border-white border-r-[3px] border-r-white/30 border-b-transparent border-l-transparent shadow-[0_0_15px_rgba(255,255,255,0.3)]", spinnerDims)}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Secondary Inner Ring (Subtle Reverse) */}
        <motion.div
          className={cn("absolute rounded-full border-b-[1px] border-white/20 border-t-transparent border-l-transparent border-r-transparent", spinnerDims)}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Logo */}
        <div className={cn("relative z-10 flex items-center justify-center filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]", logoDims)}>
          <img
            src={logoSrc}
            alt="Quantum Club"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Loading Text */}
      {displayText && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-8 text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase animate-pulse"
        >
          {displayText}
        </motion.p>
      )}
    </div>
  );

  const renderSection = () => (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <Loader2 className={cn("animate-spin text-muted-foreground", spinnerDims)} />
        <div className={cn("absolute inset-0 flex items-center justify-center", logoDims)}>
          {/* Section loader: subtle logo overlay */}
          {size !== 'sm' && (
            <img
              src={logoSrc}
              alt="Loading..."
              className="w-1/2 h-1/2 object-contain opacity-40 grayscale"
            />
          )}
        </div>
      </div>
      {displayText && (
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
          {displayText}
        </p>
      )}
    </div>
  );

  const renderInline = () => (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", "h-4 w-4")} />
      {displayText && <span>{displayText}</span>}
    </div>
  );

  // -- Structure Containers --

  if (variant === 'page') {
    return (
      <div className={cn("min-h-screen w-full flex flex-col items-center justify-center bg-background", className)}>
        {renderPageOrOverlay()}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          className={cn("fixed inset-0 z-[9999] bg-background/80 flex items-center justify-center", className)}
        >
          {renderPageOrOverlay()}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === 'inline') {
    return renderInline();
  }

  // Section (Default fallback)
  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center min-h-[200px] w-full p-4", className)}>
      {renderSection()}
    </div>
  );
}

// Convenience exports
export const PageLoader = () => <UnifiedLoader variant="page" showBranding />;
export const SectionLoader = ({ text, className }: { text?: string, className?: string }) => <UnifiedLoader variant="section" text={text} className={className} />;
export const InlineLoader = ({ text, className }: { text?: string, className?: string }) => <UnifiedLoader variant="inline" text={text} className={className} />;
export const OverlayLoader = ({ text }: { text?: string }) => <UnifiedLoader variant="overlay" text={text} />;
