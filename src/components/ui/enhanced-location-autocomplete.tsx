import * as React from "react";
import { Check, MapPin, Loader2, Navigation, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

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
  } catch (e) {
    console.error("Error reading recent locations:", e);
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
  } catch (e) {
    console.error("Error saving recent location:", e);
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
  const [suggestions, setSuggestions] = React.useState<LocationResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recentLocations, setRecentLocations] = React.useState<RecentLocation[]>([]);
  const [inputValue, setInputValue] = React.useState(value?.formattedAddress || "");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Load recent locations on mount
  React.useEffect(() => {
    setRecentLocations(getRecentLocations());
  }, []);

  // Sync input value with external value
  React.useEffect(() => {
    setInputValue(value?.formattedAddress || "");
  }, [value]);

  // Reset highlighted index when suggestions change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions, recentLocations]);

  // Fetch suggestions from Nominatim - trigger after 1 character for faster response
  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.length < 1) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: inputValue,
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
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  // Get all selectable items for keyboard navigation
  const getSelectableItems = React.useCallback((): LocationResult[] => {
    if (inputValue.length < 1 && recentLocations.length > 0) {
      return recentLocations;
    }
    return suggestions;
  }, [inputValue, recentLocations, suggestions]);

  const handleSelect = (location: LocationResult) => {
    onChange(location);
    saveRecentLocation(location);
    setRecentLocations(getRecentLocations());
    setOpen(false);
    setInputValue(location.formattedAddress);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!open) setOpen(true);
    // Clear the structured value when typing manually
    if (value && newValue !== value.formattedAddress) {
      onChange(null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    setInputValue("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = getSelectableItems();
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightedIndex((prev) => 
            prev < items.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setHighlightedIndex((prev) => 
            prev > 0 ? prev - 1 : items.length - 1
          );
        }
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          handleSelect(items[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        break;
      case "Tab":
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          handleSelect(items[highlightedIndex]);
        }
        setOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpen(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const showRecentSearches = inputValue.length < 1 && recentLocations.length > 0;
  const showSuggestions = inputValue.length >= 1 && suggestions.length > 0;
  const showEmpty = inputValue.length >= 1 && !loading && suggestions.length === 0;
  const showLoading = loading && inputValue.length >= 1;

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div className="relative group">
            <motion.div
              animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={cn(
                  "pl-10 pr-8 transition-all duration-200",
                  isFocused && "ring-2 ring-primary/20",
                  className
                )}
                disabled={disabled}
                autoComplete="off"
              />
            </motion.div>
            <motion.div
              animate={isFocused ? { scale: 1.1 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              <MapPin className={cn(
                "h-4 w-4 transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted-foreground"
              )} />
            </motion.div>
            <AnimatePresence>
              {inputValue && !disabled && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  onClick={handleClear}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Don't close if clicking on the input
            if (inputRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          <Command shouldFilter={false} ref={listRef}>
            <CommandList className="max-h-[280px]">
              {/* Loading State with Shimmer */}
              <AnimatePresence>
                {showLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 py-4 px-3"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Searching cities...</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Recent Searches */}
              {showRecentSearches && !loading && (
                <CommandGroup heading="Recent Searches">
                  {recentLocations.map((location, idx) => (
                    <CommandItem
                      key={`recent-${idx}`}
                      value={location.formattedAddress}
                      onSelect={() => handleSelect(location)}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer transition-colors",
                        highlightedIndex === idx && "bg-accent"
                      )}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 transition-opacity",
                          value?.formattedAddress === location.formattedAddress
                            ? "opacity-100 text-primary"
                            : "opacity-0"
                        )}
                      />
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{location.formattedAddress}</span>
                        {showCoordinates && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Empty State */}
              {showEmpty && (
                <CommandEmpty className="py-6 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <Navigation className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No cities found for "{inputValue}"
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Try a different search term
                    </p>
                  </motion.div>
                </CommandEmpty>
              )}

              {/* Suggestions */}
              {showSuggestions && !loading && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((location, index) => (
                    <motion.div
                      key={`suggestion-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <CommandItem
                        value={location.formattedAddress}
                        onSelect={() => handleSelect(location)}
                        className={cn(
                          "flex items-center gap-3 cursor-pointer transition-colors",
                          highlightedIndex === index && "bg-accent"
                        )}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 transition-opacity",
                            value?.formattedAddress === location.formattedAddress
                              ? "opacity-100 text-primary"
                              : "opacity-0"
                          )}
                        />
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{location.formattedAddress}</span>
                          {showCoordinates && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </span>
                          )}
                        </div>
                        {location.countryCode && (
                          <span className="text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground shrink-0">
                            {location.countryCode}
                          </span>
                        )}
                      </CommandItem>
                    </motion.div>
                  ))}
                </CommandGroup>
              )}

              {/* Keyboard hint */}
              {(showSuggestions || showRecentSearches) && !loading && (
                <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-background rounded border text-[9px]">↑</kbd>
                      <kbd className="px-1 py-0.5 bg-background rounded border text-[9px]">↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background rounded border text-[9px]">↵</kbd>
                      select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-background rounded border text-[9px]">esc</kbd>
                      close
                    </span>
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Show selected location details when showCoordinates is true */}
      <AnimatePresence>
        {showCoordinates && value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-muted-foreground pl-1 flex items-center gap-2"
          >
            <span className="font-mono">
              {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </span>
            {value.countryCode && (
              <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-medium">
                {value.countryCode}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
