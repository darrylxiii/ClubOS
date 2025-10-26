import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle, Building2, MapPin, Users, Globe } from "lucide-react";

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
      {/* Job Description */}
      {job.description && (
        <Card className="glass backdrop-blur-xl border-accent/30">
          <CardHeader>
            <CardTitle>About the Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {job.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responsibilities */}
      {job.responsibilities && job.responsibilities.length > 0 && (
        <Card className="glass backdrop-blur-xl border-accent/30">
          <CardHeader>
            <CardTitle>Key Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {job.responsibilities.map((resp, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{resp}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <div className="grid md:grid-cols-2 gap-6">
        {job.requirements && job.requirements.length > 0 && (
          <Card className="glass backdrop-blur-xl border-accent/30">
            <CardHeader>
              <CardTitle className="text-lg">Must-Have Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {job.nice_to_have && job.nice_to_have.length > 0 && (
          <Card className="glass backdrop-blur-xl border-accent/30">
            <CardHeader>
              <CardTitle className="text-lg">Nice-to-Have Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.nice_to_have.map((skill, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Circle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{skill}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Benefits */}
      {job.benefits && job.benefits.length > 0 && (
        <Card className="glass backdrop-blur-xl border-accent/30">
          <CardHeader>
            <CardTitle>Benefits & Perks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {job.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-background/30 border border-border/10">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Tags */}
      {job.tags && job.tags.length > 0 && (
        <Card className="glass backdrop-blur-xl border-accent/30">
          <CardHeader>
            <CardTitle>Skills & Technologies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
