import * as React from "react";
import { Check, MapPin, Loader2 } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

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
      } catch (_error) {
        console.error("Error fetching location suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const formatLocation = (suggestion: LocationSuggestion) => {
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village;
    return `${city}, ${suggestion.address.country}`;
  };

  const handleSelect = (location: string) => {
    onChange(location);
    saveRecentSearch(location);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setSearchQuery(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            className={cn("pl-10", className)}
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            {!loading && searchQuery.length < 2 && recentSearches.length > 0 && (
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((location) => (
                  <CommandItem
                    key={location}
                    value={location}
                    onSelect={() => handleSelect(location)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === location ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {location}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
              <CommandEmpty>No cities found. You can still type your location manually.</CommandEmpty>
            )}
            {!loading && suggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {suggestions.map((suggestion, index) => {
                  const location = formatLocation(suggestion);
                  return (
                    <CommandItem
                      key={`${location}-${index}`}
                      value={location}
                      onSelect={() => handleSelect(location)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === location ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {location}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
