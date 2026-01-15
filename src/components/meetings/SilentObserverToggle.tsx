import { Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SilentObserverToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SilentObserverToggle({ value, onChange, disabled }: SilentObserverToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
      <div className="flex items-center gap-3">
        {value ? (
          <EyeOff className="w-5 h-5 text-amber-500" />
        ) : (
          <Eye className="w-5 h-5 text-muted-foreground" />
        )}
        <div className="flex flex-col">
          <Label htmlFor="silent-observer" className="text-sm font-medium cursor-pointer">
            Join as Silent Observer
          </Label>
          <p className="text-xs text-muted-foreground">
            Watch the interview without being seen by candidates
          </p>
        </div>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                id="silent-observer"
                checked={value}
                onCheckedChange={onChange}
                disabled={disabled}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Silent observers can see and hear everything but won't appear in the video grid.
              Perfect for training, QA, or team evaluation.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
