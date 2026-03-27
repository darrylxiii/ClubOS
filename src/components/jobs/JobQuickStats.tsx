import { useTranslation } from 'react-i18next';
import { MapPin, DollarSign, Briefcase, Calendar } from "lucide-react";

interface JobQuickStatsProps {
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  employmentType: string;
  daysOpen: number;
}

export function JobQuickStats({
  location,
  salaryMin,
  salaryMax,
  currency = "USD",
  employmentType,
  daysOpen
}: JobQuickStatsProps) {
  const { t } = useTranslation('jobs');
  const formatSalary = () => {
    if (!salaryMin || !salaryMax) return null;
    
    const formatNumber = (num: number) => {
      if (num >= 1000) {
        return `${Math.round(num / 1000)}K`;
      }
      return num.toString();
    };

    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    return `${symbol}${formatNumber(salaryMin)} - ${symbol}${formatNumber(salaryMax)}`;
  };

  const salary = formatSalary();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <MapPin className="w-4 h-4" />
        <span>{location}</span>
      </div>

      {salary && (
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4" />
          <span>{salary}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <Briefcase className="w-4 h-4" />
        <span>{employmentType}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        <span>{daysOpen === 0 ? t('quickStats.today', 'Today') : t('quickStats.daysAgo', '{{count}} day ago', { count: daysOpen })}</span>
      </div>
    </div>
  );
}
