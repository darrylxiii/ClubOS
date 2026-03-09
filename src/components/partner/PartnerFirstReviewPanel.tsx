import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { useSwipeable } from 'react-swipeable';

interface PartnerFirstReviewPanelProps {
  jobId: string;
}

const QUICK_TAGS = [
  'skills_gap',
  'too_junior',
  'too_senior',
  'salary',
  'location',
  'culture',
  'great_fit',
  'strong_technical',
  'leadership_potential',
] as const;

const REJECTION_REASONS = [
  { value: 'skills_gap', label: 'Skills gap' },
  { value: 'experience_junior', label: 'Too junior' },
  { value: 'experience_senior', label: 'Too senior' },
  { value: 'salary_high', label: 'Salary mismatch' },
  { value: 'location', label: 'Location mismatch' },
  { value: 'culture_fit', label: 'Culture fit' },
  { value: 'other', label: 'Other' },
] as const;

function formatTagLabel(tag: string): string {
  return tag
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const formatComp = (min: number | null, max: number | null, currency: string | null) => {
  if (!min && !max) return 'Not disclosed';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 0,
  });
  if (min && max) return `${formatter.format(min)} – ${formatter.format(max)}`;
  return formatter.format(min || max || 0);
};

export const PartnerFirstReviewPanel = ({ jobId }: PartnerFirstReviewPanelProps) => {
  const {
    partnerPending,
    isLoading,
    approvePartnerMutation,
    rejectPartnerMutation,
    holdPartnerMutation,
  } = useReviewQueue(jobId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [intent, setIntent] = useState<'none' | 'reject'>('none');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [specificGapsText, setSpecificGapsText] = useState('');
  const [idealCandidate, setIdealCandidate] = useState('');

  // Stable snapshot length to avoid off-by-one during refetch
  const snapshotLengthRef = useRef(partnerPending.length);
  useEffect(() => {
    snapshotLengthRef.current = partnerPending.length;
  }, [partnerPending.length]);

  const currentApplication = partnerPending[currentIndex] ?? null;

  const progressValue = useMemo(() => {
    if (partnerPending.length === 0) return 0;
    return ((currentIndex + 1) / partnerPending.length) * 100;
  }, [currentIndex, partnerPending.length]);

  const isSubmitting =
    approvePartnerMutation.isPending ||
    rejectPartnerMutation.isPending ||
    holdPartnerMutation.isPending;

  const resetInputs = useCallback(() => {
    setNotes('');
    setRating(0);
    setSelectedTags([]);
    setIntent('none');
    setRejectionReason('');
    setSpecificGapsText('');
    setIdealCandidate('');
  }, []);

  const goNext = useCallback(() => {
    // Don't increment — the current item gets removed from partnerPending after mutation settles.
    // The clamp effect below handles the edge case.
    resetInputs();
  }, [resetInputs]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const parseGaps = () =>
    specificGapsText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const handleApprove = useCallback(async () => {
    if (!currentApplication || isSubmitting) return;
    await approvePartnerMutation.mutateAsync({
      application: currentApplication,
      notes: notes.trim() || undefined,
      rating: rating || undefined,
      tags: selectedTags,
    });
    goNext();
  }, [currentApplication, isSubmitting, approvePartnerMutation, notes, rating, selectedTags, goNext]);

  const handleReject = useCallback(async () => {
    if (!currentApplication || isSubmitting) return;
    if (!rejectionReason) {
      toast.error('Select a rejection reason.');
      return;
    }
    if (!notes.trim()) {
      toast.error('Rejection notes are required.');
      return;
    }
    await rejectPartnerMutation.mutateAsync({
      application: currentApplication,
      notes: notes.trim(),
      rejectionReason,
      specificGaps: parseGaps(),
      idealCandidate: idealCandidate.trim() || undefined,
      tags: selectedTags,
      rating: rating || undefined,
    });
    goNext();
  }, [currentApplication, isSubmitting, rejectPartnerMutation, notes, rejectionReason, specificGapsText, idealCandidate, selectedTags, rating, goNext]);

  const handleHold = useCallback(async () => {
    if (!currentApplication || isSubmitting) return;
    await holdPartnerMutation.mutateAsync({
      application: currentApplication,
      notes: notes.trim() || undefined,
      rating: rating || undefined,
      tags: selectedTags,
    });
    goNext();
  }, [currentApplication, isSubmitting, holdPartnerMutation, notes, rating, selectedTags, goNext]);

  // Clamp index when list shrinks
  useEffect(() => {
    if (partnerPending.length > 0 && currentIndex >= partnerPending.length) {
      setCurrentIndex(partnerPending.length - 1);
    }
  }, [currentIndex, partnerPending.length]);

  // Keyboard shortcuts with stable callbacks
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('role') === 'combobox';
      if (isTyping) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        void handleApprove();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (intent !== 'reject') {
          setIntent('reject');
        } else {
          void handleReject();
        }
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        void handleHold();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleApprove, handleReject, handleHold, intent]);

  // Swipe gesture support
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => void handleApprove(),
    onSwipedLeft: () => {
      if (intent !== 'reject') {
        setIntent('reject');
      } else {
        void handleReject();
      }
    },
    onSwipedDown: () => void handleHold(),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!currentApplication) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partner Review Queue</CardTitle>
          <CardDescription>No candidates are waiting for partner review.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Partner First Review</CardTitle>
          <Badge variant="secondary">
            {currentIndex + 1} of {partnerPending.length}
          </Badge>
        </div>
        <Progress value={progressValue} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6" {...swipeHandlers}>
        {/* Candidate card */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={currentApplication.candidateAvatarUrl || undefined} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">{currentApplication.candidateName}</h3>
              <p className="text-sm text-muted-foreground">
                {currentApplication.candidateTitle || 'Title not set'}
              </p>
            </div>
            <Badge variant="outline">Match {currentApplication.matchScore ?? '—'}%</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {currentApplication.jobTitle} · {currentApplication.companyName}
          </p>

          <p className="text-sm">
            Salary band: {formatComp(currentApplication.salaryMin, currentApplication.salaryMax, currentApplication.currency)}
          </p>

          {/* Source info */}
          {(currentApplication.candidateSourceChannel || currentApplication.candidateSourcedBy) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {currentApplication.candidateSourceChannel && (
                <span>Source: {formatTagLabel(currentApplication.candidateSourceChannel)}</span>
              )}
              {currentApplication.candidateSourcedBy && (
                <span>· Sourced by {currentApplication.candidateSourcedBy}</span>
              )}
            </div>
          )}

          {currentApplication.candidateSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentApplication.candidateSkills.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {/* Internal review notes from strategist */}
          {currentApplication.internalReviewNotes && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Internal review notes</p>
              <p>{currentApplication.internalReviewNotes}</p>
            </div>
          )}
        </div>

        {/* Quick feedback tags */}
        <div className="space-y-3">
          <Label>Quick feedback tags</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => (
              <Button
                key={tag}
                type="button"
                size="sm"
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                onClick={() => toggleTag(tag)}
              >
                {formatTagLabel(tag)}
              </Button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-3">
          <Label>Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="rounded p-1 transition-colors hover:bg-muted"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-5 w-5 ${star <= rating ? 'text-primary fill-current' : 'text-muted-foreground'}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Review notes (always visible) */}
        <div className="space-y-3">
          <Label>Review notes</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Context for strategist and hiring team"
            className="min-h-24"
          />
        </div>

        {/* Rejection fields — only shown when intent is reject */}
        {intent === 'reject' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 animate-fade-in">
            <p className="text-sm font-medium text-destructive">Rejection details</p>

            <div className="space-y-3">
              <Label>Rejection reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason for rejection" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Specific gaps (comma separated)</Label>
              <Textarea
                value={specificGapsText}
                onChange={(event) => setSpecificGapsText(event.target.value)}
                placeholder="e.g. stakeholder management, enterprise sales"
                className="min-h-20"
              />
            </div>

            <div className="space-y-3">
              <Label>Ideal candidate profile (optional)</Label>
              <Textarea
                value={idealCandidate}
                onChange={(event) => setIdealCandidate(event.target.value)}
                placeholder="Describe what would make this profile stronger"
                className="min-h-20"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleApprove()} disabled={isSubmitting}>
            Approve (→)
          </Button>
          {intent !== 'reject' ? (
            <Button variant="outline" onClick={() => setIntent('reject')} disabled={isSubmitting}>
              Reject (←)
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => void handleReject()} disabled={isSubmitting}>
              Confirm Reject (←)
            </Button>
          )}
          <Button variant="secondary" onClick={() => void handleHold()} disabled={isSubmitting}>
            Hold (↓)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
