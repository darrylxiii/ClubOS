import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { IncubatorFrameAnswers } from '@/types/assessment';

interface IncubatorFrameScreenProps {
  onComplete: (answers: IncubatorFrameAnswers) => void;
}

export const IncubatorFrameScreen = memo(({ onComplete }: IncubatorFrameScreenProps) => {
  const [problem, setProblem] = useState('');
  const [customer, setCustomer] = useState('');
  const [successMetric, setSuccessMetric] = useState('');

  const problemWords = problem.trim().split(/\s+/).filter(Boolean).length;
  const customerWords = customer.trim().split(/\s+/).filter(Boolean).length;
  const metricWords = successMetric.trim().split(/\s+/).filter(Boolean).length;

  const isValid = problem.length > 20 && customer.length > 15 && successMetric.length > 15;

  const handleSubmit = () => {
    if (isValid) {
      onComplete({
        problem: problem.trim(),
        customer: customer.trim(),
        successMetric: successMetric.trim(),
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/10">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Frame Your Strategy</CardTitle>
          <CardDescription>
            Lock in your north star. These answers will guide your plan and help us measure consistency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Answer each question in 1-2 sentences. Be specific and concise.
            </AlertDescription>
          </Alert>

          {/* Problem */}
          <div className="space-y-2">
            <Label htmlFor="problem">
              What urgent problem does this solve, and why now?
              <span className="ml-2 text-xs text-muted-foreground">
                ({problemWords} words, ~25-30 recommended)
              </span>
            </Label>
            <Textarea
              id="problem"
              placeholder="e.g., Restaurant owners lose 10+ hours/week on manual bookkeeping, leading to cash flow blindness and missed tax deductions. With rising costs, they need real-time financial visibility."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label htmlFor="customer">
              Who specifically feels this pain most acutely?
              <span className="ml-2 text-xs text-muted-foreground">
                ({customerWords} words, ~20-25 recommended)
              </span>
            </Label>
            <Textarea
              id="customer"
              placeholder="e.g., Independent restaurant owners with 1-3 locations, $1-5M annual revenue, no dedicated CFO, using QuickBooks or spreadsheets."
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              rows={2}
              maxLength={250}
            />
          </div>

          {/* Success Metric */}
          <div className="space-y-2">
            <Label htmlFor="metric">
              What single metric proves this is working?
              <span className="ml-2 text-xs text-muted-foreground">
                ({metricWords} words, ~15-20 recommended)
              </span>
            </Label>
            <Textarea
              id="metric"
              placeholder="e.g., Users save 8+ hours per week on bookkeeping within first 30 days, measured by time-tracking surveys and transaction volume."
              value={successMetric}
              onChange={(e) => setSuccessMetric(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!isValid}
            className="w-full"
            size="lg"
          >
            Lock In Framework & Continue
          </Button>

          {!isValid && (
            <p className="text-sm text-muted-foreground text-center">
              Fill out all fields to continue
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

IncubatorFrameScreen.displayName = 'IncubatorFrameScreen';
