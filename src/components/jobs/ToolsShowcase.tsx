import { Wrench, CheckCircle, Star } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
}

interface ToolsShowcaseProps {
  requiredTools: Tool[];
  niceToHaveTools: Tool[];
}

const CATEGORY_LABELS: Record<string, string> = {
  project_management: "Project Mgmt",
  communication: "Communication",
  design: "Design",
  development: "Development",
  language: "Language/Framework",
  database: "Database",
  cloud: "Cloud",
  analytics: "Analytics",
  crm: "CRM",
  marketing: "Marketing",
  other: "Other",
};

export function ToolsShowcase({ requiredTools = [], niceToHaveTools = [] }: ToolsShowcaseProps) {
  if (requiredTools.length === 0 && niceToHaveTools.length === 0) {
    return null;
  }

  const formatCategory = (category: string) => CATEGORY_LABELS[category] || category;

  return (
    <Card className="border-2 hover:border-primary transition-all hover-scale">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <h3 className="text-xl font-black">Tools & Technologies</h3>
            <p className="text-sm text-muted-foreground">
              {requiredTools.length} required • {niceToHaveTools.length} nice-to-have
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="border-t pt-6 space-y-6">
        {/* Required Tools */}
        {requiredTools.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-chart-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Must Have
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {requiredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-chart-2/10 border border-chart-2/20 hover:border-chart-2/40 hover:scale-105 transition-all cursor-pointer group"
                  title={tool.name}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-background rounded-lg p-2 shadow-sm group-hover:shadow-md transition-shadow">
                    {tool.logo_url ? (
                      <img
                        src={tool.logo_url}
                        alt={tool.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          // Show fallback badge
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-full h-full flex items-center justify-center text-lg font-black text-chart-2";
                            fallback.textContent = tool.name.charAt(0).toUpperCase();
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-black text-chart-2">
                        {tool.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-center line-clamp-2">
                    {tool.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCategory(tool.category)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nice-to-Have Tools */}
        {niceToHaveTools.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-accent flex items-center gap-2">
                <Star className="w-5 h-5" />
                Nice to Have
              </h4>
              <span className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full">
                Bonus
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {niceToHaveTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent/10 border border-accent/20 hover:border-accent/40 hover:scale-105 transition-all cursor-pointer group"
                  title={tool.name}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-background rounded-lg p-2 shadow-sm group-hover:shadow-md transition-shadow">
                    {tool.logo_url ? (
                      <img
                        src={tool.logo_url}
                        alt={tool.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          // Show fallback badge
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-full h-full flex items-center justify-center text-lg font-black text-accent";
                            fallback.textContent = tool.name.charAt(0).toUpperCase();
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-black text-accent">
                        {tool.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-center line-clamp-2">
                    {tool.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCategory(tool.category)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
