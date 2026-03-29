import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface ApplicationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export function ApplicationFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange
}: ApplicationFiltersProps) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={t('filtersSection.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <Filter className="w-4 h-4 mr-2" />
          <SelectValue placeholder={t('filtersSection.filterByStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('statusSection.all')}</SelectItem>
          <SelectItem value="applied">{t('statusSection.pending')}</SelectItem>
          <SelectItem value="approved">{t('statusSection.approved')}</SelectItem>
          <SelectItem value="rejected">{t('statusSection.rejected')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t('filtersSection.sortBy')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-desc">{t('filtersSection.dateNewest')}</SelectItem>
          <SelectItem value="date-asc">{t('filtersSection.dateOldest')}</SelectItem>
          <SelectItem value="name-asc">{t('filtersSection.nameAZ')}</SelectItem>
          <SelectItem value="name-desc">{t('filtersSection.nameZA')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
