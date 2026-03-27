import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";
import { useSubscription } from "@/hooks/useSubscription";

export default function SubscriptionSuccess() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refetch, loading } = useSubscription();

  useEffect(() => {
    if (sessionId) {
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [sessionId, refetch]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
      <Card className="border-primary/20 max-w-2xl mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {loading ? (
              <SectionLoader />
            ) : (
              <CheckCircle className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">{t('subscriptionSuccess.text3')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">{t('subscriptionSuccess.desc')}</p>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t('subscriptionSuccess.desc2')}</p>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">{t('subscriptionSuccess.text4')}</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{"✓ Access premium features"}</li>
                <li>{"✓ Priority matching & support"}</li>
                <li>{"✓ Advanced analytics"}</li>
                <li>{"✓ Exclusive community access"}</li>
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
  );
}
