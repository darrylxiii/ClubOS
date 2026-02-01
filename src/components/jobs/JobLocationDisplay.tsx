import { memo } from "react";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountryFlag, countryCodeToFlag } from "@/components/ui/country-flag";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface JobLocationItem {
  id?: string;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  country_code?: string | null; // DB format
  formatted_address?: string | null;
  location_type?: "onsite" | "remote" | "hybrid";
}

interface JobLocationDisplayProps {
  /** Array of location objects from job_locations table */
  locations?: JobLocationItem[];
  /** Single location string (legacy fallback) */
  location?: string | null;
  /** Single country code (legacy fallback) */
  countryCode?: string | null;
  /** Whether the job is remote (from jobs.is_remote) */
  isRemote?: boolean;
  /** Maximum number of flags to display before showing "+N" */
  maxFlags?: number;
  /** Whether to show city names */
  showCities?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class name */
  className?: string;
}

const sizeClasses = {
  sm: "text-xs gap-1",
  md: "text-sm gap-1.5",
  lg: "text-base gap-2",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

/**
 * Compact single-line location display for job cards
 * Shows country flags, city names, and remote indicator
 */
export const JobLocationDisplay = memo(({
  locations = [],
  location,
  countryCode,
  isRemote = false,
  maxFlags = 3,
  showCities = true,
  size = "sm",
  className,
}: JobLocationDisplayProps) => {
  // Normalize locations to get unique country codes
  const normalizedLocations = locations.map((loc) => ({
    ...loc,
    countryCode: loc.countryCode || loc.country_code,
  }));
  
  // Get unique country codes from locations
  const uniqueCountryCodes = [
    ...new Set(
      normalizedLocations
        .map((loc) => loc.countryCode?.toUpperCase())
        .filter(Boolean)
    ),
  ] as string[];
  
  // Fallback to single countryCode if no locations
  if (uniqueCountryCodes.length === 0 && countryCode) {
    uniqueCountryCodes.push(countryCode.toUpperCase());
  }
  
  // Get cities from locations
  const cities = normalizedLocations
    .map((loc) => loc.city)
    .filter(Boolean) as string[];
  
  // Fallback to extracting city from single location string
  let displayCities = cities;
  if (displayCities.length === 0 && location) {
    // Try to extract city from "City, Country" format
    const parts = location.split(",");
    if (parts.length > 0) {
      displayCities = [parts[0].trim()];
    }
  }
  
  // Determine if this is a remote-only position
  const isRemoteOnly = isRemote && uniqueCountryCodes.length === 0;
  const isHybrid = isRemote && uniqueCountryCodes.length > 0;
  
  // Flags to display (limited by maxFlags)
  const displayFlags = uniqueCountryCodes.slice(0, maxFlags);
  const extraFlagsCount = Math.max(0, uniqueCountryCodes.length - maxFlags);
  
  // Cities to display (max 2 for space efficiency)
  const displayCityNames = displayCities.slice(0, 2);
  const extraCitiesCount = Math.max(0, displayCities.length - 2);
  
  // Nothing to display
  if (!isRemote && uniqueCountryCodes.length === 0 && displayCities.length === 0) {
    if (!location) return null;
    // Fall back to just showing the location string
    return (
      <span className={cn("text-muted-foreground", sizeClasses[size], className)}>
        {location}
      </span>
    );
  }
  
  return (
    <TooltipProvider>
      <div className={cn(
        "flex items-center flex-wrap",
        sizeClasses[size],
        className
      )}>
        {/* Remote icon (if remote-only or hybrid) */}
        {isRemote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center rounded-full shrink-0",
                isRemoteOnly ? "text-primary" : "text-primary/70"
              )}>
                <Globe2 className={iconSizes[size]} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRemoteOnly ? "Fully remote" : "Remote available"}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Country flags */}
        {displayFlags.map((code) => (
          <CountryFlag 
            key={code} 
            countryCode={code} 
            size={size} 
            showTooltip={true}
          />
        ))}
        
        {/* Extra flags indicator */}
        {extraFlagsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground font-medium shrink-0">
                +{extraFlagsCount}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{extraFlagsCount} more {extraFlagsCount === 1 ? "location" : "locations"}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* City names */}
        {showCities && displayCityNames.length > 0 && (
          <span className="text-muted-foreground truncate">
            {displayCityNames.join(", ")}
            {extraCitiesCount > 0 && ` +${extraCitiesCount}`}
          </span>
        )}
        
        {/* Remote-only label */}
        {isRemoteOnly && (
          <span className="text-muted-foreground font-medium">Remote</span>
        )}
      </div>
    </TooltipProvider>
  );
});

JobLocationDisplay.displayName = "JobLocationDisplay";
