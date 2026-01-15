import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Infinity as InfinityIcon, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineTypeSelectorProps {
  pipelineType: "standard" | "continuous";
  onPipelineTypeChange: (type: "standard" | "continuous") => void;
  targetHireCount: number | null;
  onTargetHireCountChange: (count: number | null) => void;
  isUnlimited: boolean;
  onIsUnlimitedChange: (unlimited: boolean) => void;
  className?: string;
}

export function PipelineTypeSelector({
  pipelineType,
  onPipelineTypeChange,
  targetHireCount,
  onTargetHireCountChange,
  isUnlimited,
  onIsUnlimitedChange,
  className,
}: PipelineTypeSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-sm font-medium">Pipeline Type</Label>
      
      <RadioGroup
        value={pipelineType}
        onValueChange={(v) => onPipelineTypeChange(v as "standard" | "continuous")}
        className="grid grid-cols-2 gap-4"
      >
        {/* Standard Option */}
        <label
          className={cn(
            "relative flex cursor-pointer flex-col rounded-lg border p-4 transition-all hover:border-primary/50",
            pipelineType === "standard"
              ? "border-primary bg-primary/5"
              : "border-border"
          )}
        >
          <RadioGroupItem
            value="standard"
            className="absolute right-3 top-3"
          />
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="font-medium">Standard</span>
          <span className="text-xs text-muted-foreground mt-1">
            Single hire, job closes when filled
          </span>
        </label>

        {/* Continuous Option */}
        <label
          className={cn(
            "relative flex cursor-pointer flex-col rounded-lg border p-4 transition-all hover:border-primary/50",
            pipelineType === "continuous"
              ? "border-primary bg-primary/5"
              : "border-border"
          )}
        >
          <RadioGroupItem
            value="continuous"
            className="absolute right-3 top-3"
          />
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium">Continuous</span>
          <span className="text-xs text-muted-foreground mt-1">
            Multiple hires, stays open
          </span>
        </label>
      </RadioGroup>

      {/* Continuous Options */}
      {pipelineType === "continuous" && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="unlimited"
              checked={isUnlimited}
              onCheckedChange={(checked) => {
                onIsUnlimitedChange(checked === true);
                if (checked) {
                  onTargetHireCountChange(null);
                }
              }}
            />
            <label
              htmlFor="unlimited"
              className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1.5"
            >
              <InfinityIcon className="h-4 w-4" />
              Unlimited hires
            </label>
          </div>

          {!isUnlimited && (
            <div className="space-y-2">
              <Label htmlFor="targetCount" className="text-sm">
                Target number of hires
              </Label>
              <Input
                id="targetCount"
                type="number"
                min={2}
                placeholder="e.g., 5"
                value={targetHireCount || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onTargetHireCountChange(isNaN(val) ? null : val);
                }}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Pipeline will auto-close after reaching this target
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
