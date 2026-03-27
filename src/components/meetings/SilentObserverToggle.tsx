import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation("meetings");
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
            {t('observer.joinAsSilent')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('observer.description')}
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
              {t('observer.tooltip')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
