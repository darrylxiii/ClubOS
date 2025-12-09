import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Info } from "lucide-react";
import { useCommissionTiers, CommissionTier } from "@/hooks/useCommissionTiers";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TierConfig {
  min_revenue: number;
  max_revenue: number | null;
  commission_rate: number;
}

interface CommissionTierSelectorProps {
  commissionStructure: string;
  basePercentage: number;
  onBasePercentageChange: (value: number) => void;
  customTiers: TierConfig[];
  onCustomTiersChange: (tiers: TierConfig[]) => void;
  useCompanyDefaults: boolean;
  onUseCompanyDefaultsChange: (value: boolean) => void;
  fixedAmount?: number;
  onFixedAmountChange?: (value: number) => void;
}

export function CommissionTierSelector({
  commissionStructure,
  basePercentage,
  onBasePercentageChange,
  customTiers,
  onCustomTiersChange,
  useCompanyDefaults,
  onUseCompanyDefaultsChange,
  fixedAmount = 0,
  onFixedAmountChange,
}: CommissionTierSelectorProps) {
  const { data: companyTiers } = useCommissionTiers();

  const addTier = () => {
    const lastTier = customTiers[customTiers.length - 1];
    const newMinRevenue = lastTier ? (lastTier.max_revenue || lastTier.min_revenue + 50000) : 0;
    onCustomTiersChange([
      ...customTiers,
      {
        min_revenue: newMinRevenue,
        max_revenue: newMinRevenue + 50000,
        commission_rate: 5,
      },
    ]);
  };

  const updateTier = (index: number, updates: Partial<TierConfig>) => {
    const newTiers = [...customTiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    onCustomTiersChange(newTiers);
  };

  const removeTier = (index: number) => {
    onCustomTiersChange(customTiers.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "∞";
    return `€${value.toLocaleString()}`;
  };

  // Percentage structure - simple percentage input
  if (commissionStructure === 'percentage') {
    return (
      <div className="space-y-2">
        <Label>Commission Percentage (%)</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          max="100"
          value={basePercentage}
          onChange={(e) => onBasePercentageChange(parseFloat(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground">
          Employee earns {basePercentage}% of placement revenue
        </p>
      </div>
    );
  }

  // Fixed structure - simple fixed amount input
  if (commissionStructure === 'fixed') {
    return (
      <div className="space-y-2">
        <Label>Fixed Commission Amount (€)</Label>
        <Input
          type="number"
          min="0"
          value={fixedAmount}
          onChange={(e) => onFixedAmountChange?.(parseFloat(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground">
          Employee earns €{fixedAmount.toLocaleString()} per placement
        </p>
      </div>
    );
  }

  // Tiered structure - show tier configuration
  if (commissionStructure === 'tiered') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label>Commission Tiers</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Tiered commission pays different rates based on cumulative revenue generated.
                    Higher tiers unlock as the employee generates more revenue.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-defaults" className="text-sm">Use Company Defaults</Label>
            <Switch
              id="use-defaults"
              checked={useCompanyDefaults}
              onCheckedChange={onUseCompanyDefaultsChange}
            />
          </div>
        </div>

        {useCompanyDefaults ? (
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Using company-wide commission tiers:
              </p>
              {companyTiers && companyTiers.length > 0 ? (
                companyTiers.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">
                      {formatCurrency(tier.min_revenue)} - {formatCurrency(tier.max_revenue)}
                    </span>
                    <Badge variant="secondary">{tier.percentage}%</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No company tiers configured. Please set up tiers in Commission Settings.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {customTiers.map((tier, index) => (
              <Card key={index} className="bg-muted/20">
                <CardContent className="pt-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Min Revenue (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={tier.min_revenue}
                        onChange={(e) => updateTier(index, { min_revenue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Max Revenue (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={tier.max_revenue || ''}
                        placeholder="Unlimited"
                        onChange={(e) => updateTier(index, { max_revenue: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={tier.commission_rate}
                        onChange={(e) => updateTier(index, { commission_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeTier(index)}
                      disabled={customTiers.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={addTier}
            >
              <Plus className="h-4 w-4" />
              Add Tier
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Hybrid structure - base percentage + bonus tiers
  if (commissionStructure === 'hybrid') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Base Commission Percentage (%)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={basePercentage}
            onChange={(e) => onBasePercentageChange(parseFloat(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Base rate applied to all placements, plus bonus tiers below
          </p>
        </div>

        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Label>Bonus Tiers</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Bonus tiers are added on top of the base commission when revenue thresholds are met.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="use-defaults-hybrid" className="text-sm">Use Company Defaults</Label>
              <Switch
                id="use-defaults-hybrid"
                checked={useCompanyDefaults}
                onCheckedChange={onUseCompanyDefaultsChange}
              />
            </div>
          </div>

          {useCompanyDefaults ? (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Using company-wide bonus tiers:
                </p>
                {companyTiers && companyTiers.length > 0 ? (
                  companyTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm">
                        {formatCurrency(tier.min_revenue)} - {formatCurrency(tier.max_revenue)}
                      </span>
                      <Badge variant="secondary">+{tier.percentage}% bonus</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No company tiers configured. Base commission only.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {customTiers.map((tier, index) => (
                <Card key={index} className="bg-muted/20">
                  <CardContent className="pt-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Min Revenue (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.min_revenue}
                          onChange={(e) => updateTier(index, { min_revenue: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Max Revenue (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.max_revenue || ''}
                          placeholder="Unlimited"
                          onChange={(e) => updateTier(index, { max_revenue: e.target.value ? parseFloat(e.target.value) : null })}
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs">Bonus (%)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={tier.commission_rate}
                          onChange={(e) => updateTier(index, { commission_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeTier(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={addTier}
              >
                <Plus className="h-4 w-4" />
                Add Bonus Tier
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
