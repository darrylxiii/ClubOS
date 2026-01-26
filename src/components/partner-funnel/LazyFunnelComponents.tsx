import React, { lazy, Suspense, ComponentType, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Skeleton loaders for funnel components
export function FunnelStepSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex flex-col items-center gap-3 mb-6">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function VerificationSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-3 mb-6">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex justify-center gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-10 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  );
}

export function ProgressIndicatorSkeleton() {
  return (
    <div className="flex justify-center gap-2 mb-6">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-3 w-3 rounded-full" />
      ))}
    </div>
  );
}

// Loading spinner component
export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// Lazy loading wrapper with better error handling
export function LazyComponent({
  factory,
  fallback,
  componentProps = {}
}: {
  factory: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  componentProps?: Record<string, any>;
}) {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    factory()
      .then((module) => setComponent(() => module.default))
      .catch(setError);
  }, [factory]);

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load component</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-sm underline mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!Component) {
    return <>{fallback || <LoadingSpinner />}</>;
  }

  return <Component {...componentProps} />;
}

// Lazy-loaded heavy components
export const LazyPhoneInput = lazy(() => 
  import('react-phone-number-input').then(m => ({ default: m.default }))
);

export const LazyInputOTP = lazy(() => 
  import('@/components/ui/input-otp').then(m => ({ 
    default: ({ value, onChange, maxLength }: any) => {
      const { InputOTP, InputOTPGroup, InputOTPSlot } = m;
      return (
        <InputOTP maxLength={maxLength} value={value} onChange={onChange}>
          <InputOTPGroup>
            {[...Array(maxLength)].map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      );
    }
  }))
);

// Prefetch component - preloads next step resources
export function usePrefetch(currentStep: number) {
  useEffect(() => {
    // Prefetch phone input when on step 2 (before compliance)
    if (currentStep === 2) {
      import('react-phone-number-input');
    }
    
    // Prefetch OTP input when on step 3 (before verification)
    if (currentStep === 3) {
      import('@/components/ui/input-otp');
    }
    
    // Prefetch confetti when on step 4 (before success)
    if (currentStep === 4) {
      import('canvas-confetti');
    }
  }, [currentStep]);
}

// Intersection Observer hook for lazy loading visibility
export function useVisibilityPrefetch(ref: React.RefObject<HTMLElement>, onVisible: () => void) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, onVisible]);
}
