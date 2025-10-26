import { Button } from "@/components/ui/button";
import { Bookmark, Share2 } from "lucide-react";

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
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={onApply}
        disabled={isApplied}
        size="lg"
        className="flex-1 min-w-[200px]"
      >
        {isApplied ? '✓ Applied' : 'Apply Now'}
      </Button>
      
      <Button
        onClick={onSave}
        variant="outline"
        size="lg"
        className="gap-2"
      >
        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save'}
      </Button>
      
      <Button
        onClick={onShare}
        variant="outline"
        size="lg"
        className="gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>
    </div>
  );
}
