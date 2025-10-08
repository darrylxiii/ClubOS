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
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Job</label>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger>
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
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
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
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
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Urgency</label>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="urgent">Urgent (14+ days)</SelectItem>
            <SelectItem value="needs-followup">Needs Follow-up (7+ days)</SelectItem>
            <SelectItem value="recent">Recent Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
