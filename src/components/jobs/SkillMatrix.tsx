import { Check, Star, Target, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SkillMatrixProps {
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
}

export function SkillMatrix({ mustHaveSkills = [], niceToHaveSkills = [] }: SkillMatrixProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (mustHaveSkills.length === 0 && niceToHaveSkills.length === 0) {
    return null;
  }

  const totalCount = mustHaveSkills.length + niceToHaveSkills.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <Target className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black">Skills & Requirements</h3>
                  <p className="text-sm text-muted-foreground">
                    {mustHaveSkills.length} must-have • {niceToHaveSkills.length} nice-to-have
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
            {/* Must-Have Skills */}
            {mustHaveSkills.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-chart-2">Must-Have Skills</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mustHaveSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-3 p-3 rounded-lg bg-chart-2/10 border border-chart-2/20 hover:border-chart-2/40 transition-all"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-chart-2" />
                      </div>
                      <span className="font-medium text-foreground">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nice-to-Have Skills */}
            {niceToHaveSkills.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold text-accent">Nice-to-Have Skills</h4>
                  <span className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full">
                    Bonus
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {niceToHaveSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20 hover:border-accent/40 transition-all"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                        <Star className="w-4 h-4 text-accent" />
                      </div>
                      <span className="font-medium text-foreground">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
