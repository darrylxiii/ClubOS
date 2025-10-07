import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Globe, UserCircle, Building, Heart, List } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type AudienceType = 'public' | 'connections' | 'company_internal' | 'best_friends' | 'custom';

export interface AudienceSelection {
  type: AudienceType;
  customListIds?: string[];
  multiSelect?: {
    company: boolean;
    connections: boolean;
    bestFriends: boolean;
  };
}

interface AudiencePickerCollapsibleProps {
  value: AudienceSelection;
  onChange: (selection: AudienceSelection) => void;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const audienceOptions = [
  { type: 'public' as AudienceType, label: 'Public', icon: Globe, description: 'Anyone can see' },
  { type: 'connections' as AudienceType, label: 'Connections', icon: UserCircle, description: 'Your connections only' },
  { type: 'company_internal' as AudienceType, label: 'Company', icon: Building, description: 'Internal team only' },
  { type: 'best_friends' as AudienceType, label: 'Best Friends', icon: Heart, description: 'Close circle' },
  { type: 'custom' as AudienceType, label: 'Custom Lists', icon: List, description: 'Selected lists' },
];

export const AudiencePickerCollapsible = ({ 
  value, 
  onChange, 
  className,
  open,
  onOpenChange
}: AudiencePickerCollapsibleProps) => {
  const currentOption = audienceOptions.find(opt => opt.type === value.type) || audienceOptions[1];

  const handleSelect = (type: AudienceType) => {
    onChange({ ...value, type });
    onOpenChange(false);
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button 
          type="button"
          variant="ghost"
          size="sm"
          className={`group relative h-9 w-9 p-0 hover:bg-white/5 ${className}`}
          title={currentOption.label}
        >
          <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="absolute right-1/2 translate-x-1/2 top-full mt-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            {currentOption.label}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="absolute right-0 mt-2 z-50">
        <div className="flex flex-col gap-1 bg-popover border border-border rounded-lg p-1 shadow-lg min-w-[200px]">
          {audienceOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = value.type === option.type;
            
            return (
              <Button
                key={option.type}
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(option.type)}
                className={`justify-start gap-3 h-auto py-2 ${
                  isSelected ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
