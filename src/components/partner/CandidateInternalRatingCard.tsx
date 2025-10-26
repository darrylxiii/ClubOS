import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, TrendingUp, Activity, Save } from "lucide-react";

interface Props {
  candidateId: string;
  candidate: any;
  onUpdate: () => void;
}

export const CandidateInternalRatingCard = ({ candidateId, candidate, onUpdate }: Props) => {
  const [internalRating, setInternalRating] = useState(candidate.internal_rating || 5);
  const [engagementScore, setEngagementScore] = useState(candidate.engagement_score || 5);
  const [fitScore, setFitScore] = useState(candidate.fit_score || 5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          internal_rating: internalRating,
          engagement_score: engagementScore,
          fit_score: fitScore,
          last_profile_update: new Date().toISOString(),
        })
        .eq('id', candidateId);

      if (error) throw error;

      // If notes provided, add interaction
      if (notes.trim()) {
        await supabase.from('candidate_interactions').insert({
          candidate_id: candidateId,
          interaction_type: 'note',
          interaction_direction: 'internal',
          title: 'Rating updated',
          content: notes,
          visible_to_candidate: false,
        });
      }

      toast.success('Ratings updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating ratings:', error);
      toast.error('Failed to update ratings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Internal Assessment Scores
          </CardTitle>
          <CardDescription>Team evaluation metrics (not visible to candidate)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Internal Rating */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Star className="w-4 h-4" />
                Internal Rating
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {internalRating}/10
              </Badge>
            </div>
            <Slider
              value={[internalRating]}
              onValueChange={(v) => setInternalRating(v[0])}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Overall team assessment of candidate quality
            </p>
          </div>

          <Separator />

          {/* Engagement Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Engagement Score
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {engagementScore}/10
              </Badge>
            </div>
            <Slider
              value={[engagementScore]}
              onValueChange={(v) => setEngagementScore(v[0])}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Candidate responsiveness and interest level
            </p>
          </div>

          <Separator />

          {/* Fit Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Fit Score
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {fitScore}/10
              </Badge>
            </div>
            <Slider
              value={[fitScore]}
              onValueChange={(v) => setFitScore(v[0])}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Skills and experience alignment with opportunities
            </p>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating Notes (Optional)</label>
            <Textarea
              placeholder="Add context for these ratings..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Ratings'}
          </Button>
        </CardContent>
      </Card>

      {/* Rating History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rating History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            View all rating changes and team member assessments over time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
