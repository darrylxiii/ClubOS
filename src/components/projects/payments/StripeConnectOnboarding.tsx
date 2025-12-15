import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CreditCard, CheckCircle2, AlertCircle, ExternalLink,
  Loader2, Shield, DollarSign, RefreshCw, Wallet
} from "lucide-react";

interface StripeConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboarded: boolean;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  balance?: {
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
  };
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export function StripeConnectOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check for return from Stripe
  const stripeOnboarded = searchParams.get("stripe_onboarded");
  const stripeRefresh = searchParams.get("stripe_refresh");

  // Verify Stripe Connect status
  const { data: connectStatus, isLoading, refetch } = useQuery<StripeConnectStatus>({
    queryKey: ["stripe-connect-status", user?.id],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("verify-stripe-connect-status", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!user,
  });

  // Start onboarding mutation
  const startOnboardingMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("setup-freelancer-stripe-connect", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      } else if (data.onboarded) {
        toast.success("Payment account already set up!");
        refetch();
      }
    },
    onError: (error) => {
      toast.error(`Failed to start onboarding: ${error.message}`);
    },
  });

  // Handle return from Stripe
  useEffect(() => {
    if (stripeOnboarded === "true") {
      toast.success("Payment setup completed!");
      refetch();
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (stripeRefresh === "true") {
      toast.info("Please complete your payment setup");
      startOnboardingMutation.mutate();
    }
  }, [stripeOnboarded, stripeRefresh]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Calculate onboarding progress
  const getProgress = () => {
    if (!connectStatus?.hasAccount) return 0;
    if (!connectStatus?.detailsSubmitted) return 25;
    if (!connectStatus?.chargesEnabled) return 50;
    if (!connectStatus?.payoutsEnabled) return 75;
    return 100;
  };

  const progress = getProgress();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Payment Setup</CardTitle>
          </div>
          {connectStatus?.onboarded && (
            <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
        <CardDescription>
          Set up your payment account to receive earnings from projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress indicator */}
        {connectStatus?.hasAccount && !connectStatus?.onboarded && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Setup Progress</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Status States */}
        {!connectStatus?.hasAccount ? (
          // No account yet
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Payments</AlertTitle>
              <AlertDescription>
                We use Stripe Connect to securely process payments. Your earnings 
                are deposited directly to your bank account.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Secure</p>
                <p className="text-xs text-muted-foreground">Bank-level security</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Fast Payouts</p>
                <p className="text-xs text-muted-foreground">Direct to your bank</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Low Fees</p>
                <p className="text-xs text-muted-foreground">Competitive rates</p>
              </div>
            </div>

            <Button
              onClick={() => startOnboardingMutation.mutate()}
              disabled={startOnboardingMutation.isPending || isRedirecting}
              className="w-full gap-2"
            >
              {startOnboardingMutation.isPending || isRedirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Set Up Payment Account
                </>
              )}
            </Button>
          </div>
        ) : connectStatus?.onboarded ? (
          // Fully onboarded
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available Balance */}
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-100">
                    Available Balance
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  €{connectStatus.balance?.available?.[0]?.amount.toLocaleString() || "0.00"}
                </p>
              </div>

              {/* Pending Balance */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Pending</span>
                </div>
                <p className="text-2xl font-bold">
                  €{connectStatus.balance?.pending?.[0]?.amount.toLocaleString() || "0.00"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Connected Account</p>
                <p className="text-sm text-muted-foreground">
                  {connectStatus.accountId?.slice(0, 12)}...
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://dashboard.stripe.com/express", "_blank")}
                  className="gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Incomplete onboarding
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Complete Your Setup</AlertTitle>
              <AlertDescription>
                Your payment account setup is incomplete. Complete the remaining 
                steps to start receiving payments.
              </AlertDescription>
            </Alert>

            {/* Requirements */}
            {connectStatus?.requirements?.currently_due && 
             connectStatus.requirements.currently_due.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Required Information:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {connectStatus.requirements.currently_due.slice(0, 5).map((req, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-destructive" />
                      {req.replace(/_/g, " ").replace(/\./g, " > ")}
                    </li>
                  ))}
                  {connectStatus.requirements.currently_due.length > 5 && (
                    <li className="text-muted-foreground">
                      +{connectStatus.requirements.currently_due.length - 5} more items
                    </li>
                  )}
                </ul>
              </div>
            )}

            <Button
              onClick={() => startOnboardingMutation.mutate()}
              disabled={startOnboardingMutation.isPending || isRedirecting}
              className="w-full gap-2"
            >
              {startOnboardingMutation.isPending || isRedirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Continue Setup
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
