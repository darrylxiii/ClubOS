import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Country code to name mapping for tooltips
const COUNTRY_NAMES: Record<string, string> = {
  NL: "Netherlands",
  DE: "Germany",
  GB: "United Kingdom",
  US: "United States",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  BE: "Belgium",
  AT: "Austria",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  PT: "Portugal",
  IE: "Ireland",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  SG: "Singapore",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  AE: "United Arab Emirates",
};

/**
 * Convert a 2-letter country code to an emoji flag
 * Uses Unicode regional indicator symbols (A = 🇦, B = 🇧, etc.)
 */
export const countryCodeToFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "";
  
  const upperCode = countryCode.toUpperCase();
  const codePoints = upperCode.split("").map((char) => {
    // Regional indicator symbols start at U+1F1E6 for 'A'
    // So we add 127397 (0x1F1E6 - 65) to the char code
    return 127397 + char.charCodeAt(0);
  });
  
  return String.fromCodePoint(...codePoints);
};

interface CountryFlagProps {
  countryCode: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export const CountryFlag = memo(({ 
  countryCode, 
  size = "md", 
  showTooltip = true,
  className,
}: CountryFlagProps) => {
  const flag = countryCodeToFlag(countryCode);
  const countryName = COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode.toUpperCase();
  
  if (!flag) return null;
  
  const flagElement = (
    <span 
      className={cn(
        "inline-flex items-center justify-center leading-none",
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label={countryName}
    >
      {flag}
    </span>
  );
  
  if (!showTooltip) return flagElement;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {flagElement}
      </TooltipTrigger>
      <TooltipContent>
        <p>{countryName}</p>
      </TooltipContent>
    </Tooltip>
  );
});

CountryFlag.displayName = "CountryFlag";
