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
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={`gap-2 bg-background/50 backdrop-blur-sm border-white/10 hover:bg-background/70 ${className}`}
      >
        <Users className="w-4 h-4" />
        <span>{getLabel()}</span>
        <ChevronDown className="w-4 h-4 opacity-50" />
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