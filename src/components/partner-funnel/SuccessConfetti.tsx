import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle, Calendar, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface SuccessConfettiProps {
  companyName: string;
  sessionId: string;
  onTrackRequest: () => void;
}

export function SuccessConfetti({
  companyName,
  sessionId,
  onTrackRequest,
}: SuccessConfettiProps) {
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fire confetti from both sides
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        setShowContent(true);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#C9A24E", "#F5F4EF", "#0E0E10"], // TQC brand colors
      });

      // Right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#C9A24E", "#F5F4EF", "#0E0E10"],
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!showContent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <p className="text-lg font-medium animate-pulse">Processing your request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Icon */}
      <div className="text-center">
        <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Request Submitted!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Thank you, {companyName}. Your partnership request has been received and assigned to a dedicated strategist.
        </p>
      </div>

      {/* What happens next */}
      <Card className="p-6 glass-effect">
        <h3 className="font-semibold mb-4 text-center">What happens next?</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Response within 19 minutes</p>
              <p className="text-sm text-muted-foreground">
                Our average response time is faster than 99% of recruitment agencies.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Discovery call scheduled</p>
              <p className="text-sm text-muted-foreground">
                Your strategist will reach out to schedule a 15-minute discovery call.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">No-Cure-No-Pay guarantee</p>
              <p className="text-sm text-muted-foreground">
                Remember: You only pay when we successfully place a candidate.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onTrackRequest}
        >
          Track Your Request
        </Button>
        <Button
          className="flex-1"
          onClick={() => navigate("/")}
        >
          Return Home
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Reference ID */}
      <p className="text-center text-xs text-muted-foreground">
        Reference ID: {sessionId.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}
