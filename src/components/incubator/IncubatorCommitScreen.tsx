import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, CheckCircle2, AlertCircle } from 'lucide-react';
import { REQUIRED_SECTIONS } from '@/data/incubatorScenarios';
import type { IncubatorPlanSection } from '@/types/assessment';

interface IncubatorCommitScreenProps {
  planSections: Partial<IncubatorPlanSection>;
  totalWordCount: number;
  onSubmit: (voiceBlob?: Blob) => void;
  isSubmitting: boolean;
}

export const IncubatorCommitScreen = memo(({
  planSections,
  totalWordCount,
  onSubmit,
  isSubmitting,
}: IncubatorCommitScreenProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const isValid = totalWordCount >= 300 && totalWordCount <= 450;
  const completedSections = REQUIRED_SECTIONS.filter(
    s => (planSections[s.id as keyof IncubatorPlanSection] || '').trim().length > 0
  ).length;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setVoiceBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = () => {
    onSubmit(voiceBlob || undefined);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/10">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Final Review</CardTitle>
          <CardDescription>
            Review your one-pager and optionally add a 30-second voice rationale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Plan Summary</h3>
              <Badge variant={isValid ? 'default' : 'destructive'}>
                {totalWordCount} / 450 words
              </Badge>
            </div>

            {/* Section Checklist */}
            <div className="space-y-2">
              {REQUIRED_SECTIONS.map((section) => {
                const content = planSections[section.id as keyof IncubatorPlanSection] || '';
                const hasContent = content.trim().length > 0;
                const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

                return (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {hasContent ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{section.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {wordCount} / {section.wordCap}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {!isValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your plan must be between 300-450 words total to submit.
                  {totalWordCount < 300 && ` Add ${300 - totalWordCount} more words.`}
                  {totalWordCount > 450 && ` Remove ${totalWordCount - 450} words.`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Voice Rationale (Optional) */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-1">Voice Rationale (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Record a 30-second explanation of your strategy. This helps us understand your thinking process.
              </p>
            </div>

            {!voiceBlob ? (
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? 'secondary' : 'outline'}
                className="w-full"
              >
                <Mic className="mr-2 h-4 w-4" />
                {isRecording ? 'Stop Recording' : 'Record Voice Rationale'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex-1">
                  <CheckCircle2 className="mr-2 h-3 w-3" />
                  Recording saved
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoiceBlob(null)}
                >
                  Re-record
                </Button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {completedSections}/{REQUIRED_SECTIONS.length} sections completed •{' '}
            {totalWordCount} words total
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

IncubatorCommitScreen.displayName = 'IncubatorCommitScreen';
