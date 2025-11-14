import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Star, TrendingUp, Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OverallAssessmentEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function OverallAssessmentEditor({ candidate, onChange }: OverallAssessmentEditorProps) {
  const [fitScore, setFitScore] = useState(candidate.fit_score || 5);
  const [engagementScore, setEngagementScore] = useState(candidate.engagement_score || 5);
  const [internalRating, setInternalRating] = useState(candidate.internal_rating || 5);
  const [aiSummary, setAiSummary] = useState(candidate.ai_summary || '');
  const [strengths, setStrengths] = useState<string[]>(
    Array.isArray(candidate.ai_strengths) 
      ? candidate.ai_strengths.map((s: any) => typeof s === 'string' ? s : s.point || s)
      : []
  );
  const [concerns, setConcerns] = useState<string[]>(
    Array.isArray(candidate.ai_concerns)
      ? candidate.ai_concerns.map((c: any) => typeof c === 'string' ? c : c.point || c)
      : []
  );
  const [newStrength, setNewStrength] = useState('');
  const [newConcern, setNewConcern] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const handleAddStrength = () => {
    if (newStrength.trim()) {
      setStrengths([...strengths, newStrength.trim()]);
      setNewStrength('');
    }
  };

  const handleRemoveStrength = (index: number) => {
    setStrengths(strengths.filter((_, i) => i !== index));
  };

  const handleAddConcern = () => {
    if (newConcern.trim()) {
      setConcerns([...concerns, newConcern.trim()]);
      setNewConcern('');
    }
  };

  const handleRemoveConcern = (index: number) => {
    setConcerns(concerns.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Score Sliders */}
      <div className="grid grid-cols-3 gap-6">
        {/* Fit Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Fit Score
            </Label>
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
        </div>

        {/* Engagement Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Engagement
            </Label>
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
        </div>

        {/* Internal Rating */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Internal Rating
            </Label>
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
        </div>
      </div>

      <Separator />

      {/* AI Summary */}
      <div className="space-y-2">
        <Label>Executive Summary</Label>
        <Textarea
          value={aiSummary}
          onChange={(e) => setAiSummary(e.target.value)}
          placeholder="Write a brief executive summary of this candidate..."
          rows={4}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {aiSummary.length}/500 characters
        </p>
      </div>

      <Separator />

      {/* Key Strengths */}
      <div className="space-y-3">
        <Label>Key Strengths</Label>
        <div className="flex gap-2">
          <Input
            value={newStrength}
            onChange={(e) => setNewStrength(e.target.value)}
            placeholder="Add a strength..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStrength())}
          />
          <Button onClick={handleAddStrength} variant="secondary" type="button">
            Add
          </Button>
        </div>
        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {strengths.map((strength, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {strength}
                <button
                  onClick={() => handleRemoveStrength(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Potential Concerns */}
      <div className="space-y-3">
        <Label>Potential Concerns</Label>
        <div className="flex gap-2">
          <Input
            value={newConcern}
            onChange={(e) => setNewConcern(e.target.value)}
            placeholder="Add a concern..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConcern())}
          />
          <Button onClick={handleAddConcern} variant="secondary" type="button">
            Add
          </Button>
        </div>
        {concerns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {concerns.map((concern, index) => (
              <Badge key={index} variant="destructive" className="gap-1">
                {concern}
                <button
                  onClick={() => handleRemoveConcern(index)}
                  className="ml-1 hover:text-background"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Change Reason */}
      <div className="space-y-2">
        <Label>
          Change Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={changeReason}
          onChange={(e) => setChangeReason(e.target.value)}
          placeholder="Explain why you're making these changes..."
          rows={2}
          required
        />
        <p className="text-xs text-muted-foreground">
          Required for significant changes (scores {'>'}8 or {'<'}3)
        </p>
      </div>
    </div>
  );
}
