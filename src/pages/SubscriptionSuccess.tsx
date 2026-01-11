import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";
import { useSubscription } from "@/hooks/useSubscription";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refetch, loading } = useSubscription();

  useEffect(() => {
    // Refresh subscription status after successful checkout
    if (sessionId) {
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [sessionId, refetch]);

  return (
    <AppLayout>
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card className="border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {loading ? (
                <SectionLoader />
              ) : (
                <CheckCircle className="w-8 h-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              Thank you for subscribing to The Quantum Club. Your subscription is now active.
            </p>

            {loading ? (
              <p className="text-sm text-muted-foreground">
                Activating your subscription...
              </p>
            ) : (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">What's next?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Access premium features</li>
                  <li>✓ Priority matching & support</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Exclusive community access</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/subscription")}>
                View Subscription
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Go to Dashboard
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Session ID: {sessionId}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
