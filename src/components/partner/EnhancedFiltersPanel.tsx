import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X, MapPin, Briefcase, DollarSign, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedFiltersPanelProps {
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  skillsMatch: number[];
  location: string[];
  availability: string[];
  experience: string[];
  source: string[];
}

export function EnhancedFiltersPanel({ onFilterChange }: EnhancedFiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    skillsMatch: [],
    location: [],
    availability: [],
    experience: [],
    source: []
  });

  const filterOptions = {
    skillsMatch: [
      { value: 80, label: "80%+ Match" },
      { value: 60, label: "60%+ Match" },
      { value: 40, label: "40%+ Match" }
    ],
    location: ["Remote", "Hybrid", "On-site"],
    availability: ["Immediate", "2 weeks", "1 month", "Flexible"],
    experience: ["Junior", "Mid-level", "Senior", "Lead"],
    source: ["Application", "Referral", "Direct", "Club Sync"]
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).flat().length;
  };

  const toggleFilter = (category: keyof FilterState, value: number | string) => {
    setActiveFilters(prev => {
      const current = prev[category] as (number | string)[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      const newFilters = { ...prev, [category]: updated as any };
      onFilterChange?.(newFilters);
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      skillsMatch: [],
      location: [],
      availability: [],
      experience: [],
      source: []
    });
    onFilterChange?.({
      skillsMatch: [],
      location: [],
      availability: [],
      experience: [],
      source: []
    });
  };

  const activeCount = getActiveFilterCount();

  return (
    <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)] transition-all duration-300">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 hover:bg-background/40"
          >
            <Filter className="w-4 h-4" />
            <span className="font-semibold">Smart Filters</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary border-0">
                {activeCount}
              </Badge>
            )}
          </Button>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-background/40"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-border/20 animate-fade-in">
            {/* Skills Match */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Tag className="w-4 h-4" />
                Skills Match
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.skillsMatch.map(option => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilter('skillsMatch', option.value)}
                    className={cn(
                      "border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all",
                      activeFilters.skillsMatch.includes(option.value) && "border-primary/50 bg-primary/10 text-primary"
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="w-4 h-4" />
                Location Type
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.location.map(option => (
                  <Button
                    key={option}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilter('location', option)}
                    className={cn(
                      "border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all",
                      activeFilters.location.includes(option) && "border-primary/50 bg-primary/10 text-primary"
                    )}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Availability
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.availability.map(option => (
                  <Button
                    key={option}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilter('availability', option)}
                    className={cn(
                      "border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all",
                      activeFilters.availability.includes(option) && "border-primary/50 bg-primary/10 text-primary"
                    )}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                Experience Level
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.experience.map(option => (
                  <Button
                    key={option}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilter('experience', option)}
                    className={cn(
                      "border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all",
                      activeFilters.experience.includes(option) && "border-primary/50 bg-primary/10 text-primary"
                    )}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                Source
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.source.map(option => (
                  <Button
                    key={option}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFilter('source', option)}
                    className={cn(
                      "border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all",
                      activeFilters.source.includes(option) && "border-primary/50 bg-primary/10 text-primary"
                    )}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
