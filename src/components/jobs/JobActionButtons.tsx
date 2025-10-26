import { Button } from "@/components/ui/button";
import { Bookmark, Send } from "lucide-react";

interface JobActionButtonsProps {
  isApplied: boolean;
  isSaved: boolean;
  onApply: () => void;
  onSave: () => void;
  onShare: () => void;
}

export function JobActionButtons({
  isApplied,
  isSaved,
  onApply,
  onSave,
  onShare
}: JobActionButtonsProps) {
  return (
    <>
      <Button
        onClick={onApply}
        disabled={isApplied}
        size="sm"
        className="gap-2"
      >
        <Send className="w-4 h-4" />
        {isApplied ? 'Applied' : 'Apply'}
      </Button>
      
      <Button
        onClick={onSave}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save'}
      </Button>
    </>
  );
}
