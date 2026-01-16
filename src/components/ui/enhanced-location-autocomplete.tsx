import * as React from "react";
import { Check, MapPin, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface LocationResult {
  displayName: string;
  city: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country: string;
    country_code: string;
    state?: string;
    postcode?: string;
  };
}

interface EnhancedLocationAutocompleteProps {
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  placeholder?: string;
  className?: string;
  showCoordinates?: boolean;
  disabled?: boolean;
}

interface RecentLocation extends LocationResult {
  timestamp: number;
}

const STORAGE_KEY = "recentLocationSearchesEnhanced";
const MAX_RECENT = 5;

function getRecentLocations(): RecentLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (_e) {
    console.error("Error reading recent locations:", _e);
  }
  return [];
}

function saveRecentLocation(location: LocationResult): void {
  try {
    const recent = getRecentLocations();
    const updated: RecentLocation[] = [
      { ...location, timestamp: Date.now() },
      ...recent.filter((l) => l.displayName !== location.displayName),
    ].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_e) {
    console.error("Error saving recent location:", _e);
  }
}

function parseNominatimResult(result: NominatimResult): LocationResult {
  const city =
    result.address.city ||
    result.address.town ||
    result.address.village ||
    result.address.municipality ||
    null;

  const formattedAddress = city
    ? `${city}, ${result.address.country}`
    : result.address.country;

  return {
    displayName: result.display_name,
    city,
    country: result.address.country,
    countryCode: result.address.country_code?.toUpperCase() || "",
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    formattedAddress,
  };
}

export function EnhancedLocationAutocomplete({
  value,
  onChange,
  placeholder = "Search for a city or address...",
  className,
  showCoordinates = false,
  disabled = false,
}: EnhancedLocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<LocationResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recentLocations, setRecentLocations] = React.useState<RecentLocation[]>([]);
  const [inputValue, setInputValue] = React.useState(value?.formattedAddress || "");

  // Load recent locations on mount
  React.useEffect(() => {
    setRecentLocations(getRecentLocations());
  }, []);

  // Sync input value with external value
  React.useEffect(() => {
    setInputValue(value?.formattedAddress || "");
  }, [value]);

  // Fetch suggestions from Nominatim
  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: searchQuery,
              format: "json",
              addressdetails: "1",
              limit: "8",
            }),
          {
            headers: {
              "User-Agent": "TheQuantumClub/1.0",
            },
          }
        );

        if (response.ok) {
          const data: NominatimResult[] = await response.json();
          const parsed = data
            .filter(
              (item) =>
                item.address.city ||
                item.address.town ||
                item.address.village ||
                item.address.municipality
            )
            .map(parseNominatimResult);
          setSuggestions(parsed);
        }
      } catch (_error) {
        console.error("Error fetching location suggestions:", _error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelect = (location: LocationResult) => {
    onChange(location);
    saveRecentLocation(location);
    setRecentLocations(getRecentLocations());
    setOpen(false);
    setSearchQuery("");
    setInputValue(location.formattedAddress);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setSearchQuery(newValue);
    if (!open) setOpen(true);
    // Clear the structured value when typing manually
    if (value && newValue !== value.formattedAddress) {
      onChange(null);
    }
  };

  const handleClear = () => {
    onChange(null);
    setInputValue("");
    setSearchQuery("");
    setSuggestions([]);
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className={cn("pl-10 pr-8", className)}
              disabled={disabled}
              onFocus={() => setOpen(true)}
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {inputValue && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleClear}
              >
                <span className="sr-only">Clear</span>
                <span className="text-muted-foreground text-xs">×</span>
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search cities worldwide..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!loading && searchQuery.length < 2 && recentLocations.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentLocations.map((location, idx) => (
                    <CommandItem
                      key={`recent-${idx}`}
                      value={location.formattedAddress}
                      onSelect={() => handleSelect(location)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value?.formattedAddress === location.formattedAddress
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <Navigation className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex flex-col">
                        <span>{location.formattedAddress}</span>
                        {showCoordinates && (
                          <span className="text-xs text-muted-foreground">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
                <CommandEmpty>
                  No cities found. Try a different search term.
                </CommandEmpty>
              )}

              {!loading && suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((location, index) => (
                    <CommandItem
                      key={`suggestion-${index}`}
                      value={location.formattedAddress}
                      onSelect={() => handleSelect(location)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value?.formattedAddress === location.formattedAddress
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{location.formattedAddress}</span>
                        {showCoordinates && (
                          <span className="text-xs text-muted-foreground">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Show selected location details when showCoordinates is true */}
      {showCoordinates && value && (
        <div className="text-xs text-muted-foreground pl-1 flex items-center gap-2">
          <span className="font-mono">
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </span>
          {value.countryCode && (
            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase">
              {value.countryCode}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
