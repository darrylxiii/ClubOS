import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Star, User, Pause, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { useSwipeable } from 'react-swipeable';
import { CandidateReviewCard } from './CandidateReviewCard';
import { ReviewSessionStats } from './ReviewSessionStats';
import { ReviewShortcutOverlay } from './ReviewShortcutOverlay';
import { motion, AnimatePresence } from 'framer-motion';

interface PartnerFirstReviewPanelProps {
  jobId: string;
}

const QUICK_TAGS = [
  'skills_gap', 'too_junior', 'too_senior', 'salary',
  'location', 'culture', 'great_fit', 'strong_technical', 'leadership_potential',
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
  return tag.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export const PartnerFirstReviewPanel = ({ jobId }: PartnerFirstReviewPanelProps) => {
  const {
    partnerPending,
    reviewQueue,
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
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'down' | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'held'>('review');

  // Session stats
  const [sessionStart] = useState(Date.now());
  const [sessionApproved, setSessionApproved] = useState(0);
  const [sessionRejected, setSessionRejected] = useState(0);
  const [sessionHeld, setSessionHeld] = useState(0);

  // Held candidates (partner_review_status = 'hold')
  const heldCandidates = useMemo(
    () => reviewQueue.filter((a) => a.partnerReviewStatus === 'hold'),
    [reviewQueue],
  );

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
    setSwipeDirection(null);
  }, []);

  const goNext = useCallback(() => {
    resetInputs();
  }, [resetInputs]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const parseGaps = () =>
    specificGapsText.split(',').map((v) => v.trim()).filter(Boolean);

  // Auto-select tag for high/low match
  useEffect(() => {
    if (currentApplication) {
      const score = currentApplication.matchScore;
      if (score !== null && score >= 85 && !selectedTags.includes('great_fit')) {
        setSelectedTags((prev) => [...prev, 'great_fit']);
      }
    }
  }, [currentApplication?.id]);

  const handleApprove = useCallback(async () => {
    if (!currentApplication || isSubmitting) return;
    setSwipeDirection('right');
    await new Promise((r) => setTimeout(r, 250));
    await approvePartnerMutation.mutateAsync({
      application: currentApplication,
      notes: notes.trim() || undefined,
      rating: rating || undefined,
      tags: selectedTags,
    });
    setSessionApproved((n) => n + 1);
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
    setSwipeDirection('left');
    await new Promise((r) => setTimeout(r, 250));
    await rejectPartnerMutation.mutateAsync({
      application: currentApplication,
      notes: notes.trim(),
      rejectionReason,
      specificGaps: parseGaps(),
      idealCandidate: idealCandidate.trim() || undefined,
      tags: selectedTags,
      rating: rating || undefined,
    });
    setSessionRejected((n) => n + 1);
    goNext();
  }, [currentApplication, isSubmitting, rejectPartnerMutation, notes, rejectionReason, specificGapsText, idealCandidate, selectedTags, rating, goNext]);

  const handleHold = useCallback(async () => {
    if (!currentApplication || isSubmitting) return;
    setSwipeDirection('down');
    await new Promise((r) => setTimeout(r, 250));
    await holdPartnerMutation.mutateAsync({
      application: currentApplication,
      notes: notes.trim() || undefined,
      rating: rating || undefined,
      tags: selectedTags,
    });
    setSessionHeld((n) => n + 1);
    goNext();
  }, [currentApplication, isSubmitting, holdPartnerMutation, notes, rating, selectedTags, goNext]);

  // Clamp index
  useEffect(() => {
    if (partnerPending.length > 0 && currentIndex >= partnerPending.length) {
      setCurrentIndex(partnerPending.length - 1);
    }
  }, [currentIndex, partnerPending.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.getAttribute('role') === 'combobox';
      if (isTyping) return;

      if (event.key === 'ArrowRight') { event.preventDefault(); void handleApprove(); }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (intent !== 'reject') setIntent('reject');
        else void handleReject();
      }
      if (event.key === 'ArrowDown') { event.preventDefault(); void handleHold(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleApprove, handleReject, handleHold, intent]);

  const swipeHandlers = useSwipeable({
    onSwipedRight: () => void handleApprove(),
    onSwipedLeft: () => {
      if (intent !== 'reject') setIntent('reject');
      else void handleReject();
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

  if (!currentApplication && heldCandidates.length === 0) {
    return (
      <Card className="border-success/20">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-success/15 flex items-center justify-center">
            <Star className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="font-semibold">All reviews complete</p>
            <p className="text-sm text-muted-foreground">No candidates are waiting for your review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session stats */}
      <ReviewSessionStats
        totalInQueue={partnerPending.length + sessionApproved + sessionRejected + sessionHeld}
        currentIndex={currentIndex}
        approvedCount={sessionApproved}
        rejectedCount={sessionRejected}
        heldCount={sessionHeld}
        sessionStartTime={sessionStart}
      />

      {/* Tabs for pending vs held */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'review' | 'held')}>
        <TabsList className="grid grid-cols-2 w-64">
          <TabsTrigger value="review" className="gap-1.5">
            Queue
            {partnerPending.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px]">
                {partnerPending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="held" className="gap-1.5">
            <Pause className="h-3 w-3" />
            Held
            {heldCandidates.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] bg-warning/20 text-warning">
                {heldCandidates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-4 space-y-5">
          {!currentApplication ? (
            <Card className="border-success/20">
              <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">Queue is clear. Check the Held tab for parked candidates.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <Progress value={progressValue} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">
                  {currentIndex + 1} of {partnerPending.length}
                </span>
              </div>

              {/* Low match warning */}
              {currentApplication.matchScore !== null && currentApplication.matchScore < 40 && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Low match score — review carefully before advancing.</span>
                </div>
              )}

              {/* Candidate card with swipe animation */}
              <div {...swipeHandlers}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentApplication.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{
                      opacity: 1,
                      x: swipeDirection === 'right' ? 100 : swipeDirection === 'left' ? -100 : 0,
                      y: swipeDirection === 'down' ? 50 : 0,
                      scale: swipeDirection ? 0.95 : 1,
                      rotate: swipeDirection === 'right' ? 3 : swipeDirection === 'left' ? -3 : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      'transition-shadow',
                      swipeDirection === 'right' && 'shadow-[0_0_30px_-5px_hsl(var(--success)/0.4)]',
                      swipeDirection === 'left' && 'shadow-[0_0_30px_-5px_hsl(var(--destructive)/0.4)]',
                    )}
                  >
                    <CandidateReviewCard application={currentApplication} selected />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Quick feedback tags */}
              <div className="space-y-2">
                <Label className="text-xs">Quick feedback</Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      size="sm"
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => toggleTag(tag)}
                    >
                      {formatTagLabel(tag)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <Label className="text-xs">Rating</Label>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="rounded p-0.5 transition-colors hover:bg-muted"
                    >
                      <Star
                        className={cn('h-5 w-5', star <= rating ? 'text-primary fill-current' : 'text-muted-foreground/30')}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Review notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Context for strategist and hiring team"
                  className="min-h-20"
                />
              </div>

              {/* Rejection details */}
              {intent === 'reject' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                >
                  <p className="text-sm font-medium text-destructive">Rejection details</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Reason</Label>
                    <Select value={rejectionReason} onValueChange={setRejectionReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {REJECTION_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Specific gaps (comma separated)</Label>
                    <Textarea
                      value={specificGapsText}
                      onChange={(e) => setSpecificGapsText(e.target.value)}
                      placeholder="e.g. stakeholder management, enterprise sales"
                      className="min-h-16"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Ideal candidate profile (optional)</Label>
                    <Textarea
                      value={idealCandidate}
                      onChange={(e) => setIdealCandidate(e.target.value)}
                      placeholder="What would make this profile stronger"
                      className="min-h-16"
                    />
                  </div>
                </motion.div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleApprove()}
                  disabled={isSubmitting}
                  className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
                >
                  Approve →
                </Button>
                {intent !== 'reject' ? (
                  <Button variant="outline" onClick={() => setIntent('reject')} disabled={isSubmitting} className="gap-1.5">
                    Reject ←
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={() => void handleReject()} disabled={isSubmitting} className="gap-1.5">
                    Confirm Reject ←
                  </Button>
                )}
                <Button variant="secondary" onClick={() => void handleHold()} disabled={isSubmitting} className="gap-1.5">
                  <Pause className="h-3.5 w-3.5" />
                  Hold ↓
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="held" className="mt-4 space-y-3">
          {heldCandidates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No held candidates. Candidates you park will appear here.
              </CardContent>
            </Card>
          ) : (
            heldCandidates.map((app) => (
              <div key={app.id} className="space-y-2">
                <CandidateReviewCard application={app} compact />
                <div className="flex gap-2 pl-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => void approvePartnerMutation.mutateAsync({
                      application: app,
                      notes: 'Approved from hold queue',
                    })}
                    disabled={isSubmitting}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 text-destructive"
                    onClick={() => void rejectPartnerMutation.mutateAsync({
                      application: app,
                      notes: 'Rejected from hold queue',
                      rejectionReason: 'other',
                    })}
                    disabled={isSubmitting}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <ReviewShortcutOverlay mode="partner" />
    </div>
  );
};
