import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLoader } from "@/components/ui/unified-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Zap, Crown, Rocket, Check, History, Gift } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";

const CONNECTS_PACKAGES = [
  { id: "starter", connects: 20, price: 4.99, popular: false, icon: Coins },
  { id: "standard", connects: 50, price: 9.99, popular: true, icon: Zap },
  { id: "premium", connects: 100, price: 17.99, popular: false, icon: Crown },
  { id: "enterprise", connects: 250, price: 39.99, popular: false, icon: Rocket },
];

const SUBSCRIPTION_TIERS = [
  { id: "basic", name: "Basic", monthlyConnects: 30, price: 7.99, features: ["30 connects/month", "Email support", "Basic analytics"] },
  { id: "pro", name: "Pro", monthlyConnects: 80, price: 14.99, features: ["80 connects/month", "Priority support", "Advanced analytics", "Early job alerts"], popular: true },
  { id: "enterprise", name: "Enterprise", monthlyConnects: 200, price: 29.99, features: ["200 connects/month", "Dedicated support", "Full analytics", "Featured profile boost", "Exclusive projects"] },
];

export default function ConnectsStorePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["freelance-profile-connects", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("freelance_profiles")
        .select("connects_balance, connects_last_refreshed_at")
        .eq("id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: transactions } = useQuery({
    queryKey: ["connects-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("connects_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ["connects-subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("connects_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      if (error && error.code !== "PGRST116") return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const { data, error } = await supabase.functions.invoke("purchase-connects", {
        body: { packageId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
      setPurchasingPackage(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to start purchase", { description: error.message });
      setPurchasingPackage(null);
    },
  });

  const handlePurchase = (packageId: string) => {
    setPurchasingPackage(packageId);
    purchaseMutation.mutate(packageId);
  };

  if (profileLoading) {
    return <SectionLoader text="Loading Store..." className="min-h-[60vh]" />;
  }

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connects Store</h1>
          <p className="text-muted-foreground">Purchase connects to submit proposals</p>
        </div>
        <Card className="px-6 py-3 bg-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">{profile?.connects_balance ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packages">One-Time Packages</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONNECTS_PACKAGES.map((pkg, index) => {
              const Icon = pkg.icon;
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`relative h-full ${pkg.popular ? "border-primary shadow-lg" : ""}`}>
                    {pkg.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Most Popular</Badge>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="capitalize">{pkg.id}</CardTitle>
                      <CardDescription>{pkg.connects} Connects</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div>
                        <span className="text-3xl font-bold">€{pkg.price}</span>
                        <span className="text-muted-foreground text-sm ml-1">
                          (€{(pkg.price / pkg.connects).toFixed(2)}/connect)
                        </span>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchasingPackage === pkg.id}
                      >
                        {purchasingPackage === pkg.id ? "Processing..." : "Buy Now"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          {subscription ? (
            <Card className="mb-6 border-primary bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle>Active Subscription: {subscription.tier}</CardTitle>
                </div>
                <CardDescription>
                  {subscription.monthly_connects} connects per month • Renews {subscription.current_period_end ? format(new Date(subscription.current_period_end), "MMM d, yyyy") : "monthly"}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <div className="grid md:grid-cols-3 gap-6">
            {SUBSCRIPTION_TIERS.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full flex flex-col ${tier.popular ? "border-primary shadow-lg" : ""}`}>
                  {tier.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Recommended</Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle>{tier.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">€{tier.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      disabled={subscription?.tier === tier.id}
                    >
                      {subscription?.tier === tier.id ? "Current Plan" : "Subscribe"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {tx.amount > 0 ? (
                          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Coins className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{tx.description || tx.transaction_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM d, yyyy • HH:mm")}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
