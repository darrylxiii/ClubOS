import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Eye, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StealthJobToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  showWarning?: boolean;
}

export function StealthJobToggle({ 
  enabled, 
  onEnabledChange, 
  disabled = false,
  showWarning = false 
}: StealthJobToggleProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg border transition-all",
      enabled 
        ? "bg-amber-500/10 border-amber-500/30" 
        : "bg-muted/30 border-border"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          enabled ? "bg-amber-500/20" : "bg-muted"
        )}>
          {enabled ? (
            <Lock className="h-5 w-5 text-amber-600" />
          ) : (
            <Eye className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="stealth-mode" className="font-medium cursor-pointer">
              Stealth Mode
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Stealth jobs are only visible to users you explicitly grant access to. Perfect for confidential executive searches or sensitive hires.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            {enabled 
              ? "This job is hidden from public view" 
              : "This job is visible to all users"}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {showWarning && enabled && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Changing visibility will affect who can see this job</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Switch
          id="stealth-mode"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
          className={cn(
            enabled && "data-[state=checked]:bg-amber-500"
          )}
        />
      </div>
    </div>
  );
}
