import * as React from "react";
import { Check, MapPin, Loader2, Clock, X } from "lucide-react";
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

interface LocationSuggestion {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Type to search for your city...",
  className,
}: LocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const stored = localStorage.getItem("recentLocationSearches");
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  const saveRecentSearch = (location: string) => {
    const updated = [location, ...recentSearches.filter((l) => l !== location)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentLocationSearches", JSON.stringify(updated));
  };

  // Reset highlighted index when suggestions change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions, recentSearches]);

  // Fetch suggestions - trigger after 1 character
  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 1) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: value,
              format: "json",
              addressdetails: "1",
              limit: "8",
              featuretype: "city",
            }),
          {
            headers: {
              "User-Agent": "TheQuantumClub/1.0",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(
            data.filter(
              (item: LocationSuggestion) =>
                item.address.city || item.address.town || item.address.village
            )
          );
        }
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const formatLocation = (suggestion: LocationSuggestion) => {
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village;
    return `${city}, ${suggestion.address.country}`;
  };

  // Get all selectable items for keyboard navigation
  const getSelectableItems = React.useCallback((): string[] => {
    if (value.length < 1 && recentSearches.length > 0) {
      return recentSearches;
    }
    return suggestions.map(formatLocation);
  }, [value, recentSearches, suggestions]);

  const handleSelect = (location: string) => {
    onChange(location);
    saveRecentSearch(location);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (!open) setOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
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

  const showRecentSearches = value.length < 1 && recentSearches.length > 0;
  const showSuggestions = value.length >= 1 && suggestions.length > 0;
  const showEmpty = value.length >= 1 && !loading && suggestions.length === 0;
  const showLoading = loading && value.length >= 1;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative group">
          <motion.div
            animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            <Input
              ref={inputRef}
              value={value}
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
            {value && (
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
          if (inputRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[280px]">
            {/* Loading State */}
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
                {recentSearches.map((location, idx) => (
                  <CommandItem
                    key={location}
                    value={location}
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
                        value === location ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{location}</span>
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
                  <MapPin className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No cities found. You can still type manually.
                  </p>
                </motion.div>
              </CommandEmpty>
            )}

            {/* Suggestions */}
            {showSuggestions && !loading && (
              <CommandGroup heading="Suggestions">
                {suggestions.map((suggestion, index) => {
                  const location = formatLocation(suggestion);
                  return (
                    <motion.div
                      key={`${location}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <CommandItem
                        value={location}
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
                            value === location ? "opacity-100 text-primary" : "opacity-0"
                          )}
                        />
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{location}</span>
                      </CommandItem>
                    </motion.div>
                  );
                })}
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
  );
}
