import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  TrendingUp, 
  Users,
  Info
} from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { useAuth } from "@/contexts/AuthContext";
import { useJobReferralPotential } from "@/hooks/useReferralPipelineMetrics";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobReferralSectionProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  salaryMin?: number;
  salaryMax?: number;
  feePercentage?: number;
  referralBonusPercentage?: number;
  showReferralBonus?: boolean;
}

export function JobReferralSection({
  jobId,
  jobTitle,
  companyName,
  salaryMin,
  salaryMax,
  feePercentage = 20,
  referralBonusPercentage = 10,
  showReferralBonus = true,
}: JobReferralSectionProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const { data: referralPotential } = useJobReferralPotential(jobId);

  if (!showReferralBonus) return null;

  // Calculate earnings breakdown
  const avgSalary = referralPotential?.salaryUsed || salaryMax || salaryMin || 75000;
  const estimatedFee = referralPotential?.estimatedFee || avgSalary * (feePercentage / 100);
  const potentialEarnings = referralPotential?.potentialEarnings || estimatedFee * (referralBonusPercentage / 100);

  const referralLink = user 
    ? `${window.location.origin}/jobs/${jobId}?ref=${user.id}`
    : `${window.location.origin}/jobs/${jobId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${jobTitle} at ${companyName}`,
          text: `Check out this opportunity: ${jobTitle} at ${companyName}. Use my referral link for priority consideration!`,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-2 border-success/20 bg-gradient-to-br from-success/5 via-transparent to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Gift className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-lg">Referral Opportunity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Earn money by referring qualified candidates
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <TrendingUp className="h-3 w-3 mr-1" />
              {referralBonusPercentage}% Share
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Earnings Breakdown */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-card/50 border">
            <TooltipProvider>
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        Salary Base
                        <Info className="h-3 w-3" />
                      </p>
                      <p className="text-lg font-bold">{formatCurrency(avgSalary)}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expected salary for this position</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="text-center border-x border-border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        Placement Fee
                        <Info className="h-3 w-3" />
                      </p>
                      <p className="text-lg font-bold">{formatCurrency(estimatedFee)}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{feePercentage}% of salary as placement fee</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        Your Earnings
                        <Info className="h-3 w-3" />
                      </p>
                      <p className="text-lg font-bold text-success">{formatCurrency(potentialEarnings)}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{referralBonusPercentage}% of placement fee</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Share Section */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Share your referral link</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={referralLink}
                className="font-mono text-sm bg-muted/50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={handleShare}
                className="shrink-0 gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* How it works */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium text-foreground">How it works:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Share your unique referral link with potential candidates</li>
              <li>When they apply and get hired, you earn your share</li>
              <li>Track your referrals in real-time from your dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
