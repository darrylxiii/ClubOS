import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, ChevronDown } from "lucide-react";
import { AudiencePickerModal } from "./AudiencePickerModal";

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

interface AudiencePickerButtonProps {
  value: AudienceSelection;
  onChange: (selection: AudienceSelection) => void;
  className?: string;
}

const audienceLabels: Record<AudienceType, string> = {
  public: "Public",
  connections: "Connections Only",
  company_internal: "Internal (Company)",
  best_friends: "Best Friends",
  custom: "Custom Lists"
};

export const AudiencePickerButton = ({ value, onChange, className }: AudiencePickerButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getLabel = () => {
    if (value.type === 'custom' && value.customListIds && value.customListIds.length > 0) {
      return `${value.customListIds.length} Custom List${value.customListIds.length > 1 ? 's' : ''}`;
    }
    return audienceLabels[value.type] || "Choose Audience";
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`group relative h-9 w-9 p-0 hover:bg-white/5 ${className}`}
        title={getLabel()}
      >
        <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          {getLabel()}
        </span>
      </Button>

      <AudiencePickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value}
        onChange={onChange}
      />
    </>
  );
};