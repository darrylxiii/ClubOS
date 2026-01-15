import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins, Zap, TrendingUp, Gift, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CONNECTS_PACKAGES = [
  { id: "starter", connects: 20, price: 4.99, popular: false },
  { id: "standard", connects: 50, price: 9.99, popular: true },
  { id: "premium", connects: 100, price: 17.99, popular: false },
  { id: "enterprise", connects: 250, price: 39.99, popular: false },
];

const FREE_MONTHLY_CONNECTS = 10;

export function ConnectsSystem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["freelance-profile-connects", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("freelance_profiles")
        .select("connects_balance, connects_last_refreshed_at")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
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

  const connectsBalance = profile?.connects_balance || 0;
  const lastRefreshed = profile?.connects_last_refreshed_at 
    ? new Date(profile.connects_last_refreshed_at) 
    : null;
  
  // Calculate days until next refresh
  const nextRefreshDate = lastRefreshed 
    ? new Date(lastRefreshed.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date();
  const daysUntilRefresh = Math.max(0, Math.ceil((nextRefreshDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Your Connects Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-primary">{connectsBalance}</div>
              <p className="text-sm text-muted-foreground">Available connects</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2">
                <Gift className="h-3 w-3 mr-1" />
                {FREE_MONTHLY_CONNECTS} free/month
              </Badge>
              <p className="text-xs text-muted-foreground">
                Refreshes in {daysUntilRefresh} days
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monthly free connects</span>
              <span className="text-muted-foreground">{daysUntilRefresh} days until refresh</span>
            </div>
            <Progress value={((30 - daysUntilRefresh) / 30) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* How Connects Work */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">How Connects Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Small projects (&lt;€500)</p>
                <p className="text-muted-foreground">2 connects per proposal</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">4</span>
              </div>
              <div>
                <p className="font-medium">Medium projects (€500-€5000)</p>
                <p className="text-muted-foreground">4 connects per proposal</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">6</span>
              </div>
              <div>
                <p className="font-medium">Large projects (€5000+)</p>
                <p className="text-muted-foreground">6 connects per proposal</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-3 w-3 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Boosted proposals</p>
                <p className="text-muted-foreground">+50% connects for top placement</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Packages */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Buy More Connects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {CONNECTS_PACKAGES.map((pkg) => (
              <motion.div
                key={pkg.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasingPackage === pkg.id}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    pkg.popular 
                      ? "border-primary bg-primary/5 hover:bg-primary/10" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{pkg.connects}</span>
                    {pkg.popular && (
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">connects</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">€{pkg.price.toFixed(2)}</span>
                    {purchasingPackage === pkg.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
