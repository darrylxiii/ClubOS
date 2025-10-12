import { Button } from "@/components/ui/button";
import { Calendar, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NextStepHelperProps {
  stageName: string;
  scheduledDate?: string;
  duration?: number | string;
  prepTasks?: Array<{ title: string; url: string }> | string[];
  onBookPrep?: () => void;
  onViewMaterials?: () => void;
}

export function NextStepHelper({ 
  stageName, 
  scheduledDate,
  duration,
  prepTasks = [],
  onBookPrep,
  onViewMaterials
}: NextStepHelperProps) {
  return (
    <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
            Next Step
          </div>
          <h3 className="text-2xl font-bold">{stageName}</h3>
        </div>
        <Badge className="bg-primary text-primary-foreground">Active</Badge>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button 
          size="lg" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onBookPrep?.();
          }}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Book Prep
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onViewMaterials?.();
          }}
        >
          <FileText className="w-4 h-4 mr-2" />
          Materials
        </Button>
      </div>
    </div>
  );
}
