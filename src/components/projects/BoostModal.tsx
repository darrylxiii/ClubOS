import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Zap, Crown, Check, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "project" | "gig";
  entityId: string;
  entityTitle: string;
}

const BOOST_PACKAGES = [
  {
    id: "basic",
    name: "Visibility Boost",
    icon: TrendingUp,
    duration: 7,
    price: 9.99,
    features: ["Higher in search results", "7 days duration"],
    boostLevel: 1,
  },
  {
    id: "pro",
    name: "Pro Boost",
    icon: Zap,
    duration: 14,
    price: 19.99,
    features: ["Top of search results", "Featured badge", "14 days duration"],
    boostLevel: 2,
    popular: true,
  },
  {
    id: "premium",
    name: "Premium Spotlight",
    icon: Crown,
    duration: 30,
    price: 39.99,
    features: ["Homepage spotlight", "Featured in emails", "Priority support", "30 days duration"],
    boostLevel: 3,
  },
];

export function BoostModal({ open, onOpenChange, entityType, entityId, entityTitle }: BoostModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const boostMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const pkg = BOOST_PACKAGES.find((p) => p.id === packageId);
      if (!pkg) throw new Error("Invalid package");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.duration);

      if (entityType === "project") {
        const { error } = await supabase
          .from("marketplace_projects")
          .update({
            is_featured: true,
            boost_level: pkg.boostLevel,
            boost_expires_at: expiresAt.toISOString(),
          })
          .eq("id", entityId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("freelancer_gigs")
          .update({
            is_featured: true,
            boost_level: pkg.boostLevel,
            boost_expires_at: expiresAt.toISOString(),
          })
          .eq("id", entityId);
        if (error) throw error;
      }

      return pkg;
    },
    onSuccess: (pkg) => {
      toast.success(`${entityType === "project" ? "Project" : "Gig"} boosted!`, {
        description: `Your ${pkg.name} boost is now active for ${pkg.duration} days`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to boost", { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Boost Your Visibility
          </DialogTitle>
          <DialogDescription>
            Get more exposure for "{entityTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 py-4">
          {BOOST_PACKAGES.map((pkg, index) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage === pkg.id;

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : ""
                  } ${pkg.popular ? "border-primary" : ""}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Popular</Badge>
                  )}
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{pkg.name}</h3>
                    <p className="text-2xl font-bold mt-2">€{pkg.price}</p>
                    <p className="text-xs text-muted-foreground">{pkg.duration} days</p>

                    <ul className="mt-4 space-y-1 text-sm text-left">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedPackage || boostMutation.isPending}
            onClick={() => selectedPackage && boostMutation.mutate(selectedPackage)}
          >
            {boostMutation.isPending ? "Processing..." : `Boost for €${BOOST_PACKAGES.find((p) => p.id === selectedPackage)?.price || 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
