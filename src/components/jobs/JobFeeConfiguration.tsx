import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Info, Percent, DollarSign, AlertCircle } from "lucide-react";

interface CompanyFeeConfig {
  fee_type: "percentage" | "fixed" | "hybrid";
  placement_fee_percentage: number | null;
  placement_fee_fixed: number | null;
}

interface JobFeeConfigurationProps {
  companyFeeConfig: CompanyFeeConfig | null;
  companyName: string;
  jobFeeType: "percentage" | "fixed" | null;
  jobFeePercentage: number | null;
  jobFeeFixed: number | null;
  onJobFeeTypeChange: (type: "percentage" | "fixed" | null) => void;
  onJobFeePercentageChange: (value: number | null) => void;
  onJobFeeFixedChange: (value: number | null) => void;
  salaryMax?: number | null;
}

export function JobFeeConfiguration({
  companyFeeConfig,
  companyName,
  jobFeeType,
  jobFeePercentage,
  jobFeeFixed,
  onJobFeeTypeChange,
  onJobFeePercentageChange,
  onJobFeeFixedChange,
  salaryMax,
}: JobFeeConfigurationProps) {
  const [overrideEnabled, setOverrideEnabled] = useState(jobFeeType !== null);

  useEffect(() => {
    if (!overrideEnabled) {
      onJobFeeTypeChange(null);
      onJobFeePercentageChange(null);
      onJobFeeFixedChange(null);
    }
  }, [overrideEnabled]);

  // Calculate preview fee
  const getPreviewFee = () => {
    const baseSalary = salaryMax || 75000;
    
    if (overrideEnabled && jobFeeType) {
      if (jobFeeType === "fixed" && jobFeeFixed) {
        return { type: "fixed", amount: jobFeeFixed };
      }
      if (jobFeeType === "percentage" && jobFeePercentage) {
        return { type: "percentage", amount: (baseSalary * jobFeePercentage) / 100 };
      }
    }
    
    // Fall back to company config
    if (companyFeeConfig) {
      if (companyFeeConfig.fee_type === "fixed" && companyFeeConfig.placement_fee_fixed) {
        return { type: "fixed", amount: companyFeeConfig.placement_fee_fixed };
      }
      if (companyFeeConfig.placement_fee_percentage) {
        return { type: "percentage", amount: (baseSalary * companyFeeConfig.placement_fee_percentage) / 100 };
      }
    }
    
    // Default 20%
    return { type: "percentage", amount: (baseSalary * 20) / 100 };
  };

  const previewFee = getPreviewFee();

  if (!companyFeeConfig) {
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
      {/* Company Default Display */}
      <Card className={`border-2 ${!overrideEnabled ? "border-primary bg-primary/5" : "border-border"}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {companyFeeConfig.fee_type === "fixed" ? (
                <DollarSign className="h-4 w-4 text-primary" />
              ) : (
                <Percent className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium">{companyName} Default</span>
            </div>
            <Badge variant="secondary" className="capitalize">
              {companyFeeConfig.fee_type}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {companyFeeConfig.fee_type === "fixed" ? (
              <span>Fixed fee: <strong className="text-foreground">€{companyFeeConfig.placement_fee_fixed?.toLocaleString()}</strong></span>
            ) : companyFeeConfig.fee_type === "hybrid" ? (
              <span>
                Default: <strong className="text-foreground">{companyFeeConfig.placement_fee_percentage}%</strong>
                {companyFeeConfig.placement_fee_fixed && (
                  <> or fixed €{companyFeeConfig.placement_fee_fixed.toLocaleString()}</>
                )}
              </span>
            ) : (
              <span>Fee: <strong className="text-foreground">{companyFeeConfig.placement_fee_percentage || 20}%</strong> of salary</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Override Toggle - Only show for hybrid or if user wants to customize */}
      {companyFeeConfig.fee_type === "hybrid" || companyFeeConfig.fee_type === "percentage" ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Override fee for this role</span>
          </div>
          <Switch
            checked={overrideEnabled}
            onCheckedChange={setOverrideEnabled}
          />
        </div>
      ) : null}

      {/* Override Configuration */}
      {overrideEnabled && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fee Type for This Role</Label>
            <RadioGroup
              value={jobFeeType || "percentage"}
              onValueChange={(v) => onJobFeeTypeChange(v as "percentage" | "fixed")}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="job-pct"
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  jobFeeType === "percentage" || !jobFeeType
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
                  jobFeeType === "fixed"
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
            {jobFeeType === "fixed" ? (
              <>
                <Label htmlFor="job-fixed-amount">Fixed Fee Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">€</span>
                  <Input
                    id="job-fixed-amount"
                    type="number"
                    value={jobFeeFixed || ""}
                    onChange={(e) => onJobFeeFixedChange(e.target.value ? parseFloat(e.target.value) : null)}
                    min={0}
                    step={500}
                    placeholder="15000"
                    className="w-40"
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
                    value={jobFeePercentage ?? companyFeeConfig.placement_fee_percentage ?? 20}
                    onChange={(e) => onJobFeePercentageChange(e.target.value ? parseFloat(e.target.value) : null)}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-24"
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
