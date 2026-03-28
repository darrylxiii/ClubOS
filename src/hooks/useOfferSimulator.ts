/**
 * Offer Simulator Hook
 *
 * Fetches current offer data + salary benchmarks for a role/location,
 * computes acceptance probability at different comp levels, and exposes
 * a `simulate` function that returns updated probability in real-time.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OfferBenchmarks {
  p25: number;
  p50: number;
  p75: number;
  min: number;
  max: number;
  currency: string;
}

export interface CurrentOffer {
  baseSalary: number;
  bonus: number;
  equity: number;
  currency: string;
  jobTitle: string;
  location: string;
}

export interface SimulationResult {
  acceptanceProbability: number;
  percentile: number;
  totalComp: number;
  vsMarketP50: number; // percentage difference
}

const DEFAULT_BENCHMARKS: OfferBenchmarks = {
  p25: 70000,
  p50: 90000,
  p75: 115000,
  min: 55000,
  max: 140000,
  currency: 'USD',
};

const DEFAULT_OFFER: CurrentOffer = {
  baseSalary: 85000,
  bonus: 10,
  equity: 0,
  currency: 'USD',
  jobTitle: '',
  location: '',
};

function computePercentile(salary: number, benchmarks: OfferBenchmarks): number {
  if (salary <= benchmarks.min) return 0;
  if (salary >= benchmarks.max) return 100;
  // Interpolate using p25/p50/p75 as anchors
  if (salary <= benchmarks.p25) {
    return 25 * ((salary - benchmarks.min) / (benchmarks.p25 - benchmarks.min));
  }
  if (salary <= benchmarks.p50) {
    return 25 + 25 * ((salary - benchmarks.p25) / (benchmarks.p50 - benchmarks.p25));
  }
  if (salary <= benchmarks.p75) {
    return 50 + 25 * ((salary - benchmarks.p50) / (benchmarks.p75 - benchmarks.p50));
  }
  return 75 + 25 * ((salary - benchmarks.p75) / (benchmarks.max - benchmarks.p75));
}

function computeAcceptanceProbability(totalComp: number, benchmarks: OfferBenchmarks): number {
  const percentile = computePercentile(totalComp, benchmarks);
  // Sigmoid curve: strong gains from 0-60th percentile, diminishing above
  const base = 20; // Even at p0, there is ~20% chance
  const maxProb = 96; // Even at p100, cap at 96%
  const k = 0.08; // steepness
  const midpoint = 45; // inflection at ~45th percentile
  const raw = base + (maxProb - base) / (1 + Math.exp(-k * (percentile - midpoint)));
  return Math.round(Math.min(maxProb, Math.max(base, raw)));
}

export function useOfferSimulator(jobId: string | null, candidateId: string | null) {
  // Fetch current offer data from application
  const { data: currentOffer, isLoading: offerLoading } = useQuery({
    queryKey: ['offer-simulator-offer', jobId, candidateId],
    queryFn: async (): Promise<CurrentOffer> => {
      if (!jobId || !candidateId) return DEFAULT_OFFER;

      try {
        const { data, error } = await (supabase as any)
          .from('applications')
          .select(`
            id,
            stage,
            jobs!inner (title, salary_min, salary_max, salary_currency, location)
          `)
          .eq('job_id', jobId)
          .eq('candidate_id', candidateId)
          .in('stage', ['offer', 'offer_sent', 'negotiation', 'offer_accepted', 'offer_declined'])
          .limit(1)
          .maybeSingle();

        if (error || !data) return DEFAULT_OFFER;

        const job = data.jobs;
        return {
          baseSalary: job?.salary_max || job?.salary_min || DEFAULT_OFFER.baseSalary,
          bonus: 10,
          equity: 0,
          currency: job?.salary_currency || 'USD',
          jobTitle: job?.title || '',
          location: job?.location || '',
        };
      } catch {
        return DEFAULT_OFFER;
      }
    },
    enabled: !!jobId && !!candidateId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch salary benchmarks for the role
  const { data: benchmarks, isLoading: benchmarksLoading } = useQuery({
    queryKey: ['offer-simulator-benchmarks', currentOffer?.jobTitle, currentOffer?.location],
    queryFn: async (): Promise<OfferBenchmarks> => {
      if (!currentOffer?.jobTitle) return DEFAULT_BENCHMARKS;

      try {
        let query = (supabase as any)
          .from('salary_benchmarks')
          .select('salary_min, salary_max, currency')
          .ilike('role_title', `%${currentOffer.jobTitle}%`);

        if (currentOffer.location) {
          query = query.ilike('location', `%${currentOffer.location}%`);
        }

        const { data, error } = await query.limit(20);
        if (error || !data || data.length === 0) return DEFAULT_BENCHMARKS;

        const mins = data.map((d: any) => d.salary_min).filter(Boolean).sort((a: number, b: number) => a - b);
        const maxs = data.map((d: any) => d.salary_max).filter(Boolean).sort((a: number, b: number) => a - b);

        if (mins.length === 0 || maxs.length === 0) return DEFAULT_BENCHMARKS;

        const p25Idx = Math.floor(mins.length * 0.25);
        const p50Idx = Math.floor(mins.length * 0.5);
        const p75Idx = Math.floor(maxs.length * 0.75);

        return {
          p25: Math.round((mins[p25Idx] + maxs[p25Idx]) / 2),
          p50: Math.round((mins[p50Idx] + maxs[p50Idx]) / 2),
          p75: Math.round((mins[p75Idx] + maxs[p75Idx]) / 2),
          min: mins[0],
          max: maxs[maxs.length - 1],
          currency: data[0].currency || currentOffer.currency || 'USD',
        };
      } catch {
        return DEFAULT_BENCHMARKS;
      }
    },
    enabled: !!currentOffer?.jobTitle,
    staleTime: 10 * 60 * 1000,
  });

  const effectiveBenchmarks = benchmarks || DEFAULT_BENCHMARKS;
  const effectiveOffer = currentOffer || DEFAULT_OFFER;

  const totalComp = effectiveOffer.baseSalary * (1 + effectiveOffer.bonus / 100 + effectiveOffer.equity / 100);
  const probability = computeAcceptanceProbability(totalComp, effectiveBenchmarks);

  function simulate(baseSalary: number, bonus: number, equity: number): SimulationResult {
    const total = baseSalary * (1 + bonus / 100 + equity / 100);
    const pct = computePercentile(total, effectiveBenchmarks);
    const prob = computeAcceptanceProbability(total, effectiveBenchmarks);
    const vsP50 = effectiveBenchmarks.p50 > 0
      ? Math.round(((total - effectiveBenchmarks.p50) / effectiveBenchmarks.p50) * 100)
      : 0;

    return {
      acceptanceProbability: prob,
      percentile: Math.round(pct),
      totalComp: Math.round(total),
      vsMarketP50: vsP50,
    };
  }

  function findOptimal(): { baseSalary: number; bonus: number; equity: number } {
    // Find the lowest total comp that yields >= 80% acceptance
    const targetProb = 80;
    let low = effectiveBenchmarks.min;
    let high = effectiveBenchmarks.max;

    // Binary search for optimal base salary
    for (let i = 0; i < 20; i++) {
      const mid = Math.round((low + high) / 2);
      const prob = computeAcceptanceProbability(mid, effectiveBenchmarks);
      if (prob >= targetProb) {
        high = mid;
      } else {
        low = mid;
      }
    }

    const optimalTotal = Math.round(high);
    // Split: 85% base, 10% bonus, 5% equity
    const optBase = Math.round(optimalTotal * 0.85);
    const optBonus = 12;
    const optEquity = 3;

    return { baseSalary: optBase, bonus: optBonus, equity: optEquity };
  }

  return {
    currentOffer: effectiveOffer,
    benchmarks: effectiveBenchmarks,
    probability,
    simulate,
    findOptimal,
    isLoading: offerLoading || benchmarksLoading,
  };
}
