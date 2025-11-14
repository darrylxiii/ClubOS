import { memo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Share2, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CertificatePreview } from './CertificatePreview';

interface CourseCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  certificateId?: string;
  recommendedCourses?: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
  }>;
  onDownloadCertificate?: () => void;
}

export const CourseCompletionModal = memo<CourseCompletionModalProps>(({
  open,
  onOpenChange,
  courseName,
  certificateId,
  recommendedCourses = [],
  onDownloadCertificate,
}) => {
  useEffect(() => {
    if (open) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center">
            🎉 Congratulations!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-center text-lg text-muted-foreground">
            You've successfully completed <span className="font-semibold text-foreground">{courseName}</span>
          </p>

          {certificateId && (
            <div className="space-y-3">
              <CertificatePreview certificateId={certificateId} />
              <div className="flex gap-2">
                <Button onClick={onDownloadCertificate} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share on LinkedIn
                </Button>
              </div>
            </div>
          )}

          {recommendedCourses.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                What's Next?
              </h3>
              <div className="grid gap-3">
                {recommendedCourses.slice(0, 3).map((course) => (
                  <Card key={course.id} className="p-3 hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      {course.thumbnail_url && (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{course.title}</p>
                        <Button variant="link" className="h-auto p-0 text-xs">
                          Start Learning →
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Continue Exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CourseCompletionModal.displayName = 'CourseCompletionModal';
