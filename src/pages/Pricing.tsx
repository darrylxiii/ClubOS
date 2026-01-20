import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { migrateToast as toast } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";

const PARTNER_PLANS = [
  {
    name: "Scout",
    tier: "scout",
    price: 499,
    priceId: "price_1STWxH12gqOdGd98n2LoXQBO",
    description: "Perfect for growing companies",
    features: [
      "5 active job posts",
      "Basic analytics",
      "Standard matching",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Hunter",
    tier: "hunter",
    price: 1499,
    priceId: "price_1STWxQ12gqOdGd982Lu9FF96",
    description: "For scaling recruitment",
    features: [
      "Unlimited job posts",
      "Advanced analytics",
      "Priority matching",
      "Dossier sharing",
      "Dedicated support",
    ],
    popular: true,
  },
  {
    name: "Elite",
    tier: "elite",
    price: 4999,
    priceId: "price_1STWxS12gqOdGd98neTFI2ez",
    description: "Enterprise solution",
    features: [
      "Unlimited job posts",
      "White-glove service",
      "Dedicated strategist",
      "API access",
      "Custom integrations",
      "24/7 priority support",
    ],
    popular: false,
  },
];

const CANDIDATE_PLANS = [
  {
    name: "Pro",
    tier: "pro",
    price: 29,
    priceId: "price_1STWxT12gqOdGd98LBbIge49",
    description: "For professionals",
    features: [
      "Priority matching",
      "Interview prep AI",
      "Salary insights",
      "Unlimited applications",
      "Email support",
    ],
    popular: true,
  },
  {
    name: "Executive",
    tier: "executive",
    price: 99,
    priceId: "price_1STWxU12gqOdGd98nW2mKyJB",
    description: "Premium career growth",
    features: [
      "Executive coach access",
      "Custom career plans",
      "Network introductions",
      "Priority support",
      "All Pro features",
    ],
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userType, setUserType] = useState<"partner" | "candidate">("partner");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe to a plan",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoadingPlan(priceId);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = userType === "partner" ? PARTNER_PLANS : CANDIDATE_PLANS;

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan to accelerate your recruitment or career growth
          </p>
        </div>

        <Tabs value={userType} onValueChange={(v) => setUserType(v as "partner" | "candidate")} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="partner">For Companies</TabsTrigger>
            <TabsTrigger value="candidate">For Candidates</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative p-6 ${
                plan.popular
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold">€{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.priceId, plan.name)}
                disabled={loadingPlan === plan.priceId}
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                aria-busy={loadingPlan === plan.priceId}
              >
                {loadingPlan === plan.priceId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="sr-only">Processing subscription</span>
                    Subscribe Now
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
          <p className="mt-2">
            Need a custom plan?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/contact")}>
              Contact us
            </Button>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
