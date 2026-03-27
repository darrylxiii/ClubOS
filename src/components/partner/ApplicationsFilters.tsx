import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApplicationsFiltersProps {
  selectedStage: string;
  setSelectedStage: (value: string) => void;
  selectedJob: string;
  setSelectedJob: (value: string) => void;
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  selectedSource: string;
  setSelectedSource: (value: string) => void;
  urgencyFilter: string;
  setUrgencyFilter: (value: string) => void;
  jobs: any[];
  companies: any[];
}

export const ApplicationsFilters = ({
  selectedStage,
  setSelectedStage,
  selectedJob,
  setSelectedJob,
  selectedCompany,
  setSelectedCompany,
  selectedSource,
  setSelectedSource,
  urgencyFilter,
  setUrgencyFilter,
  jobs,
  companies
}: ApplicationsFiltersProps) => {
  const { t } = useTranslation('partner');
  // Extract unique companies from jobs
  const uniqueCompanies = Array.from(
    new Map(
      jobs
        .filter(j => j.companies)
        .map(j => [j.companies.id, j.companies])
    ).values()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={selectedStage} onValueChange={setSelectedStage}>
          <SelectTrigger>
            <SelectValue placeholder={t('applicationsFilters.placeholder.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('applicationsFilters.option.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('applicationsFilters.option.active')}</SelectItem>
            <SelectItem value="hired">{t('applicationsFilters.option.hired')}</SelectItem>
            <SelectItem value="rejected">{t('applicationsFilters.option.rejected')}</SelectItem>
            <SelectItem value="withdrawn">{t('applicationsFilters.option.withdrawn')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Job</label>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger>
            <SelectValue placeholder={t('applicationsFilters.placeholder.allJobs')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('applicationsFilters.option.allJobs')}</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Company</label>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger>
            <SelectValue placeholder={t('applicationsFilters.placeholder.allCompanies')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('applicationsFilters.option.allCompanies')}</SelectItem>
            {uniqueCompanies.map((company: any) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Source</label>
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger>
            <SelectValue placeholder={t('applicationsFilters.placeholder.allSources')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('applicationsFilters.option.allSources')}</SelectItem>
            <SelectItem value="linkedin">{t('applicationsFilters.option.linkedin')}</SelectItem>
            <SelectItem value="referral">{t('applicationsFilters.option.referral')}</SelectItem>
            <SelectItem value="direct">{t('applicationsFilters.option.direct')}</SelectItem>
            <SelectItem value="agency">{t('applicationsFilters.option.agency')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Urgency</label>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t('applicationsFilters.placeholder.allUrgency')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('applicationsFilters.option.all')}</SelectItem>
            <SelectItem value="urgent">Urgent (14+ days)</SelectItem>
            <SelectItem value="needs-followup">Needs Follow-up (7+ days)</SelectItem>
            <SelectItem value="recent">{t('applicationsFilters.option.recentActivity')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
