import { FileText, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AboutRoleSectionProps {
  description?: string;
}

export function AboutRoleSection({ description }: AboutRoleSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  if (!description) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black">About the Role</h3>
                  <p className="text-sm text-muted-foreground">Full job description</p>
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
            <p className="text-foreground/90 leading-relaxed">
              {description.split('\n').map((paragraph, index) => (
                <span key={index}>
                  {paragraph}
                  {index < description.split('\n').length - 1 && <><br /><br /></>}
                </span>
              ))}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
