import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  DollarSign,
  Percent,
  Calculator,
  Target,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import { Deal, usePipelineMetrics } from "@/hooks/useDealPipeline";
import { formatCurrency } from "@/lib/revenueCalculations";

interface RevenueSource {
  type: "actual" | "override" | "candidate_avg" | "job_salary" | "company_default";
  label: string;
  priority: number;
  confidence: number;
  color: string;
}

type FeeSourceType = "fixed" | "percentage" | "hybrid";

const REVENUE_SOURCES: Record<string, RevenueSource> = {
  actual: {
    type: "actual",
    label: "Actual Hired Salary",
    priority: 1,
    confidence: 100,
    color: "emerald",
  },
  override: {
    type: "override",
    label: "Manual Override",
    priority: 2,
    confidence: 95,
    color: "blue",
  },
  candidate_avg: {
    type: "candidate_avg",
    label: "Avg Candidate Salary",
    priority: 3,
    confidence: 75,
    color: "amber",
  },
  job_salary: {
    type: "job_salary",
    label: "Job Salary Range",
    priority: 4,
    confidence: 60,
    color: "orange",
  },
  company_default: {
    type: "company_default",
    label: "Company Default",
    priority: 5,
    confidence: 40,
    color: "red",
  },
};

const FEE_TYPE_LABELS: Record<FeeSourceType, { label: string; icon: typeof Percent }> = {
  percentage: { label: "Percentage", icon: Percent },
  fixed: { label: "Fixed", icon: DollarSign },
  hybrid: { label: "Hybrid", icon: Calculator },
};

interface RevenuePreCalculationProps {
  deals: Deal[];
  stages?: Array<{ name: string; probability_weight: number }>;
}

export function RevenuePreCalculation({ deals, stages }: RevenuePreCalculationProps) {
  // Use the same source of truth as the header stats
  const { data: metrics } = usePipelineMetrics();
  
  const calculations = useMemo(() => {
    if (!deals || deals.length === 0) return null;

    let highConfidenceValue = 0;
    let mediumConfidenceValue = 0;
    let lowConfidenceValue = 0;
    let missingFeeCount = 0;
    let missingSalaryCount = 0;
    let fixedFeeCount = 0;
    let percentageFeeCount = 0;
    let hybridFeeCount = 0;

    const dealCalculations = deals.map((deal) => {
      const companies = deal.companies as any;
      const feeType = (companies?.fee_type || 'percentage') as FeeSourceType;
      const feePercentage = companies?.placement_fee_percentage || 0;
      const feeFixed = companies?.placement_fee_fixed || 0;
      const hasFee = feePercentage > 0 || feeFixed > 0;

      // Track fee types
      if (!hasFee) {
        missingFeeCount++;
      } else if (feeType === 'fixed') {
        fixedFeeCount++;
      } else if (feeType === 'hybrid') {
        hybridFeeCount++;
      } else {
        percentageFeeCount++;
      }

      // Determine source and confidence - estimated_value IS already the fee amount
      let source: RevenueSource;
      let feeAmount = 0;

      if (deal.deal_value_override && deal.deal_value_override > 0) {
        feeAmount = deal.deal_value_override;
        source = REVENUE_SOURCES.override;
      } else if (feeType === 'fixed' && feeFixed > 0) {
        feeAmount = feeFixed;
        source = REVENUE_SOURCES.actual;
      } else if (deal.estimated_value && deal.estimated_value > 0) {
        // estimated_value is already salary × fee% from the SQL function
        feeAmount = deal.estimated_value;
        source = REVENUE_SOURCES.candidate_avg;
      } else {
        feeAmount = 12000; // Default fallback (60k × 20%)
        source = REVENUE_SOURCES.company_default;
        missingSalaryCount++;
      }
      
      const probability = deal.deal_probability || 50;
      const weightedValue = feeAmount * (probability / 100);

      // Adjust confidence based on fee availability
      const effectiveConfidence = hasFee ? source.confidence : source.confidence * 0.5;

      // Aggregate by confidence level
      if (effectiveConfidence >= 75) {
        highConfidenceValue += weightedValue;
      } else if (effectiveConfidence >= 50) {
        mediumConfidenceValue += weightedValue;
      } else {
        lowConfidenceValue += weightedValue;
      }

      return {
        dealId: deal.id,
        title: deal.title,
        company: deal.company_name,
        feeType,
        feePercentage,
        feeFixed,
        feeAmount,
        probability,
        weightedValue,
        source,
        confidence: effectiveConfidence,
        hasFee,
      };
    });

    // Calculate overall confidence
    const avgConfidence = dealCalculations.length > 0 
      ? dealCalculations.reduce((sum, d) => sum + d.confidence, 0) / dealCalculations.length
      : 0;

    return {
      // Use metrics from SQL source of truth for main totals
      totalPipeline: metrics?.total_pipeline || 0,
      weightedPipeline: metrics?.weighted_pipeline || 0,
      highConfidenceValue,
      mediumConfidenceValue,
      lowConfidenceValue,
      avgConfidence,
      missingFeeCount,
      missingSalaryCount,
      fixedFeeCount,
      percentageFeeCount,
      hybridFeeCount,
      dealCalculations,
      dealCount: deals.length,
    };
  }, [deals, metrics]);

  if (!calculations) return null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return "text-emerald-500";
    if (confidence >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 75) return "bg-emerald-500/10 border-emerald-500/20";
    if (confidence >= 50) return "bg-amber-500/10 border-amber-500/20";
    return "bg-destructive/10 border-destructive/20";
  };

  return (
    <div className="space-y-6">
      {/* Main Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <Badge variant="outline" className="text-xs">Total</Badge>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(calculations.totalPipeline)}</p>
              <p className="text-xs text-muted-foreground">Total Pipeline Value</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weighted Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-card/60 backdrop-blur-xl border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-primary" />
                <Badge variant="outline" className="text-xs bg-primary/10">Weighted</Badge>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(calculations.weightedPipeline)}</p>
              <p className="text-xs text-muted-foreground">Probability-Adjusted</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Confidence Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`bg-gradient-to-br backdrop-blur-xl ${getConfidenceBg(calculations.avgConfidence)}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Calculator className="h-5 w-5" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Based on data quality: actual salaries, fee configuration, and candidate data availability</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className={`text-2xl font-bold ${getConfidenceColor(calculations.avgConfidence)}`}>
                {Math.round(calculations.avgConfidence)}%
              </p>
              <p className="text-xs text-muted-foreground">Confidence Score</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deal Count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
              <p className="text-2xl font-bold">{calculations.dealCount}</p>
              <p className="text-xs text-muted-foreground">Deals in Pipeline</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Confidence Breakdown */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Confidence Breakdown
          </CardTitle>
          <CardDescription>
            Revenue categorized by calculation confidence level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* High Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">High Confidence (75%+)</span>
                </div>
                <span className="text-sm font-bold text-emerald-500">
                  {formatCurrency(calculations.highConfidenceValue)}
                </span>
              </div>
              <Progress 
                value={(calculations.highConfidenceValue / calculations.weightedPipeline) * 100} 
                className="h-2 bg-muted"
              />
            </div>

            {/* Medium Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Medium Confidence (50-74%)</span>
                </div>
                <span className="text-sm font-bold text-amber-500">
                  {formatCurrency(calculations.mediumConfidenceValue)}
                </span>
              </div>
              <Progress 
                value={(calculations.mediumConfidenceValue / calculations.weightedPipeline) * 100} 
                className="h-2 bg-muted"
              />
            </div>

            {/* Low Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Low Confidence (&lt;50%)</span>
                </div>
                <span className="text-sm font-bold text-destructive">
                  {formatCurrency(calculations.lowConfidenceValue)}
                </span>
              </div>
              <Progress 
                value={(calculations.lowConfidenceValue / calculations.weightedPipeline) * 100} 
                className="h-2 bg-muted"
              />
            </div>
          </div>

          {/* Fee Type Breakdown */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fee Type Distribution
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Percent className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">Percentage</span>
                </div>
                <span className="text-lg font-bold">{calculations.percentageFeeCount}</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Fixed</span>
                </div>
                <span className="text-lg font-bold">{calculations.fixedFeeCount}</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calculator className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Hybrid</span>
                </div>
                <span className="text-lg font-bold">{calculations.hybridFeeCount}</span>
              </div>
            </div>
          </div>

          {/* Data Quality Warnings */}
          {(calculations.missingFeeCount > 0 || calculations.missingSalaryCount > 0) && (
            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-500">Data Quality Issues</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {calculations.missingFeeCount > 0 && (
                      <li>• {calculations.missingFeeCount} deals missing fee configuration</li>
                    )}
                    {calculations.missingSalaryCount > 0 && (
                      <li>• {calculations.missingSalaryCount} deals using default salary estimates</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation Method Legend */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Revenue Calculation Method
          </CardTitle>
          <CardDescription>
            How we calculate projected revenue for each deal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {Object.values(REVENUE_SOURCES).map((source) => (
              <div
                key={source.type}
                className={`p-3 rounded-lg border ${
                  source.confidence >= 75
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : source.confidence >= 50
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-destructive/5 border-destructive/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Priority {source.priority}</span>
                  <Badge variant="outline" className="text-xs">
                    {source.confidence}%
                  </Badge>
                </div>
                <p className="text-sm font-medium">{source.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Formula: <code className="px-1 py-0.5 bg-muted rounded">Base Salary × Fee % × Stage Probability = Weighted Value</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
