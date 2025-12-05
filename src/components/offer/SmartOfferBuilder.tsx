/**
 * Smart Offer Builder Component
 * 
 * AI-powered offer creation with salary benchmarks integration.
 * Connects salary insights to offer recommendations.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle, DollarSign, Target, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartOfferBuilderProps {
  candidateId: string;
  jobId: string;
  applicationId?: string;
  onOfferCreated?: (offerId: string) => void;
}

interface OfferRecommendation {
  recommended_base_salary: number;
  recommended_bonus_percentage: number;
  recommended_equity_percentage: number;
  total_compensation: number;
  salary_percentile: number;
  market_competitiveness_score: number;
  currency: string;
  market_data: {
    min: number;
    max: number;
    median: number;
    sample_size: number;
  };
  candidate_expectations: {
    current_salary: number;
    expected_min: number;
    expected_max: number;
    years_experience: number;
  };
  ai_insights: {
    summary: string;
    risk_factors: string[];
    negotiation_tips: string[];
    counter_offer_preparation: string;
  };
}

export function SmartOfferBuilder({
  candidateId,
  jobId,
  applicationId,
  onOfferCreated,
}: SmartOfferBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<OfferRecommendation | null>(null);
  
  const [baseSalary, setBaseSalary] = useState(0);
  const [bonusPercentage, setBonusPercentage] = useState(10);
  const [equityPercentage, setEquityPercentage] = useState(0);
  const [notes, setNotes] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    generateRecommendation();
  }, [candidateId, jobId]);

  const generateRecommendation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-offer-recommendation', {
        body: { candidate_id: candidateId, job_id: jobId, application_id: applicationId },
      });

      if (error) throw error;

      setRecommendation(data);
      setBaseSalary(data.recommended_base_salary);
      setBonusPercentage(data.recommended_bonus_percentage);
      setEquityPercentage(data.recommended_equity_percentage);
    } catch (error) {
      console.error('Error generating recommendation:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate offer recommendation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOffer = async () => {
    setSaving(true);
    try {
      const totalComp = baseSalary * (1 + bonusPercentage / 100);
      
      const { data, error } = await supabase
        .from('candidate_offers')
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          application_id: applicationId,
          base_salary: baseSalary,
          bonus_percentage: bonusPercentage,
          equity_percentage: equityPercentage,
          total_compensation: totalComp,
          salary_percentile: recommendation?.salary_percentile,
          market_competitiveness_score: recommendation?.market_competitiveness_score,
          ai_recommendation: recommendation?.ai_insights,
          benchmark_comparison: recommendation?.market_data,
          status: 'draft',
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Offer saved',
        description: 'Offer draft has been created successfully',
      });

      onOfferCreated?.(data.id);
    } catch (error) {
      console.error('Error saving offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to save offer',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCompetitivenessColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 75) return 'Above Market';
    if (percentile >= 50) return 'At Market';
    if (percentile >= 25) return 'Below Market';
    return 'Well Below Market';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Analyzing market data and generating recommendation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Recommendation Card */}
      {recommendation && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Recommendation
            </CardTitle>
            <CardDescription>{recommendation.ai_insights.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-primary">
                  {recommendation.currency} {recommendation.recommended_base_salary.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Recommended Base</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className={`text-2xl font-bold ${getCompetitivenessColor(recommendation.market_competitiveness_score)}`}>
                  {recommendation.market_competitiveness_score}%
                </p>
                <p className="text-xs text-muted-foreground">Competitiveness</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold">{recommendation.salary_percentile}th</p>
                <p className="text-xs text-muted-foreground">{getPercentileLabel(recommendation.salary_percentile)}</p>
              </div>
            </div>

            {/* Market Range Visualization */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{recommendation.currency} {recommendation.market_data.min.toLocaleString()}</span>
                <span>Market Range</span>
                <span>{recommendation.currency} {recommendation.market_data.max.toLocaleString()}</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-primary/30"
                  style={{ 
                    left: '0%',
                    width: '100%',
                  }}
                />
                <div 
                  className="absolute h-full w-3 bg-primary rounded-full transform -translate-x-1/2"
                  style={{ 
                    left: `${recommendation.salary_percentile}%`,
                  }}
                />
              </div>
            </div>

            {/* Candidate Expectations */}
            <div className="p-3 rounded-lg bg-background/50 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Candidate Expectations
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Current</p>
                  <p className="font-medium">{recommendation.currency} {recommendation.candidate_expectations.current_salary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected Range</p>
                  <p className="font-medium">
                    {recommendation.currency} {recommendation.candidate_expectations.expected_min.toLocaleString()} - {recommendation.candidate_expectations.expected_max.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Experience</p>
                  <p className="font-medium">{recommendation.candidate_expectations.years_experience} years</p>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {recommendation.ai_insights.risk_factors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors
                </p>
                <ul className="text-sm space-y-1">
                  {recommendation.ai_insights.risk_factors.map((risk, i) => (
                    <li key={i} className="text-muted-foreground">• {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Negotiation Tips */}
            {recommendation.ai_insights.negotiation_tips.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Negotiation Tips
                </p>
                <ul className="text-sm space-y-1">
                  {recommendation.ai_insights.negotiation_tips.map((tip, i) => (
                    <li key={i} className="text-muted-foreground">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Offer Builder Form */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Build Offer
          </CardTitle>
          <CardDescription>Customize the compensation package</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Salary */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Base Salary</Label>
              <span className="text-sm font-medium">
                {recommendation?.currency || 'EUR'} {baseSalary.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[baseSalary]}
              onValueChange={(v) => setBaseSalary(v[0])}
              min={recommendation?.market_data.min || 40000}
              max={recommendation?.market_data.max * 1.3 || 200000}
              step={1000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {(recommendation?.market_data.min || 40000).toLocaleString()}</span>
              <span>Max: {((recommendation?.market_data.max || 150000) * 1.3).toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Bonus */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Annual Bonus</Label>
              <span className="text-sm font-medium">{bonusPercentage}%</span>
            </div>
            <Slider
              value={[bonusPercentage]}
              onValueChange={(v) => setBonusPercentage(v[0])}
              min={0}
              max={50}
              step={5}
            />
          </div>

          {/* Equity */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Equity</Label>
              <span className="text-sm font-medium">{equityPercentage}%</span>
            </div>
            <Slider
              value={[equityPercentage]}
              onValueChange={(v) => setEquityPercentage(v[0])}
              min={0}
              max={2}
              step={0.1}
            />
          </div>

          <Separator />

          {/* Total Compensation */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Compensation</span>
              <span className="text-2xl font-bold text-primary">
                {recommendation?.currency || 'EUR'} {Math.round(baseSalary * (1 + bonusPercentage / 100)).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Base + {bonusPercentage}% bonus{equityPercentage > 0 ? ` + ${equityPercentage}% equity` : ''}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Add any notes about this offer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={generateRecommendation}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Regenerate
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveOffer}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Save Offer Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
