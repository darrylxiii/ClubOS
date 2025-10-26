import { Target, Calendar, TrendingUp, CheckSquare, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ResponsibilityGridProps {
  responsibilities?: string[];
}

const getCategoryForResponsibility = (responsibility: string) => {
  const lower = responsibility.toLowerCase();
  
  if (lower.includes('daily') || lower.includes('day-to-day') || lower.includes('regularly')) {
    return { type: 'daily', icon: Calendar, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' };
  }
  if (lower.includes('weekly') || lower.includes('week') || lower.includes('recurring')) {
    return { type: 'weekly', icon: Calendar, color: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30' };
  }
  if (lower.includes('strategic') || lower.includes('long-term') || lower.includes('planning') || lower.includes('lead')) {
    return { type: 'strategic', icon: TrendingUp, color: 'from-accent/20 to-primary/20', border: 'border-accent/30' };
  }
  
  return { type: 'daily', icon: Target, color: 'from-chart-2/20 to-chart-1/20', border: 'border-chart-2/30' };
};

export function ResponsibilityGrid({ responsibilities = [] }: ResponsibilityGridProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (responsibilities.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <CheckSquare className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black">Key Responsibilities</h3>
                  <p className="text-sm text-muted-foreground">
                    {responsibilities.length} core responsibilities
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
          <CardContent className="border-t pt-6">
            <div className="space-y-3">
              {responsibilities.map((responsibility, index) => {
                const category = getCategoryForResponsibility(responsibility);
                const Icon = category.icon;

                return (
                  <div
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 ${category.border} bg-gradient-to-r ${category.color} hover:border-primary transition-all group`}
                  >
                    {/* Number indicator */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} border ${category.border} flex items-center justify-center`}>
                      <span className="text-sm font-bold text-foreground">
                        {index + 1}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="flex-1 text-foreground leading-relaxed">
                      {responsibility}
                    </p>

                    {/* Category icon */}
                    <Icon className="flex-shrink-0 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
