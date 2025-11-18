/**
 * Baseline Deal Predictor
 * Simple heuristic model for predicting deal outcomes before full ML implementation
 */

export interface DealFeatures {
  days_since_created: number;
  candidate_count: number;
  stage: string;
  company_fee_configured: boolean;
  last_activity_days_ago: number;
  historical_conversion_rate: number;
  deal_health_score?: number;
}

export interface Prediction {
  probability: number;
  days_to_close: number;
  confidence: number;
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
}

export class BaselineDealPredictor {
  private stageMultipliers: Record<string, number> = {
    'Discovery': 0.2,
    'Qualification': 0.3,
    'Proposal': 0.5,
    'Negotiation': 0.7,
    'Closed Won': 1.0,
    'Closed Lost': 0.0,
  };

  private stageDurations: Record<string, number> = {
    'Discovery': 14,
    'Qualification': 21,
    'Proposal': 30,
    'Negotiation': 14,
  };

  predict(features: DealFeatures): Prediction {
    let score = features.historical_conversion_rate || 50;
    const factors: Prediction['factors'] = [];

    // Factor 1: Stage-based probability
    const stageMultiplier = this.stageMultipliers[features.stage] || 0.5;
    const stageBonus = (stageMultiplier - 0.5) * 40;
    score += stageBonus;
    factors.push({
      name: 'Pipeline Stage',
      impact: stageBonus,
      description: `Deal is in ${features.stage} stage`,
    });

    // Factor 2: Activity recency
    if (features.last_activity_days_ago > 30) {
      score *= 0.6;
      factors.push({
        name: 'Stale Activity',
        impact: -20,
        description: 'No activity in over 30 days',
      });
    } else if (features.last_activity_days_ago > 14) {
      score *= 0.8;
      factors.push({
        name: 'Low Activity',
        impact: -10,
        description: 'No activity in over 2 weeks',
      });
    } else {
      factors.push({
        name: 'Active Deal',
        impact: 5,
        description: 'Recent activity detected',
      });
    }

    // Factor 3: Candidate pool size
    if (features.candidate_count === 0) {
      score *= 0.4;
      factors.push({
        name: 'No Candidates',
        impact: -30,
        description: 'No candidates in pipeline',
      });
    } else if (features.candidate_count < 3) {
      score *= 0.7;
      factors.push({
        name: 'Low Candidate Pool',
        impact: -15,
        description: `Only ${features.candidate_count} candidate(s)`,
      });
    } else if (features.candidate_count > 5) {
      score *= 1.2;
      factors.push({
        name: 'Strong Candidate Pool',
        impact: 15,
        description: `${features.candidate_count} candidates engaged`,
      });
    }

    // Factor 4: Configuration completeness
    if (!features.company_fee_configured) {
      score *= 0.9;
      factors.push({
        name: 'Incomplete Setup',
        impact: -5,
        description: 'Fee percentage not configured',
      });
    }

    // Factor 5: Deal health score
    if (features.deal_health_score) {
      const healthImpact = (features.deal_health_score - 50) * 0.3;
      score += healthImpact;
      factors.push({
        name: 'Deal Health',
        impact: healthImpact,
        description: `Health score: ${features.deal_health_score}/100`,
      });
    }

    // Factor 6: Deal age
    if (features.days_since_created > 90) {
      score *= 0.8;
      factors.push({
        name: 'Aging Deal',
        impact: -10,
        description: 'Deal is over 90 days old',
      });
    }

    // Estimate days to close
    const daysToClose = this.estimateDaysToClose(
      features.stage,
      features.days_since_created,
      features.candidate_count
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(features);

    return {
      probability: Math.min(Math.max(score, 0), 100),
      days_to_close: daysToClose,
      confidence,
      factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    };
  }

  private estimateDaysToClose(
    stage: string,
    daysSinceCreated: number,
    candidateCount: number
  ): number {
    const baseDuration = this.stageDurations[stage] || 30;
    
    // Adjust based on candidate pool
    let multiplier = 1.0;
    if (candidateCount === 0) multiplier = 2.0;
    else if (candidateCount < 3) multiplier = 1.5;
    else if (candidateCount > 5) multiplier = 0.8;

    // Adjust based on current duration
    if (daysSinceCreated > 60) multiplier *= 1.3;

    return Math.round(baseDuration * multiplier);
  }

  private calculateConfidence(features: DealFeatures): number {
    let confidence = 60; // Base confidence

    // Increase with historical data
    if (features.historical_conversion_rate > 0) confidence += 20;

    // Increase with activity
    if (features.last_activity_days_ago < 7) confidence += 10;

    // Increase with candidates
    if (features.candidate_count > 3) confidence += 10;

    // Decrease with age
    if (features.days_since_created > 90) confidence -= 15;

    return Math.min(Math.max(confidence, 0), 100);
  }

  generateRecommendations(features: DealFeatures): string[] {
    const recommendations: string[] = [];

    if (features.last_activity_days_ago > 14) {
      recommendations.push('Schedule a follow-up call with the client');
    }

    if (features.candidate_count < 3) {
      recommendations.push('Source more qualified candidates to strengthen the pipeline');
    }

    if (!features.company_fee_configured) {
      recommendations.push('Configure placement fee percentage in company settings');
    }

    if (features.days_since_created > 60) {
      recommendations.push('Review deal progress and timeline expectations');
    }

    if (features.deal_health_score && features.deal_health_score < 50) {
      recommendations.push('Address deal health issues to improve close probability');
    }

    return recommendations;
  }
}

// Export singleton instance
export const baselinePredictor = new BaselineDealPredictor();
