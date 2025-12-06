import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Info, Percent, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FeeType } from "@/types/company";

export interface FeeConfiguration {
  feeType: FeeType;
  feePercentage: number | null;
  feeFixed: number | null;
  useOverride: boolean;
}

interface CompanyFeeData {
  id: string;
  name: string;
  fee_type: FeeType;
  placement_fee_percentage: number | null;
  placement_fee_fixed: number | null;
}

export interface JobFeeConfigurationProps {
  companyId: string;
  feeConfig: FeeConfiguration;
  onFeeConfigChange: (config: FeeConfiguration) => void;
  disabled?: boolean;
  salaryMax?: number | null;
}

export function JobFeeConfiguration({
  companyId,
  feeConfig,
  onFeeConfigChange,
  disabled = false,
  salaryMax,
}: JobFeeConfigurationProps) {
  const [companyData, setCompanyData] = useState<CompanyFeeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyFeeConfig = async () => {
      if (!companyId) {
        setCompanyData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, fee_type, placement_fee_percentage, placement_fee_fixed")
          .eq("id", companyId)
          .single();

        if (error) throw error;
        
        setCompanyData(data as CompanyFeeData);
      } catch (err) {
        console.error("Error fetching company fee config:", err);
        setCompanyData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyFeeConfig();
  }, [companyId]);

  const handleOverrideChange = (enabled: boolean) => {
    onFeeConfigChange({
      ...feeConfig,
      useOverride: enabled,
      feeType: enabled ? (companyData?.fee_type || 'percentage') : 'percentage',
      feePercentage: enabled ? (companyData?.placement_fee_percentage || null) : null,
      feeFixed: enabled ? (companyData?.placement_fee_fixed || null) : null,
    });
  };

  const handleFeeTypeChange = (type: FeeType) => {
    onFeeConfigChange({
      ...feeConfig,
      feeType: type,
    });
  };

  const handlePercentageChange = (value: number | null) => {
    onFeeConfigChange({
      ...feeConfig,
      feePercentage: value,
    });
  };

  const handleFixedChange = (value: number | null) => {
    onFeeConfigChange({
      ...feeConfig,
      feeFixed: value,
    });
  };

  // Calculate preview fee
  const getPreviewFee = () => {
    const baseSalary = salaryMax || 75000;

    if (feeConfig.useOverride) {
      if (feeConfig.feeType === "fixed" && feeConfig.feeFixed) {
        return { type: "fixed", amount: feeConfig.feeFixed };
      }
      if ((feeConfig.feeType === "percentage" || feeConfig.feeType === "hybrid") && feeConfig.feePercentage) {
        return { type: "percentage", amount: (baseSalary * feeConfig.feePercentage) / 100 };
      }
    }

    // Fall back to company config
    if (companyData) {
      if (companyData.fee_type === "fixed" && companyData.placement_fee_fixed) {
        return { type: "fixed", amount: companyData.placement_fee_fixed };
      }
      if (companyData.placement_fee_percentage) {
        return { type: "percentage", amount: (baseSalary * companyData.placement_fee_percentage) / 100 };
      }
    }

    // Default 20%
    return { type: "percentage", amount: (baseSalary * 20) / 100 };
  };

  const previewFee = getPreviewFee();

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading fee configuration...</span>
        </div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <span className="text-sm">Select a company to see fee configuration</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Fee Configuration</Label>
      
      {/* Company Default Display */}
      <Card className={`border-2 ${!feeConfig.useOverride ? "border-primary bg-primary/5" : "border-border"}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {companyData.fee_type === "fixed" ? (
                <DollarSign className="h-4 w-4 text-primary" />
              ) : (
                <Percent className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium">{companyData.name} Default</span>
            </div>
            <Badge variant="secondary" className="capitalize">
              {companyData.fee_type}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {companyData.fee_type === "fixed" ? (
              <span>
                Fixed fee: <strong className="text-foreground">€{companyData.placement_fee_fixed?.toLocaleString()}</strong>
              </span>
            ) : companyData.fee_type === "hybrid" ? (
              <span>
                Default: <strong className="text-foreground">{companyData.placement_fee_percentage}%</strong>
                {companyData.placement_fee_fixed && (
                  <> or fixed €{companyData.placement_fee_fixed.toLocaleString()}</>
                )}
              </span>
            ) : (
              <span>
                Fee: <strong className="text-foreground">{companyData.placement_fee_percentage || 20}%</strong> of salary
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Override Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Override fee for this role</span>
        </div>
        <Switch
          checked={feeConfig.useOverride}
          onCheckedChange={handleOverrideChange}
          disabled={disabled}
        />
      </div>

      {/* Override Configuration */}
      {feeConfig.useOverride && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fee Type for This Role</Label>
            <RadioGroup
              value={feeConfig.feeType}
              onValueChange={(v) => handleFeeTypeChange(v as FeeType)}
              className="grid grid-cols-2 gap-3"
              disabled={disabled}
            >
              <Label
                htmlFor="job-pct"
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  feeConfig.feeType === "percentage"
                    ? "border-primary bg-background"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="percentage" id="job-pct" />
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  <span className="text-sm font-medium">Percentage</span>
                </div>
              </Label>

              <Label
                htmlFor="job-fixed"
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  feeConfig.feeType === "fixed"
                    ? "border-primary bg-background"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="fixed" id="job-fixed" />
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Fixed</span>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            {feeConfig.feeType === "fixed" ? (
              <>
                <Label htmlFor="job-fixed-amount">Fixed Fee Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">€</span>
                  <Input
                    id="job-fixed-amount"
                    type="number"
                    value={feeConfig.feeFixed || ""}
                    onChange={(e) => handleFixedChange(e.target.value ? parseFloat(e.target.value) : null)}
                    min={0}
                    step={500}
                    placeholder="15000"
                    className="w-40"
                    disabled={disabled}
                  />
                </div>
              </>
            ) : (
              <>
                <Label htmlFor="job-pct-value">Fee Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="job-pct-value"
                    type="number"
                    value={feeConfig.feePercentage ?? companyData.placement_fee_percentage ?? 20}
                    onChange={(e) => handlePercentageChange(e.target.value ? parseFloat(e.target.value) : null)}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-24"
                    disabled={disabled}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Revenue Preview */}
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated Placement Fee:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            €{previewFee.amount.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on {salaryMax ? `€${salaryMax.toLocaleString()} salary` : "€75,000 default salary"}
        </p>
      </div>
    </div>
  );
}