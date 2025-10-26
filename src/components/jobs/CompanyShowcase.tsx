import { 
  Users, 
  TrendingUp, 
  Globe,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  Building2,
  ChevronDown
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CompanyShowcaseProps {
  company?: {
    name: string;
    description?: string;
    tagline?: string;
    industry?: string;
    company_size?: string;
    headquarters_location?: string;
    website_url?: string;
    founded_year?: number;
    funding_stage?: string;
  };
}

export function CompanyShowcase({ company }: CompanyShowcaseProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!company) return null;

  // Mock data for stats (in real app, this would come from API)
  const stats = [
    { label: "Employees", value: company.company_size || "50-200", icon: Users },
    { label: "Founded", value: company.founded_year || "2020", icon: Calendar },
    { label: "Industry", value: company.industry || "Technology", icon: Briefcase },
    { label: "Stage", value: company.funding_stage || "Series A", icon: TrendingUp },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <Building2 className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black">About {company.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {company.industry || 'Technology'} • {company.company_size || '50-200'} • {company.headquarters_location || 'Remote'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-6 h-6 transition-transform flex-shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t pt-6 space-y-6">
            {/* Company Description */}
            {company.description && (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-foreground/90 leading-relaxed">
                  {company.description.split('\n').map((paragraph, index) => (
                    <span key={index}>
                      {paragraph}
                      {index < company.description!.split('\n').length - 1 && <><br /><br /></>}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {/* Company Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                
                return (
                  <div
                    key={stat.label}
                    className="text-center p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:border-primary/40 transition-all"
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-xl font-bold mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Company Info Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Location */}
              {company.headquarters_location && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border-2 border-blue-500/20">
                  <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Headquarters</h4>
                    <p className="text-sm text-muted-foreground">{company.headquarters_location}</p>
                  </div>
                </div>
              )}

              {/* Website */}
              {company.website_url && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-500/10 border-2 border-purple-500/20">
                  <Globe className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Website</h4>
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      Visit Website →
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Why Join Section */}
            <div className="p-4 rounded-lg bg-chart-2/10 border-2 border-chart-2/20">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-chart-2" />
                <h4 className="font-semibold text-foreground">Why Join {company.name}?</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Join a growing company offering unique opportunities to make an impact and grow your career.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 text-xs font-medium bg-chart-2/20 text-chart-2 rounded-full border border-chart-2/30">
                  Expanding Team
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-accent/20 text-accent rounded-full border border-accent/30">
                  High Impact
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full border border-primary/30">
                  Growth Phase
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
