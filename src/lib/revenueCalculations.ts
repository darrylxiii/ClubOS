export interface RevenueCalculationInput {
  job_id: string;
  company_fee_percentage: number;
  candidate_expected_salary?: number;
  candidate_avg_salary_in_pipeline?: number;
  stage_probability: number;
  historical_conversion_rate?: number;
}

export interface RevenueEstimate {
  base_salary: number;
  fee_amount: number;
  weighted_value: number;
  probability_adjusted_value: number;
  confidence_score: number;
}

function calculateConfidence(input: RevenueCalculationInput): number {
  let confidence = 50; // Base confidence

  // Increase confidence if we have actual salary data
  if (input.candidate_expected_salary) {
    confidence += 25;
  } else if (input.candidate_avg_salary_in_pipeline) {
    confidence += 15;
  }

  // Increase confidence if we have historical data
  if (input.historical_conversion_rate) {
    confidence += 20;
  }

  // Increase confidence if fee is configured
  if (input.company_fee_percentage > 0) {
    confidence += 10;
  }

  return Math.min(confidence, 100);
}

export function calculateRevenueEstimate(input: RevenueCalculationInput): RevenueEstimate {
  // Step 1: Determine salary base
  const baseSalary = input.candidate_expected_salary 
    || input.candidate_avg_salary_in_pipeline 
    || 0;
  
  // Step 2: Calculate fee
  const feeAmount = baseSalary * (input.company_fee_percentage / 100);
  
  // Step 3: Apply stage probability (from deal_stages table)
  const weightedValue = feeAmount * (input.stage_probability / 100);
  
  // Step 4: Apply historical conversion if available
  const historicalMultiplier = input.historical_conversion_rate || input.stage_probability;
  const probabilityAdjustedValue = feeAmount * (historicalMultiplier / 100);
  
  // Step 5: Calculate confidence based on data availability
  const confidence = calculateConfidence(input);
  
  return {
    base_salary: baseSalary,
    fee_amount: feeAmount,
    weighted_value: weightedValue,
    probability_adjusted_value: probabilityAdjustedValue,
    confidence_score: confidence
  };
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
