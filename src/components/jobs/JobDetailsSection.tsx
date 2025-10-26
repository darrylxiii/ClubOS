import { Separator } from "@/components/ui/separator";
import { AboutRoleSection } from "./AboutRoleSection";
import { ResponsibilityGrid } from "./ResponsibilityGrid";
import { SkillMatrix } from "./SkillMatrix";
import { BenefitsShowcase } from "./BenefitsShowcase";
import { TagCloud } from "./TagCloud";
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
    <div className="space-y-12">
      {/* About the Role - Editorial style */}
      <AboutRoleSection description={job.description} />

      {/* Application Timeline */}
      <ApplicationTimeline />

      {/* Key Responsibilities - Grid layout */}
      <ResponsibilityGrid responsibilities={job.responsibilities} />

      {/* Skills Matrix - Must-have and Nice-to-have */}
      <SkillMatrix 
        mustHaveSkills={job.requirements}
        niceToHaveSkills={job.nice_to_have}
      />

      {/* Benefits Showcase - Lifestyle grid */}
      <BenefitsShowcase benefits={job.benefits} />

      {/* Skills & Technologies - Tag cloud */}
      <TagCloud tags={job.tags} />

      {/* Company Showcase - Enhanced company section */}
      {showCompanyInfo && company && (
        <>
          <Separator className="my-12" />
          <div id="company">
            <CompanyShowcase company={company} />
          </div>
        </>
      )}
    </div>
  );
}
