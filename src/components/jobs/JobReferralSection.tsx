import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { useAuth } from "@/contexts/AuthContext";
import { useJobReferralPotential } from "@/hooks/useReferralPipelineMetrics";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface JobReferralSectionProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  salaryMin?: number;
  salaryMax?: number;
  referralBonusPercentage?: number;
  showReferralBonus?: boolean;
}

export function JobReferralSection({
  jobId,
  jobTitle,
  companyName,
  salaryMin,
  salaryMax,
  referralBonusPercentage = 10,
  showReferralBonus = true,
}: JobReferralSectionProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const { data: referralPotential } = useJobReferralPotential(jobId);

  if (!showReferralBonus) return null;

  const potentialEarnings = referralPotential?.potentialEarnings || 0;

  const referralLink = user 
    ? `${window.location.origin}/jobs/${jobId}?ref=${user.id}`
    : `${window.location.origin}/jobs/${jobId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t("referral_link_copied", "Referral link copied!"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("failed_to_copy_link", "Failed to copy link"));
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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Gift className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("referral_opportunity", "Referral Opportunity")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Earn money by referring qualified candidates
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Potential Reward */}
          {potentialEarnings > 0 && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("potential_referral_reward", "Potential Referral Reward")}</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(potentialEarnings)}</p>
            </div>
          )}

          {/* Share Section */}
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("share_your_referral_link", "Share your referral link")}</p>
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
            <p className="font-medium text-foreground">{t("how_it_works", "How it works:")}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t("share_your_unique_referral", "Share your unique referral link with potential candidates")}</li>
              <li>{t("when_they_apply_and", "When they apply and get hired, you earn your share")}</li>
              <li>{t("track_your_referrals_in", "Track your referrals in real-time from your dashboard")}</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
