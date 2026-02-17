import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, ChevronRight, Plus } from "lucide-react";
import { ObjectivesBoard } from "@/components/objectives/ObjectivesBoard";
import { ObjectivesList } from "@/components/objectives/ObjectivesList";
import { cn } from "@/lib/utils";

interface Objective {
  id: string;
  title: string;
  status: string;
  completion_percentage?: number;
}

interface CollapsedObjectivesSummaryProps {
  objectives: Objective[];
  selectedObjective: string | null;
  onSelectObjective: (id: string | null) => void;
}

export function CollapsedObjectivesSummary({
  objectives,
  selectedObjective,
  onSelectObjective,
}: CollapsedObjectivesSummaryProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (objectives.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-1.5 overflow-x-auto scrollbar-none">
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
        <Target className="h-3 w-3" />
        Objectives
      </span>

      {/* "All" pill */}
      <button
        onClick={() => onSelectObjective(null)}
        className={cn(
          "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
          !selectedObjective
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
        )}
      >
        All
      </button>

      {/* Objective pills */}
      {objectives.map((obj) => {
        const pct = obj.completion_percentage ?? 0;
        const isActive = selectedObjective === obj.id;

        return (
          <button
            key={obj.id}
            onClick={() => onSelectObjective(isActive ? null : obj.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors max-w-[180px]",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            )}
          >
            <span className="truncate">{obj.title}</span>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                pct >= 100
                  ? "text-emerald-500"
                  : pct >= 50
                  ? "text-amber-500"
                  : "text-muted-foreground"
              )}
            >
              {pct}%
            </span>
          </button>
        );
      })}

      {/* Expand to full view */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 shrink-0 text-muted-foreground"
          >
            <ChevronRight className="h-3 w-3" />
            <span className="hidden sm:inline">Expand</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objectives
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Tabs defaultValue="board" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="board">Board</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
              <TabsContent value="board">
                <ObjectivesBoard />
              </TabsContent>
              <TabsContent value="list">
                <ObjectivesList />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
