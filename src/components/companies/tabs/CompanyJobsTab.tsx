import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { getJobViewPath } from "@/utils/jobNavigation";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

interface CompanyJobsTabProps {
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    careers_page_url: string | null;
  };
  jobs: any[];
  jobCount: number;
  isAdmin: boolean;
  isCompanyMember: boolean;
  currentRole: string | null;
  setCreateJobDialogOpen: (open: boolean) => void;
}

export const CompanyJobsTab = ({
  company,
  jobs,
  jobCount,
  isAdmin,
  isCompanyMember,
  currentRole,
  setCreateJobDialogOpen,
}: CompanyJobsTabProps) => {
  const { t } = useTranslation('companies');
  const navigate = useNavigate();

  return (
    <div className="space-y-6 mt-6">
      {/* Jobs Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('activeRoles', 'Active Roles')}</h2>
          <p className="text-muted-foreground">
            {jobCount} {jobCount === 1 ? 'role' : 'roles'} currently being placed
          </p>
        </div>
        {(isAdmin || isCompanyMember) && (
          <Button onClick={() => setCreateJobDialogOpen(true)}>
            <Briefcase className="w-4 h-4 mr-2" />{t('addRole', 'Add Role')}</Button>
        )}
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center py-12">
              {(isAdmin || isCompanyMember)
                ? "No roles added yet. Add your first role to begin placements."
                : "Roles will appear here when your strategist begins placements."}
            </p>
            {company.careers_page_url && (
              <div className="text-center">
                <Button onClick={() => window.open(company.careers_page_url!, '_blank')}>
                  <Briefcase className="w-4 h-4 mr-2" />{t('visitCareersPage', 'Visit Careers Page')}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="relative">
              {(isAdmin || isCompanyMember) && job.status === 'draft' && (
                <Badge className="absolute -top-2 -right-2 z-10 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Draft
                </Badge>
              )}
              <JobCard
                id={job.id}
                title={job.title}
                company={company.name}
                companyLogo={company.logo_url || undefined}
                companySlug={company.slug}
                location={job.location || "Remote"}
                type={job.employment_type || "Full-time"}
                postedDate={new Date(job.created_at).toLocaleDateString()}
                tags={[]}
                salary={job.salary_min && job.salary_max
                  ? `${job.currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                  : undefined}
                onApply={() => {
                  const path = getJobViewPath(job.id, currentRole as any);
                  navigate(path);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
