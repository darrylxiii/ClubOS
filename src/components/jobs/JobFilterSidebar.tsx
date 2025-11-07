import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Briefcase, Home, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export interface JobFilters {
  locations: string[];
  salaryMin: number;
  salaryMax: number;
  employmentTypes: string[];
  remoteOnly: boolean;
  hybridIncluded: boolean;
  experienceYears: [number, number];
}

interface JobFilterSidebarProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  onReset: () => void;
  totalJobs: number;
  filteredJobsCount: number;
}

const EMPLOYMENT_TYPES = [
  { value: 'fulltime', label: 'Full-time' },
  { value: 'parttime', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
];

const COMMON_LOCATIONS = [
  'Amsterdam', 'Berlin', 'London', 'Paris', 'Barcelona',
  'New York', 'San Francisco', 'Singapore', 'Dubai', 'Remote'
];

export function JobFilterSidebar({
  filters,
  onFiltersChange,
  onReset,
  totalJobs,
  filteredJobsCount
}: JobFilterSidebarProps) {
  const [locationInput, setLocationInput] = useState("");

  const handleLocationAdd = () => {
    if (locationInput.trim() && !filters.locations.includes(locationInput.trim())) {
      onFiltersChange({
        ...filters,
        locations: [...filters.locations, locationInput.trim()]
      });
      setLocationInput("");
    }
  };

  const handleLocationRemove = (location: string) => {
    onFiltersChange({
      ...filters,
      locations: filters.locations.filter(l => l !== location)
    });
  };

  const handleLocationToggle = (location: string) => {
    if (filters.locations.includes(location)) {
      handleLocationRemove(location);
    } else {
      onFiltersChange({
        ...filters,
        locations: [...filters.locations, location]
      });
    }
  };

  const handleEmploymentTypeToggle = (type: string) => {
    const newTypes = filters.employmentTypes.includes(type)
      ? filters.employmentTypes.filter(t => t !== type)
      : [...filters.employmentTypes, type];
    
    onFiltersChange({ ...filters, employmentTypes: newTypes });
  };

  const formatSalary = (value: number) => {
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}k`;
    }
    return `€${value}`;
  };

  const hasActiveFilters = 
    filters.locations.length > 0 ||
    filters.salaryMin > 0 ||
    filters.salaryMax < 500000 ||
    filters.employmentTypes.length > 0 ||
    filters.remoteOnly ||
    filters.hybridIncluded ||
    filters.experienceYears[0] > 0 ||
    filters.experienceYears[1] < 20;

  return (
    <Card className="sticky top-6 border-border/20">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs"
            >
              Reset All
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredJobsCount} of {totalJobs} jobs
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Location Filter */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          
          {/* Location Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add location..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLocationAdd();
                }
              }}
              className="h-9"
            />
            <Button
              size="sm"
              onClick={handleLocationAdd}
              disabled={!locationInput.trim()}
              className="h-9"
            >
              Add
            </Button>
          </div>

          {/* Selected Locations */}
          {filters.locations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.locations.map(location => (
                <Badge
                  key={location}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {location}
                  <button
                    onClick={() => handleLocationRemove(location)}
                    className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Common Locations */}
          <div className="grid grid-cols-2 gap-2">
            {COMMON_LOCATIONS.map(location => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={`location-${location}`}
                  checked={filters.locations.includes(location)}
                  onCheckedChange={() => handleLocationToggle(location)}
                />
                <Label
                  htmlFor={`location-${location}`}
                  className="text-sm cursor-pointer"
                >
                  {location}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Salary Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="w-4 h-4" />
            Salary Range
          </Label>
          <div className="space-y-4">
            <Slider
              value={[filters.salaryMin]}
              onValueChange={([value]) => onFiltersChange({ ...filters, salaryMin: value })}
              min={0}
              max={500000}
              step={10000}
              className="w-full"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Min: {formatSalary(filters.salaryMin)}
              </span>
              <span className="text-muted-foreground">
                Max: {formatSalary(filters.salaryMax)}
              </span>
            </div>
            <Slider
              value={[filters.salaryMax]}
              onValueChange={([value]) => onFiltersChange({ ...filters, salaryMax: value })}
              min={0}
              max={500000}
              step={10000}
              className="w-full"
            />
          </div>
        </div>

        <Separator />

        {/* Employment Type */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="w-4 h-4" />
            Employment Type
          </Label>
          <div className="space-y-2">
            {EMPLOYMENT_TYPES.map(type => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`employment-${type.value}`}
                  checked={filters.employmentTypes.includes(type.value)}
                  onCheckedChange={() => handleEmploymentTypeToggle(type.value)}
                />
                <Label
                  htmlFor={`employment-${type.value}`}
                  className="text-sm cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Remote Work */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Home className="w-4 h-4" />
            Work Location
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remote-only"
                checked={filters.remoteOnly}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, remoteOnly: checked as boolean })
                }
              />
              <Label htmlFor="remote-only" className="text-sm cursor-pointer">
                Remote Only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hybrid-included"
                checked={filters.hybridIncluded}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, hybridIncluded: checked as boolean })
                }
              />
              <Label htmlFor="hybrid-included" className="text-sm cursor-pointer">
                Include Hybrid
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Experience Level */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">
            Years of Experience
          </Label>
          <div className="space-y-2">
            <Slider
              value={filters.experienceYears}
              onValueChange={(value) => 
                onFiltersChange({ ...filters, experienceYears: value as [number, number] })
              }
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{filters.experienceYears[0]} years</span>
              <span>{filters.experienceYears[1]}+ years</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
