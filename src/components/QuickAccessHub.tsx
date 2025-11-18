import { useState } from "react";
import { Settings, Headphones, MessageCircleHeart, Languages, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigationHistory } from "@/contexts/NavigationHistoryContext";
import { useLocation } from "react-router-dom";

export const QuickAccessHub = () => {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { history } = useNavigationHistory();
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  const handleFeedbackSubmit = async () => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to submit feedback.',
        variant: 'destructive',
      });
      return;
    }

    if (!rating) {
      toast({
        title: 'Rating required',
        description: 'Please select a rating from 1 to 10.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
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
        rating,
        comment: comment || null,
        page_path: location.pathname,
        page_title: pageTitle,
        email: profile?.email || '',
        role: userRole?.role || null,
      }]);

      if (error) throw error;

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for helping us improve!',
      });

      setRating(null);
      setComment('');
      setFeedbackOpen(false);
      setOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerTranslationDebugger = () => {
    localStorage.setItem('show-translation-debugger', 'true');
    window.dispatchEvent(new Event('show-translation-debugger'));
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            title="Quick Access"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="end" 
          side="top" 
          className="w-64 p-2 z-[60]"
        >
          <div className="space-y-1">
            {/* Knowledge Base */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                navigate('/help');
                setOpen(false);
              }}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-medium">Knowledge Base</p>
                <p className="text-xs text-muted-foreground">Articles & guides</p>
              </div>
            </Button>

            <Separator />

            {/* Create Support Ticket */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                navigate('/support/tickets/new');
                setOpen(false);
              }}
            >
              <Headphones className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-medium">Create Support Ticket</p>
                <p className="text-xs text-muted-foreground">Get direct help</p>
              </div>
            </Button>

            <Separator />

            {/* Quick Feedback */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                if (!user) {
                  toast({
                    title: 'Sign in required',
                    description: 'Please sign in to leave feedback.',
                    variant: 'destructive',
                  });
                  return;
                }
                setFeedbackOpen(true);
                setOpen(false);
              }}
            >
              <MessageCircleHeart className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-medium">Quick Feedback</p>
                <p className="text-xs text-muted-foreground">
                  Share your thoughts
                </p>
              </div>
            </Button>

            {/* Translation Debug (Dev Only) */}
            {isDev && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={triggerTranslationDebugger}
                >
                  <Languages className="h-5 w-5 shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">Translation Debug</p>
                    <p className="text-xs text-muted-foreground">Open debugger</p>
                  </div>
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Feedback</DialogTitle>
            <DialogDescription>
              How would you rate this page? Your feedback helps us improve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rating Scale */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rating (1-10)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const getColorClass = () => {
                    if (rating === num) return "";
                    if (num <= 3) return "border-red-500/50 text-red-500 hover:bg-red-500/10";
                    if (num <= 5) return "border-orange-500/50 text-orange-500 hover:bg-orange-500/10";
                    if (num <= 7) return "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10";
                    return "border-green-500/50 text-green-500 hover:bg-green-500/10";
                  };
                  
                  return (
                    <Button
                      key={num}
                      variant={rating === num ? "default" : "outline"}
                      size="sm"
                      className={`h-10 p-0 ${getColorClass()}`}
                      onClick={() => setRating(num)}
                    >
                      {num}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Additional Comments (Optional)
              </label>
              <Textarea
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={!rating || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
