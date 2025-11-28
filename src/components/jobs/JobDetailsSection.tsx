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
    pipeline_stages?: any[];
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
    <div className="space-y-4">
      {/* About the Role */}
      <AboutRoleSection description={job.description} />

      {/* Skills & Requirements */}
      <SkillMatrix 
        mustHaveSkills={job.requirements}
        niceToHaveSkills={job.nice_to_have}
      />

      {/* Key Responsibilities */}
      <ResponsibilityGrid responsibilities={job.responsibilities} />

      {/* Benefits & Perks */}
      <BenefitsShowcase benefits={job.benefits} />

      {/* Application Process */}
      <ApplicationTimeline jobPipelineStages={job.pipeline_stages} />

      {/* About Company */}
      {showCompanyInfo && company && (
        <CompanyShowcase company={company} />
      )}
    </div>
  );
}
