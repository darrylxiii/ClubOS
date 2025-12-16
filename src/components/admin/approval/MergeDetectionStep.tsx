import { useState, useEffect } from "react";
import { MergeSuggestionForApproval, ExistingApplication } from "@/types/approval";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, AlertCircle, Briefcase } from "lucide-react";
import { memberApprovalService } from "@/services/memberApprovalService";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MergeDetectionStepProps {
  email: string;
  name: string;
  onSelectMerges: (merges: Array<{ candidateId: string; userId: string }>, existingApplications: ExistingApplication[]) => void;
  onSkip: () => void;
}

export const MergeDetectionStep = ({ 
  email, 
  name, 
  onSelectMerges, 
  onSkip 
}: MergeDetectionStepProps) => {
  const [suggestions, setSuggestions] = useState<MergeSuggestionForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestions();
  }, [email, name]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const results = await memberApprovalService.getMergeSuggestionsForMember(email, name);
      setSuggestions(results);
      
      // Auto-select high confidence matches
      const highConfidence = results
        .filter(s => s.confidence_score && s.confidence_score >= 90)
        .map(s => s.candidate_id);
      setSelectedSuggestions(new Set(highConfidence));
    } catch (error) {
      console.error('Error loading merge suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestion = (candidateId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map(s => s.candidate_id)));
    }
  };

  const handleContinue = () => {
    const selectedCandidates = suggestions.filter(s => selectedSuggestions.has(s.candidate_id));
    const merges = selectedCandidates.map(s => ({
      candidateId: s.candidate_id,
      userId: s.profile_id,
    }));
    
    // Collect all existing applications from selected candidates
    const allExistingApplications = selectedCandidates.flatMap(s => s.existing_applications || []);
    
    onSelectMerges(merges, allExistingApplications);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No existing candidate profiles found matching this email. A new candidate profile will be created.
          </AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button onClick={onSkip}>
            Continue to Create Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Potential Profile Matches Found</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          {selectedSuggestions.size === suggestions.length ? 'Deselect All' : `Select All (${suggestions.length})`}
        </Button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <Card 
            key={suggestion.candidate_id}
            className="border-2 transition-all hover:border-primary/50 cursor-pointer"
            onClick={() => toggleSuggestion(suggestion.candidate_id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={selectedSuggestions.has(suggestion.candidate_id)}
                  onCheckedChange={() => toggleSuggestion(suggestion.candidate_id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{suggestion.candidate_name || 'Unknown Name'}</p>
                      <p className="text-sm text-muted-foreground">{suggestion.candidate_email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={
                        (suggestion.confidence_score || 0) >= 90 ? 'default' :
                        (suggestion.confidence_score || 0) >= 70 ? 'secondary' : 'outline'
                      }>
                        {suggestion.confidence_score || 0}% Match
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.match_type === 'email_match' ? 'Email Match' : 'Name Match'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Show existing pipelines/applications */}
                  {suggestion.existing_applications && suggestion.existing_applications.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Briefcase className="w-3 h-3" />
                        <span>Already in pipelines:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.existing_applications.map((app, idx) => (
                          <Badge 
                            key={idx} 
                            variant={app.status === 'submitted' || app.status === 'interview' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {app.job_title} ({app.status})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(suggestion.candidate_created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onSkip}>
          Skip & Create New Profile
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={selectedSuggestions.size === 0}
        >
          Continue with {selectedSuggestions.size} Selected
        </Button>
      </div>
    </div>
  );
};