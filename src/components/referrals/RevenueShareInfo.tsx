import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Percent, Euro, Target } from "lucide-react";
import { RevenueShare } from "@/hooks/useReferralSystem";
import { formatCurrency } from "@/lib/revenueCalculations";

interface RevenueShareInfoProps {
  shares: RevenueShare[];
  userRole?: string;
}

export function RevenueShareInfo({ shares, userRole }: RevenueShareInfoProps) {
  const activeShares = shares.filter(s => s.is_active);

  if (activeShares.length === 0) {
    return (
      <Card className="glass-card border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Info className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="font-medium">Revenue Share Information</p>
              <p className="text-sm text-muted-foreground mt-1">
                {userRole === 'candidate' 
                  ? 'Earn rewards by referring other members to job opportunities.'
                  : userRole === 'partner'
                  ? 'Earn 10% commission on deals you self-source.'
                  : 'Contact admin to configure your revenue share percentage.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Your Revenue Share
        </CardTitle>
        <CardDescription>
          How you earn from referrals and deals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeShares.map((share) => (
            <div 
              key={share.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                {share.share_type === 'fixed_percentage' ? (
                  <div className="p-2 rounded-lg bg-success/10">
                    <Percent className="h-4 w-4 text-success" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Euro className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium capitalize">
                    {share.applies_to.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {share.effective_from && `Effective from ${new Date(share.effective_from).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {share.share_type === 'fixed_percentage' ? (
                  <Badge className="bg-success/10 text-success border-success/30">
                    {share.share_percentage}%
                  </Badge>
                ) : (
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    {formatCurrency(share.share_fixed_amount || 0)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Min deal value info */}
        {activeShares.some(s => (s.min_deal_value || 0) > 0) && (
          <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 text-sm text-warning">
              <Target className="h-4 w-4" />
              <span>Minimum deal value may apply</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
