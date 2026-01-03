import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Calendar, Check, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const PLAN_DETAILS = {
  "prod_TQNiHW8QXzqiif": { name: "Scout", color: "bg-blue-500" },
  "prod_TQNiiRIjyWTecm": { name: "Hunter", color: "bg-purple-500" },
  "prod_TQNieRy3UvxCy8": { name: "Elite", color: "bg-amber-500" },
  "prod_TQNikL4Cq1rxgV": { name: "Pro", color: "bg-green-500" },
  "prod_TQNiPS0MHyjL3n": { name: "Executive", color: "bg-indigo-500" },
};

export default function Subscription() {
  const navigate = useNavigate();
  const { subscription, loading, refetch } = useSubscription();
  const [managingPortal, setManagingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setManagingPortal(true);

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      notify.error("Failed to open subscription management portal");
    } finally {
      setManagingPortal(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>

        {!subscription?.subscribed ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                No Active Subscription
              </CardTitle>
              <CardDescription>
                You don't have an active subscription. Subscribe to unlock premium features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/pricing")}>View Plans</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {subscription.subscriptions.map((sub, idx) => {
              const planDetails = PLAN_DETAILS[sub.product_id as keyof typeof PLAN_DETAILS];
              const periodEnd = new Date(sub.current_period_end);

              return (
                <Card key={sub.subscription_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${planDetails?.color || "bg-gray-500"}`} />
                        <CardTitle>{planDetails?.name || "Subscription"} Plan</CardTitle>
                      </div>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Billing Period</p>
                          <p className="text-sm text-muted-foreground">
                            Renews {formatDistanceToNow(periodEnd, { addSuffix: true })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {periodEnd.toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Status</p>
                          <p className="text-sm text-muted-foreground">
                            {sub.cancel_at_period_end
                              ? "Cancels at period end"
                              : "Active - Auto-renewing"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {sub.cancel_at_period_end && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Your subscription will be canceled on {periodEnd.toLocaleDateString()}.
                          You'll retain access until then.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Manage Subscription
                </CardTitle>
                <CardDescription>
                  Update payment method, cancel subscription, or view invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleManageSubscription}
                  disabled={managingPortal}
                  className="w-full sm:w-auto"
                >
                  {managingPortal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    "Manage in Stripe Portal"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={refetch}
                  className="w-full sm:w-auto ml-0 sm:ml-2"
                >
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
