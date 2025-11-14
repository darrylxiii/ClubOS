import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar, Share2, Star, FileText } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CandidateActionBarProps {
  candidateId: string;
  candidateName: string;
  onShortlist?: () => void;
  isShortlisted?: boolean;
}

export function CandidateActionBar({ 
  candidateId, 
  candidateName,
  onShortlist,
  isShortlisted = false
}: CandidateActionBarProps) {
  const navigate = useNavigate();

  const handleMessage = () => {
    toast.info(`Opening message thread with ${candidateName}`);
    // Navigate to messaging or open dialog
  };

  const handleSchedule = () => {
    toast.info(`Opening calendar to schedule interview with ${candidateName}`);
    // Navigate to scheduling or open dialog
  };

  const handleShare = () => {
    const url = `${window.location.origin}/candidate/${candidateId}`;
    navigator.clipboard.writeText(url);
    toast.success("Candidate profile link copied to clipboard");
  };

  const handleViewDossier = () => {
    navigate(`/candidate/${candidateId}`);
  };

  const handleShortlist = () => {
    if (onShortlist) {
      onShortlist();
    } else {
      toast.success(isShortlisted ? "Removed from shortlist" : "Added to shortlist");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={handleMessage}
        className="gap-2 h-8 text-xs"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Message
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSchedule}
        className="gap-2 h-8 text-xs"
      >
        <Calendar className="w-3.5 h-3.5" />
        Schedule
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-2 h-8 text-xs"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </Button>
      <Button
        variant={isShortlisted ? "default" : "outline"}
        size="sm"
        onClick={handleShortlist}
        className="gap-2 h-8 text-xs"
      >
        <Star className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-current' : ''}`} />
        {isShortlisted ? 'Shortlisted' : 'Shortlist'}
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleViewDossier}
        className="gap-2 h-8 text-xs"
      >
        <FileText className="w-3.5 h-3.5" />
        View Dossier
      </Button>
    </div>
  );
}
