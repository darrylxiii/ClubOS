import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

interface CourseReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  onReviewSubmitted?: () => void;
}

export const CourseReviewForm = memo<CourseReviewFormProps>(({
  open,
  onOpenChange,
  courseId,
  courseName,
  onReviewSubmitted,
}) => {
  const { t } = useTranslation('common');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      notify.warning(t('academy.pleaseSelectStarRating'));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('course_reviews' as any)
        .insert({
          course_id: courseId,
          user_id: user.id,
          rating,
          review_text: reviewText || null,
          would_recommend: wouldRecommend,
          is_verified_completion: true,
        });

      if (error) throw error;

      notify.success(t('academy.thankYouForFeedback'));

      onReviewSubmitted?.();
      onOpenChange(false);
      
      // Reset form
      setRating(0);
      setReviewText('');
      setWouldRecommend(true);
    } catch (error) {
      console.error('Error submitting review:', error);
      notify.error(t('academy.failedToSubmitReview'), { description: t('academy.mayHaveAlreadyReviewed') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('academy.reviewCourseName', { name: courseName })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t('academy.yourRating')}</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">{t('academy.yourReviewOptional')}</Label>
            <Textarea
              id="review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t('academy.shareYourThoughtsAboutThisCourse')}
              className="min-h-[120px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reviewText.length}/500 {t('academy.characters')}
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <Label htmlFor="recommend" className="cursor-pointer">{t('academy.wouldYouRecommendThisCourse')}</Label>
            <Switch
              id="recommend"
              checked={wouldRecommend}
              onCheckedChange={setWouldRecommend}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('academy.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="flex-1">
              {submitting ? t('academy.submitting') : t('academy.submitReview')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CourseReviewForm.displayName = 'CourseReviewForm';
