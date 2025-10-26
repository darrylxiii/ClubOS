import { Separator } from "@/components/ui/separator";
import { AboutRoleSection } from "./AboutRoleSection";
import { ResponsibilityGrid } from "./ResponsibilityGrid";
import { SkillMatrix } from "./SkillMatrix";
import { BenefitsShowcase } from "./BenefitsShowcase";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { CompanyShowcase } from "./CompanyShowcase";

interface JobDetailsSectionProps {
  job: {
    description?: string;
    requirements?: string[];
    nice_to_have?: string[];
    benefits?: string[];
    responsibilities?: string[];
    tags?: string[];
  };
  company?: {
    name: string;
    description?: string;
    industry?: string;
    company_size?: string;
    headquarters_location?: string;
    website_url?: string;
  };
  showCompanyInfo?: boolean;
}

export function JobDetailsSection({ job, company, showCompanyInfo = true }: JobDetailsSectionProps) {
  return (
    <div className="space-y-6">
      {/* About the Role */}
      <AboutRoleSection description={job.description} />

      {/* Application Timeline */}
      <ApplicationTimeline />

      {/* Key Responsibilities */}
      <ResponsibilityGrid responsibilities={job.responsibilities} />

      {/* Skills Matrix */}
      <SkillMatrix 
        mustHaveSkills={job.requirements}
        niceToHaveSkills={job.nice_to_have}
      />

      {/* Benefits Showcase */}
      <BenefitsShowcase benefits={job.benefits} />

      {/* Company Showcase */}
      {showCompanyInfo && company && (
        <CompanyShowcase company={company} />
      )}
    </div>
  );
}
