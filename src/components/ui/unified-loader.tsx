import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface UnifiedLoaderProps {
  variant?: 'page' | 'section' | 'inline' | 'overlay';
  text?: string;
  showBranding?: boolean;
  className?: string;
}

/**
 * Unified loading component for consistent loading experience across the entire application.
 * 
 * Variants:
 * - page: Full viewport, centered with optional branding text (used for route transitions)
 * - section: Contained within parent element (used for component loading)
 * - inline: Small inline spinner (used for buttons, lists)
 * - overlay: Fixed backdrop with blur (used for modals, actions)
 */
export function UnifiedLoader({ 
  variant = 'page', 
  text,
  showBranding = false,
  className 
}: UnifiedLoaderProps) {
  const spinnerSizes = {
    page: 'h-12 w-12',
    section: 'h-8 w-8',
    inline: 'h-4 w-4',
    overlay: 'h-12 w-12',
  };

  const containerStyles = {
    page: 'min-h-screen flex flex-col items-center justify-center bg-background',
    section: 'flex-1 flex flex-col items-center justify-center min-h-[200px]',
    inline: 'inline-flex items-center gap-2',
    overlay: 'fixed inset-0 z-[9998] bg-background/80 backdrop-blur-md flex items-center justify-center',
  };

  const defaultText = {
    page: showBranding ? 'Loading Quantum OS...' : undefined,
    section: undefined,
    inline: undefined,
    overlay: undefined,
  };

  const displayText = text ?? defaultText[variant];

  const content = (
    <div className={cn("flex flex-col items-center gap-3", variant === 'inline' && "flex-row gap-2")}>
      <Loader2 
        className={cn(
          "animate-spin text-primary",
          spinnerSizes[variant]
        )} 
      />
      {displayText && (
        <p className={cn(
          "text-muted-foreground animate-pulse",
          variant === 'inline' ? "text-sm" : "font-medium tracking-wider text-xs uppercase"
        )}>
          {displayText}
        </p>
      )}
    </div>
  );

  // For overlay variant, use framer-motion for smooth transitions
  if (variant === 'overlay') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(containerStyles[variant], className)}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className={cn(containerStyles[variant], className)}>
      {content}
    </div>
  );
}

// Convenience exports for common use cases
export const PageLoader = () => <UnifiedLoader variant="page" showBranding />;
export const SectionLoader = ({ text }: { text?: string }) => <UnifiedLoader variant="section" text={text} />;
export const InlineLoader = ({ text }: { text?: string }) => <UnifiedLoader variant="inline" text={text} />;
export const OverlayLoader = ({ text }: { text?: string }) => <UnifiedLoader variant="overlay" text={text} />;
