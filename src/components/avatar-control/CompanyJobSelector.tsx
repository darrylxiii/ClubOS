import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, Building2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAvailableJobs, useCompaniesWithJobCounts } from '@/hooks/useSessionJobs';
import type { AvailableJob } from '@/hooks/useSessionJobs';

interface CompanyJobSelectorProps {
  selectedJobId: string;
  onSelect: (jobId: string) => void;
}

export function CompanyJobSelector({ selectedJobId, onSelect }: CompanyJobSelectorProps) {
  const { t } = useTranslation('common');
  const { data: jobs = [] } = useAvailableJobs();
  const companies = useCompaniesWithJobCounts();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    if (!selectedCompanyId) return [];
    return jobs.filter(j => (j.companies?.id ?? j.company_id) === selectedCompanyId);
  }, [jobs, selectedCompanyId]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  if (selectedCompanyId) {
    return (
      <Command>
        <div className="flex items-center gap-1 px-3 pt-2 pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-muted-foreground"
            onClick={() => setSelectedCompanyId(null)}
          >
            <ChevronLeft className="h-3 w-3 mr-0.5" />
            Companies
          </Button>
          {selectedCompany && (
            <span className="text-xs font-medium truncate">{selectedCompany.name}</span>
          )}
        </div>
        <CommandInput placeholder={t("search_jobs", "Search jobs…")} />
        <CommandList>
          <CommandEmpty>{t("no_jobs_found", "No jobs found.")}</CommandEmpty>
          <CommandGroup>
            {filteredJobs.map(job => {
              const isCurrent = job.id === selectedJobId;
              return (
                <CommandItem
                  key={job.id}
                  value={`${job.title} ${job.location ?? ''}`}
                  onSelect={() => onSelect(job.id)}
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', isCurrent ? 'opacity-100' : 'opacity-0')} />
                  <Briefcase className="mr-1.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    {job.location && (
                      <p className="text-xs text-muted-foreground truncate">{job.location}</p>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }

  return (
    <Command>
      <CommandInput placeholder={t("search_companies", "Search companies…")} />
      <CommandList>
        <CommandEmpty>{t("no_companies_with_open", "No companies with open jobs.")}</CommandEmpty>
        <CommandGroup heading="Select a company">
          {companies.map(company => (
            <CommandItem
              key={company.id}
              value={company.name}
              onSelect={() => setSelectedCompanyId(company.id)}
            >
              <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium truncate">{company.name}</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                {company.open_jobs}
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
