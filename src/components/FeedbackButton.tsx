import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircleHeart, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { notify } from '@/lib/notify';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigationHistory } from '@/contexts/NavigationHistoryContext';
import { useLocation } from 'react-router-dom';

const DRAFT_KEY = 'quantum_feedback_draft';

interface FeedbackDraft {
  rating: number | null;
  comment: string;
  pagePath: string;
}

export const FeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { history } = useNavigationHistory();
  const location = useLocation();

  // Load draft from localStorage when opening modal
  useEffect(() => {
    if (open) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed: FeedbackDraft = JSON.parse(draft);
          if (parsed.pagePath === location.pathname) {
            setRating(parsed.rating);
            setComment(parsed.comment);
          }
        } catch (_e) {
          console.error('Failed to parse feedback draft:', e);
        }
      }
    }
  }, [open, location.pathname]);

  // Save draft to localStorage on change
  useEffect(() => {
    if (open && (rating !== null || comment.trim())) {
      const draft: FeedbackDraft = {
        rating,
        comment,
        pagePath: location.pathname,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [rating, comment, open, location.pathname]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setRating(null);
    setComment('');
  };

  const handleOpen = () => {
    if (!user) {
      notify.warning('Please sign in to leave feedback.');
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Don't clear immediately - let user come back to their draft
  };

  const handleSubmit = async () => {
    if (!user) {
      notify.warning('Please sign in to submit feedback.');
      return;
    }

    if (!rating) {
      notify.warning('Please select a rating from 1 to 10.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user profile for email and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const pageTitle = history.length > 0 ? history[history.length - 1].title : 'Unknown Page';

      const { error } = await supabase.from('user_feedback').insert([{
        user_id: user.id,
        email: profile?.email || user.email || 'unknown@email.com',
        role: userRole?.role || 'user',
        rating,
        comment: comment.trim() || null,
        page_path: location.pathname,
        page_title: pageTitle,
        navigation_trail: history.slice(-4) as any, // Last 4 pages
      }]);

      if (error) throw error;

      notify.success('Thank you for your feedback!', { description: 'Your feedback helps us improve The Quantum Club.' });

      clearDraft();
      setOpen(false);

      // Send alert if rating is low
      if (rating <= 5) {
        console.log('Low rating alert:', { rating, page: location.pathname, user: user.email });
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      notify.error('Failed to submit feedback', { description: error.message || 'Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingColor = (value: number) => {
    if (value <= 3) return 'text-destructive';
    if (value <= 5) return 'text-muted-foreground';
    if (value <= 7) return 'text-muted-foreground';
    return 'text-green-500';
  };

  const getRatingBgColor = (value: number) => {
    if (value <= 3) return 'bg-destructive/10 border-destructive';
    if (value <= 5) return 'bg-muted/20 border-border';
    if (value <= 7) return 'bg-muted/20 border-border';
    return 'bg-green-500/10 border-green-500';
  };

  const getRatingLabel = (value: number) => {
    if (value <= 3) return 'Poor';
    if (value <= 5) return 'Fair';
    if (value <= 7) return 'Good';
    if (value <= 9) return 'Great';
    return 'Excellent';
  };

  // Hide feedback button for unauthenticated users OR on meeting pages (after all hooks)
  if (!user || location.pathname.startsWith('/meetings/')) {
    return null;
  }

  const content = (
    <>
      <div 
        style={{ 
          position: 'fixed',
          bottom: '5rem',
          right: '2rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 0
        }}
      >
        {!minimized && (
          <Button
            onClick={handleOpen}
            className="h-12 pl-5 pr-3 rounded-l-full rounded-r-none shadow-lg hover:shadow-xl transition-all gap-2.5 border-r-0"
            aria-label="Give feedback"
          >
            <MessageCircleHeart className="h-4 w-4" />
            <span className="font-medium text-sm whitespace-nowrap">Quick Feedback</span>
          </Button>
        )}
        
        <Button
          onClick={() => setMinimized(!minimized)}
          size="icon"
          variant={minimized ? "default" : "ghost"}
          className={`shadow-md hover:shadow-lg transition-all ${
            minimized 
              ? 'h-12 w-12 rounded-l-full rounded-r-none hover:w-14' 
              : 'h-8 w-6 rounded-none bg-muted/30 hover:bg-muted/50'
          }`}
          aria-label={minimized ? "Show feedback button" : "Hide feedback button"}
        >
          {minimized ? (
            <MessageCircleHeart className="h-4 w-4" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How would you rate this page? Your feedback helps us improve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rating Scale */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Rating (1-10)</label>
              <div className="flex items-center justify-center gap-1.5 px-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className={`
                      flex h-9 w-9 items-center justify-center rounded-lg border-2 
                      transition-all hover:scale-110 font-semibold text-sm
                      ${
                        rating === value
                          ? `${getRatingColor(value)} ${getRatingBgColor(value)}`
                          : hoveredRating && value <= hoveredRating
                          ? `${getRatingColor(value)} ${getRatingBgColor(value)}`
                          : 'border-border hover:border-border/50'
                      }
                    `}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="h-6 flex items-center justify-center">
                {(rating || hoveredRating) && (
                  <p className={`text-center text-sm font-medium ${getRatingColor(rating || hoveredRating || 0)}`}>
                    {getRatingLabel(rating || hoveredRating || 0)}
                  </p>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Comments or Suggestions <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                placeholder="Tell us what you think about this page..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Context Info */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p>
                <strong>Current page:</strong> {history.length > 0 ? history[history.length - 1].title : 'Unknown'}
              </p>
              {history.length > 1 && (
                <p className="mt-1">
                  <strong>Recent path:</strong>{' '}
                  {history
                    .slice(-4)
                    .map((h) => h.title)
                    .join(' → ')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !rating}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Send Feedback'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return createPortal(content, document.body);
};
