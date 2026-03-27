import { memo, useState } from "react";
import { MapPin, DollarSign, Briefcase, Building2, Users, Wifi, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { FilterPill } from "./FilterPill";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { JobFilters } from "./JobFilterSidebar";
import { useTranslation } from 'react-i18next';

interface HorizontalFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  onReset: () => void;
  totalJobs: number;
  filteredJobsCount: number;
  availableCompanies: string[];
  availableDepartments: string[];
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

const COMMON_LOCATIONS = ["Amsterdam", "London", "Berlin", "New York", "Remote"];
const EMPLOYMENT_TYPE_KEYS = [
  { value: "fulltime", labelKey: "filters.fullTime", fallback: "Full-time" },
  { value: "parttime", labelKey: "filters.partTime", fallback: "Part-time" },
  { value: "contract", labelKey: "filters.contract", fallback: "Contract" },
  { value: "freelance", labelKey: "filters.freelance", fallback: "Freelance" },
];

export const HorizontalFilters = memo(({
  filters,
  onFiltersChange,
  onReset,
  totalJobs,
  filteredJobsCount,
  availableCompanies,
  availableDepartments,
  isExpanded,
  onToggleExpanded,
}: HorizontalFiltersProps) => {
  const { t } = useTranslation('jobs');
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const hasActiveFilters = 
    filters.locations.length > 0 ||
    filters.salaryMin > 0 ||
    filters.salaryMax < 500000 ||
    filters.employmentTypes.length > 0 ||
    filters.remoteOnly ||
    filters.companies.length > 0 ||
    filters.departments.length > 0;

  const handleLocationToggle = (location: string) => {
    const newLocations = filters.locations.includes(location)
      ? filters.locations.filter(l => l !== location)
      : [...filters.locations, location];
    onFiltersChange({ ...filters, locations: newLocations });
  };

  const handleEmploymentTypeToggle = (type: string) => {
    const newTypes = filters.employmentTypes.includes(type)
      ? filters.employmentTypes.filter(t => t !== type)
      : [...filters.employmentTypes, type];
    onFiltersChange({ ...filters, employmentTypes: newTypes });
  };

  const handleCompanyToggle = (company: string) => {
    const newCompanies = filters.companies.includes(company)
      ? filters.companies.filter(c => c !== company)
      : [...filters.companies, company];
    onFiltersChange({ ...filters, companies: newCompanies });
  };

  const handleDepartmentToggle = (dept: string) => {
    const newDepartments = filters.departments.includes(dept)
      ? filters.departments.filter(d => d !== dept)
      : [...filters.departments, dept];
    onFiltersChange({ ...filters, departments: newDepartments });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="sticky top-0 z-20 bg-card/30 backdrop-blur-xl border border-border/30 rounded-xl shadow-none">
        <div className="flex items-center justify-between gap-4 p-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            {/* Location Filter */}
            <Popover open={openPopover === 'location'} onOpenChange={(open) => setOpenPopover(open ? 'location' : null)}>
              <PopoverTrigger asChild>
                <div>
                  <FilterPill
                    icon={<MapPin className="w-4 h-4" />}
                    label={t('filters.location', 'Location')}
                    count={filters.locations.length}
                    isActive={filters.locations.length > 0}
                    onClear={() => onFiltersChange({ ...filters, locations: [] })}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="font-semibold text-sm">{t('filters.selectLocations', 'Select Locations')}</div>
                  <div className="space-y-2">
                    {COMMON_LOCATIONS.map(location => (
                      <div key={location} className="flex items-center gap-2">
                        <Checkbox
                          id={`loc-${location}`}
                          checked={filters.locations.includes(location)}
                          onCheckedChange={() => handleLocationToggle(location)}
                        />
                        <label htmlFor={`loc-${location}`} className="text-sm cursor-pointer flex-1">
                          {location}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Salary Filter */}
            <Popover open={openPopover === 'salary'} onOpenChange={(open) => setOpenPopover(open ? 'salary' : null)}>
              <PopoverTrigger asChild>
                <div>
                  <FilterPill
                    icon={<DollarSign className="w-4 h-4" />}
                    label={t('filters.salary', 'Salary')}
                    count={(filters.salaryMin > 0 || filters.salaryMax < 500000) ? 1 : 0}
                    isActive={filters.salaryMin > 0 || filters.salaryMax < 500000}
                    onClear={() => onFiltersChange({ ...filters, salaryMin: 0, salaryMax: 500000 })}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="font-semibold text-sm">{t('filters.salaryRange', 'Salary Range (EUR)')}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>€{(filters.salaryMin / 1000).toFixed(0)}k</span>
                      <span>€{(filters.salaryMax / 1000).toFixed(0)}k</span>
                    </div>
                    <Slider
                      min={0}
                      max={500000}
                      step={10000}
                      value={[filters.salaryMin, filters.salaryMax]}
                      onValueChange={([min, max]) => onFiltersChange({ ...filters, salaryMin: min, salaryMax: max })}
                      className="py-4"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Employment Type Filter */}
            <Popover open={openPopover === 'type'} onOpenChange={(open) => setOpenPopover(open ? 'type' : null)}>
              <PopoverTrigger asChild>
                <div>
                  <FilterPill
                    icon={<Briefcase className="w-4 h-4" />}
                    label={t('filters.type', 'Type')}
                    count={filters.employmentTypes.length}
                    isActive={filters.employmentTypes.length > 0}
                    onClear={() => onFiltersChange({ ...filters, employmentTypes: [] })}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="font-semibold text-sm">{t('filters.employmentType', 'Employment Type')}</div>
                  <div className="space-y-2">
                    {EMPLOYMENT_TYPE_KEYS.map(type => (
                      <div key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`type-${type.value}`}
                          checked={filters.employmentTypes.includes(type.value)}
                          onCheckedChange={() => handleEmploymentTypeToggle(type.value)}
                        />
                        <label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer flex-1">
                          {t(type.labelKey, type.fallback)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Companies Filter */}
            <Popover open={openPopover === 'companies'} onOpenChange={(open) => setOpenPopover(open ? 'companies' : null)}>
              <PopoverTrigger asChild>
                <div>
                  <FilterPill
                    icon={<Building2 className="w-4 h-4" />}
                    label={t('filters.companies', 'Companies')}
                    count={filters.companies.length}
                    isActive={filters.companies.length > 0}
                    onClear={() => onFiltersChange({ ...filters, companies: [] })}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div className="font-semibold text-sm">{t('filters.selectCompanies', 'Select Companies')}</div>
                  <div className="space-y-2">
                    {availableCompanies.slice(0, 20).map(company => (
                      <div key={company} className="flex items-center gap-2">
                        <Checkbox
                          id={`company-${company}`}
                          checked={filters.companies.includes(company)}
                          onCheckedChange={() => handleCompanyToggle(company)}
                        />
                        <label htmlFor={`company-${company}`} className="text-sm cursor-pointer flex-1">
                          {company}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Departments Filter */}
            <Popover open={openPopover === 'departments'} onOpenChange={(open) => setOpenPopover(open ? 'departments' : null)}>
              <PopoverTrigger asChild>
                <div>
                  <FilterPill
                    icon={<Users className="w-4 h-4" />}
                    label={t('filters.departments', 'Departments')}
                    count={filters.departments.length}
                    isActive={filters.departments.length > 0}
                    onClear={() => onFiltersChange({ ...filters, departments: [] })}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div className="font-semibold text-sm">{t('filters.selectDepartments', 'Select Departments')}</div>
                  <div className="space-y-2">
                    {availableDepartments.slice(0, 20).map(dept => (
                      <div key={dept} className="flex items-center gap-2">
                        <Checkbox
                          id={`dept-${dept}`}
                          checked={filters.departments.includes(dept)}
                          onCheckedChange={() => handleDepartmentToggle(dept)}
                        />
                        <label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer flex-1">
                          {dept}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Remote Filter */}
            <Popover open={openPopover === 'remote'} onOpenChange={(open) => setOpenPopover(open ? 'remote' : null)}>
              <PopoverTrigger asChild>
                <div>
                  <FilterPill
                    icon={<Wifi className="w-4 h-4" />}
                    label={t('filters.remote', 'Remote')}
                    count={filters.remoteOnly ? 1 : 0}
                    isActive={filters.remoteOnly}
                    onClear={() => onFiltersChange({ ...filters, remoteOnly: false })}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="font-semibold text-sm">{t('filters.remoteOptions', 'Remote Options')}</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remote-only"
                        checked={filters.remoteOnly}
                        onCheckedChange={(checked) => 
                          onFiltersChange({ ...filters, remoteOnly: checked as boolean })
                        }
                      />
                      <label htmlFor="remote-only" className="text-sm cursor-pointer">
                        {t('filters.remoteOnly', 'Remote only')}
                      </label>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-8" />

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                {t('common:clearAll', 'Clear All')}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Filter Content - Hidden by default, shown when isExpanded */}
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border/30 pt-4 bg-background/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('filters.showingOfJobs', 'Showing {{filtered}} of {{total}} jobs', { filtered: filteredJobsCount, total: totalJobs })}
              </span>
              {hasActiveFilters && (
                <div className="flex gap-2 flex-wrap">
                  {filters.locations.map(loc => (
                    <Badge key={loc} variant="secondary" className="gap-1">
                      {loc}
                      <button onClick={() => handleLocationToggle(loc)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {filters.companies.map(company => (
                    <Badge key={company} variant="secondary" className="gap-1">
                      {company}
                      <button onClick={() => handleCompanyToggle(company)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {filters.departments.map(dept => (
                    <Badge key={dept} variant="secondary" className="gap-1">
                      {dept}
                      <button onClick={() => handleDepartmentToggle(dept)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

HorizontalFilters.displayName = 'HorizontalFilters';
