import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Users, Globe } from "lucide-react";
import { AboutRoleSection } from "./AboutRoleSection";
import { ResponsibilityGrid } from "./ResponsibilityGrid";
import { SkillMatrix } from "./SkillMatrix";
import { BenefitsShowcase } from "./BenefitsShowcase";
import { TagCloud } from "./TagCloud";
import { ApplicationTimeline } from "./ApplicationTimeline";

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

      {/* Company Info */}
      {showCompanyInfo && company && (
        <>
          <Separator className="my-8" />
          <Card className="glass backdrop-blur-xl border-accent/30">
            <CardHeader>
              <CardTitle>About {company.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {company.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {company.description}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {company.industry && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/30">
                      <Building2 className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Industry</div>
                      <div className="text-sm font-medium">{company.industry}</div>
                    </div>
                  </div>
                )}

                {company.company_size && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/30">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Company Size</div>
                      <div className="text-sm font-medium">{company.company_size}</div>
                    </div>
                  </div>
                )}

                {company.headquarters_location && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/30">
                      <MapPin className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div className="text-sm font-medium">{company.headquarters_location}</div>
                    </div>
                  </div>
                )}

                {company.website_url && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/30">
                      <Globe className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Website</div>
                      <a 
                        href={company.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
