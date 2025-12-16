import * as React from 'react';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import { useBrandAssets } from '@/hooks/useBrandAssets';

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-20 w-20',
};

const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

interface CompanyLogoProps {
  company?: {
    name?: string | null;
    logo_url?: string | null;
    website_url?: string | null;
  } | null;
  name?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
  fallback?: React.ReactNode;
  autoFetch?: boolean;
  showInitials?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function CompanyLogo({
  company,
  name,
  logoUrl,
  websiteUrl,
  size = 'md',
  className,
  fallback,
  autoFetch = true,
  showInitials = true,
}: CompanyLogoProps) {
  const [imageError, setImageError] = React.useState(false);
  
  // Resolve props from company object or direct props
  const resolvedName = name ?? company?.name;
  const resolvedLogoUrl = logoUrl ?? company?.logo_url;
  const resolvedWebsiteUrl = websiteUrl ?? company?.website_url;
  
  // Only fetch from Brandfetch if no logo_url and autoFetch is enabled
  const shouldFetch = autoFetch && !resolvedLogoUrl && !!resolvedWebsiteUrl;
  const { data: brandAssets, isLoading } = useBrandAssets(resolvedWebsiteUrl, { 
    enabled: shouldFetch 
  });
  
  // Determine final logo URL
  const finalLogoUrl = resolvedLogoUrl || brandAssets?.logo_url || brandAssets?.icon_url;
  
  // Reset error state when URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [finalLogoUrl]);

  const containerClasses = cn(
    sizeClasses[size],
    'rounded-lg overflow-hidden flex items-center justify-center bg-muted/50 flex-shrink-0',
    className
  );

  // Loading state
  if (isLoading && shouldFetch) {
    return (
      <div className={cn(containerClasses, 'animate-pulse bg-muted')} />
    );
  }

  // Show logo if available and no error
  if (finalLogoUrl && !imageError) {
    return (
      <div className={containerClasses}>
        <img
          src={finalLogoUrl}
          alt={`${resolvedName || 'Company'} logo`}
          className="h-full w-full object-contain p-1"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Custom fallback
  if (fallback) {
    return <div className={containerClasses}>{fallback}</div>;
  }

  // Initials fallback
  if (showInitials && resolvedName) {
    const initials = getInitials(resolvedName);
    return (
      <div className={cn(containerClasses, 'bg-primary/10 text-primary font-semibold', textSizes[size])}>
        {initials}
      </div>
    );
  }

  // Icon fallback
  return (
    <div className={cn(containerClasses, 'bg-muted text-muted-foreground')}>
      <Building2 size={iconSizes[size]} />
    </div>
  );
}

// Simple version without auto-fetch for performance-critical lists
export function CompanyLogoStatic({
  logoUrl,
  name,
  size = 'md',
  className,
}: {
  logoUrl?: string | null;
  name?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [imageError, setImageError] = React.useState(false);

  const containerClasses = cn(
    sizeClasses[size],
    'rounded-lg overflow-hidden flex items-center justify-center bg-muted/50 flex-shrink-0',
    className
  );

  if (logoUrl && !imageError) {
    return (
      <div className={containerClasses}>
        <img
          src={logoUrl}
          alt={`${name || 'Company'} logo`}
          className="h-full w-full object-contain p-1"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (name) {
    const initials = getInitials(name);
    return (
      <div className={cn(containerClasses, 'bg-primary/10 text-primary font-semibold', textSizes[size])}>
        {initials}
      </div>
    );
  }

  return (
    <div className={cn(containerClasses, 'bg-muted text-muted-foreground')}>
      <Building2 size={iconSizes[size]} />
    </div>
  );
}
