import { memo, useState, useCallback } from "react";
import { X, Plus, GripVertical, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/ui/country-flag";
import { JobLocationDisplay } from "./JobLocationDisplay";
import { EnhancedLocationAutocomplete, type LocationResult } from "@/components/ui/enhanced-location-autocomplete";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface LocationInput {
  id?: string;
  city: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  locationType: "onsite" | "remote" | "hybrid";
  isPrimary?: boolean;
}

interface MultiLocationInputProps {
  locations: LocationInput[];
  isRemote: boolean;
  onChange: (locations: LocationInput[]) => void;
  onRemoteChange: (isRemote: boolean) => void;
  maxLocations?: number;
  className?: string;
  disabled?: boolean;
}

export const MultiLocationInput = memo(({
  locations,
  isRemote,
  onChange,
  onRemoteChange,
  maxLocations = 5,
  className,
  disabled = false,
}: MultiLocationInputProps) => {
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  const handleAddLocation = useCallback((result: LocationResult | null) => {
    if (!result) {
      setIsAddingLocation(false);
      return;
    }

    // Check if this location already exists (by countryCode + city)
    const exists = locations.some(
      (loc) =>
        loc.countryCode === result.countryCode &&
        loc.city?.toLowerCase() === result.city?.toLowerCase()
    );

    if (exists) {
      setIsAddingLocation(false);
      return;
    }

    const newLocation: LocationInput = {
      city: result.city,
      country: result.country,
      countryCode: result.countryCode,
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: result.formattedAddress,
      locationType: "onsite",
      isPrimary: locations.length === 0, // First location is primary
    };

    onChange([...locations, newLocation]);
    setIsAddingLocation(false);
  }, [locations, onChange]);

  const handleRemoveLocation = useCallback((index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (newLocations.length > 0 && !newLocations.some((l) => l.isPrimary)) {
      newLocations[0].isPrimary = true;
    }
    onChange(newLocations);
  }, [locations, onChange]);

  const handleSetPrimary = useCallback((index: number) => {
    const newLocations = locations.map((loc, i) => ({
      ...loc,
      isPrimary: i === index,
    }));
    onChange(newLocations);
  }, [locations, onChange]);

  const canAddMore = locations.length < maxLocations;

  // Prepare preview data
  const previewLocations = locations.map((loc) => ({
    city: loc.city,
    countryCode: loc.countryCode,
    location_type: loc.locationType,
  }));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Remote Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
            isRemote ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <Label htmlFor="remote-toggle" className="text-sm font-medium cursor-pointer">
              Remote Position
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow candidates to work from anywhere
            </p>
          </div>
        </div>
        <Switch
          id="remote-toggle"
          checked={isRemote}
          onCheckedChange={onRemoteChange}
          disabled={disabled}
        />
      </div>

      {/* Location List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Office Locations
            {locations.length > 0 && (
              <span className="ml-2 text-muted-foreground font-normal">
                ({locations.length}/{maxLocations})
              </span>
            )}
          </Label>
        </div>

        {/* Existing Locations */}
        {locations.length > 0 && (
          <div className="space-y-2">
            {locations.map((location, index) => (
              <div
                key={`${location.countryCode}-${location.city}-${index}`}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
                  location.isPrimary
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/50 bg-card/30 hover:border-border"
                )}
              >
                {/* Drag Handle (visual only for now) */}
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />

                {/* Country Flag */}
                <CountryFlag countryCode={location.countryCode} size="md" showTooltip={false} />

                {/* Location Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {location.city || location.country}
                    </span>
                    {location.isPrimary && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Primary
                      </Badge>
                    )}
                  </div>
                  {location.city && (
                    <span className="text-xs text-muted-foreground">
                      {location.country}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!location.isPrimary && locations.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleSetPrimary(index)}
                          disabled={disabled}
                        >
                          <span className="text-xs">★</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as primary</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveLocation(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Location */}
        {canAddMore && (
          <div className="pt-1">
            {isAddingLocation ? (
              <div className="space-y-2">
                <EnhancedLocationAutocomplete
                  value={null}
                  onChange={handleAddLocation}
                  placeholder="Search for a city..."
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingLocation(false)}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingLocation(true)}
                disabled={disabled}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {locations.length === 0 && !isAddingLocation && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {isRemote
              ? "No office locations required for remote positions"
              : "Add at least one office location"}
          </p>
        )}
      </div>

      {/* Preview */}
      {(locations.length > 0 || isRemote) && (
        <div className="pt-2 border-t border-border/50">
          <Label className="text-xs text-muted-foreground mb-2 block">
            Preview
          </Label>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <JobLocationDisplay
              locations={previewLocations}
              isRemote={isRemote}
              size="md"
              showCities={true}
            />
          </div>
        </div>
      )}
    </div>
  );
});

MultiLocationInput.displayName = "MultiLocationInput";
