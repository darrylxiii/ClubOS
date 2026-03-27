import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";

interface SearchProps {
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string | null) => void;
  onRarityChange: (rarity: string | null) => void;
}

export const AchievementSearch = ({
  onSearchChange,
  onCategoryChange,
  onRarityChange,
}: SearchProps) => {
  const { t } = useTranslation('common');
  return (
    <Card className="glass p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('achievements.searchPlaceholder')}
            className="pl-10"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Select onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('achievements.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('achievements.allCategories')}</SelectItem>
            <SelectItem value="influence">{t('achievements.categories.influence')}</SelectItem>
            <SelectItem value="innovation">{t('achievements.categories.innovation')}</SelectItem>
            <SelectItem value="social">{t('achievements.categories.social')}</SelectItem>
            <SelectItem value="learning">{t('achievements.categories.learning')}</SelectItem>
            <SelectItem value="prestige">{t('achievements.categories.prestige')}</SelectItem>
            <SelectItem value="event">{t('achievements.categories.event')}</SelectItem>
            <SelectItem value="pioneer">{t('achievements.categories.pioneer')}</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => onRarityChange(value === "all" ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('achievements.rarity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('achievements.allRarities')}</SelectItem>
            <SelectItem value="common">{t('achievements.rarities.common')}</SelectItem>
            <SelectItem value="rare">{t('achievements.rarities.rare')}</SelectItem>
            <SelectItem value="epic">{t('achievements.rarities.epic')}</SelectItem>
            <SelectItem value="legendary">{t('achievements.rarities.legendary')}</SelectItem>
            <SelectItem value="quantum">{t('achievements.rarities.quantum')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};
