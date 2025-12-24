import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2 
      className={cn(
        "animate-spin text-primary",
        sizeClasses[size],
        className
      )} 
    />
  );
}

export interface LoadingOverlayProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingOverlay({ text, size = 'lg', className }: LoadingOverlayProps) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size={size === 'lg' ? 'xl' : size === 'md' ? 'lg' : 'md'} />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}

export interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading Quantum OS..." }: PageLoadingProps) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-wider text-xs uppercase">{text}</p>
      </div>
    </div>
  );
}

export interface InlineLoadingProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function InlineLoading({ text, size = 'sm', className }: InlineLoadingProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LoadingSpinner size={size} />
      {text && <span className="text-muted-foreground">{text}</span>}
    </span>
  );
}

export interface ButtonLoadingProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ButtonLoading({ size = 'sm', className }: ButtonLoadingProps) {
  return <LoadingSpinner size={size} className={className} />;
}
