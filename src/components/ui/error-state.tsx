import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message: string;
  /** Retry callback - shows retry button when provided */
  onRetry?: () => void;
  /** Visual variant */
  variant?: 'card' | 'inline' | 'page';
  /** Additional className */
  className?: string;
  /** Show icon (default: true) */
  showIcon?: boolean;
}

/**
 * Consistent error state component for displaying errors with optional retry.
 * 
 * @example
 * ```tsx
 * // Card variant (default)
 * <ErrorState 
 *   message="Failed to load data" 
 *   onRetry={() => refetch()} 
 * />
 * 
 * // Inline variant
 * <ErrorState 
 *   variant="inline"
 *   message="Invalid input" 
 * />
 * 
 * // Page variant
 * <ErrorState 
 *   variant="page"
 *   title="Something went wrong"
 *   message="We couldn't load this page. Please try again."
 *   onRetry={() => window.location.reload()}
 * />
 * ```
 */
export function ErrorState({
  title,
  message,
  onRetry,
  variant = 'card',
  className,
  showIcon = true,
}: ErrorStateProps) {
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-2 text-destructive", className)}>
        {showIcon && <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="text-sm">{message}</span>
        {onRetry && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRetry}
            className="h-auto p-1 text-destructive hover:text-destructive"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Retry</span>
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[400px] px-4 text-center", className)}>
        {showIcon && (
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
        )}
        {title && (
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
        )}
        <p className="text-muted-foreground max-w-md mb-6">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={cn("border-destructive/20", className)}>
      <CardContent className="py-6">
        <div className="flex flex-col items-center text-center gap-3">
          {showIcon && (
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
          )}
          {title && (
            <h3 className="font-semibold">{title}</h3>
          )}
          <p className="text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
