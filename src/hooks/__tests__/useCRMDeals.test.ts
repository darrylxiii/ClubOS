import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCRMDeals } from '../useCRMDeals';
import { supabase } from '@/integrations/supabase/client';

// Mock notify module
vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

/**
 * Build a fully chainable mock that matches the query pattern in useCRMDeals:
 *   from('crm_prospects').select(...).not(...).gt(...).order(...)
 * With optional .eq() and .limit() in the chain.
 *
 * The final method in the chain resolves to { data, error }.
 */
function mockSupabaseQuery(data: Record<string, unknown>[] | null, error: Record<string, unknown> | null = null) {
  // Create an object where every chainable method returns itself,
  // and every call also resolves as a promise with { data, error }
  const chainProxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          // Make the chain itself thenable -- resolves to { data, error }
          return (resolve: (value: { data: typeof data; error: typeof error }) => void) => resolve({ data, error });
        }
        // Every property access returns a function that returns the proxy
        return vi.fn().mockReturnValue(chainProxy);
      },
    }
  );

  vi.mocked(supabase.from).mockReturnValue(chainProxy);
}

// Prospect data factories
function createProspect(overrides: Record<string, unknown> = {}) {
  return {
    id: `prospect-${Math.random().toString(36).slice(2, 8)}`,
    full_name: 'Jane Doe',
    company_name: 'Acme Corp',
    deal_value: 50000,
    currency: 'EUR',
    stage: 'qualified',
    close_probability: 60,
    expected_close_date: '2026-06-01',
    owner_id: 'owner-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    owner: { full_name: 'Sales Rep' },
    ...overrides,
  };
}

describe('useCRMDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading states', () => {
    it('should start with loading=true', () => {
      // Make the query never resolve by using a never-resolving promise proxy
      const neverResolve: unknown = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'then') {
              // Never resolve
              return () => {};
            }
            return vi.fn().mockReturnValue(neverResolve);
          },
        }
      );
      vi.mocked(supabase.from).mockReturnValue(neverResolve);

      const { result } = renderHook(() => useCRMDeals());
      expect(result.current.loading).toBe(true);
      expect(result.current.deals).toEqual([]);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should set loading=false after successful fetch', async () => {
      mockSupabaseQuery([]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading=false even after fetch error', async () => {
      mockSupabaseQuery(null, { message: 'Database error', code: '42501' });

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Deal data mapping', () => {
    it('should map prospect data to CRMDeal format', async () => {
      const prospect = createProspect({
        id: 'p-1',
        full_name: 'John Smith',
        company_name: 'TechCo',
        deal_value: 75000,
        currency: 'USD',
        stage: 'proposal_sent',
        close_probability: 70,
        expected_close_date: '2026-04-15',
        owner_id: 'owner-2',
        owner: { full_name: 'Alice Manager' },
      });

      mockSupabaseQuery([prospect]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });

      const deal = result.current.deals[0];
      expect(deal.id).toBe('p-1');
      expect(deal.prospect_id).toBe('p-1');
      expect(deal.title).toBe('John Smith - TechCo');
      expect(deal.value).toBe(75000);
      expect(deal.currency).toBe('USD');
      expect(deal.stage).toBe('proposal');
      expect(deal.probability).toBe(70);
      expect(deal.expected_close_date).toBe('2026-04-15');
      expect(deal.owner_id).toBe('owner-2');
      expect(deal.prospect_name).toBe('John Smith');
      expect(deal.prospect_company).toBe('TechCo');
      expect(deal.owner_name).toBe('Alice Manager');
    });

    it('should handle missing company name with "Unknown Company"', async () => {
      const prospect = createProspect({ company_name: null });
      mockSupabaseQuery([prospect]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });

      expect(result.current.deals[0].title).toContain('Unknown Company');
    });

    it('should default currency to EUR when not provided', async () => {
      const prospect = createProspect({ currency: null });
      mockSupabaseQuery([prospect]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });

      expect(result.current.deals[0].currency).toBe('EUR');
    });

    it('should set actual_close_date only for closed_won deals', async () => {
      const wonProspect = createProspect({ id: 'won-1', stage: 'closed_won', updated_at: '2026-03-01T00:00:00Z' });
      const openProspect = createProspect({ id: 'open-1', stage: 'qualified', updated_at: '2026-03-01T00:00:00Z' });
      mockSupabaseQuery([wonProspect, openProspect]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(2);
      });

      const wonDeal = result.current.deals.find(d => d.stage === 'closed_won');
      const openDeal = result.current.deals.find(d => d.stage === 'qualification');

      expect(wonDeal?.actual_close_date).toBe('2026-03-01T00:00:00Z');
      expect(openDeal?.actual_close_date).toBeNull();
    });
  });

  describe('Stage mapping', () => {
    it('should map "qualified" to "qualification"', async () => {
      mockSupabaseQuery([createProspect({ stage: 'qualified' })]);
      const { result } = renderHook(() => useCRMDeals());
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });
      expect(result.current.deals[0].stage).toBe('qualification');
    });

    it('should map "meeting_booked" to "qualification"', async () => {
      mockSupabaseQuery([createProspect({ stage: 'meeting_booked' })]);
      const { result } = renderHook(() => useCRMDeals());
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });
      expect(result.current.deals[0].stage).toBe('qualification');
    });

    it('should map "proposal_sent" to "proposal"', async () => {
      mockSupabaseQuery([createProspect({ stage: 'proposal_sent' })]);
      const { result } = renderHook(() => useCRMDeals());
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });
      expect(result.current.deals[0].stage).toBe('proposal');
    });

    it('should default unknown stages to "qualification"', async () => {
      mockSupabaseQuery([createProspect({ stage: 'some_unknown_stage' })]);
      const { result } = renderHook(() => useCRMDeals());
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.deals).toHaveLength(1);
      });
      expect(result.current.deals[0].stage).toBe('qualification');
    });
  });

  describe('Metrics calculations', () => {
    it('should calculate metrics for open deals only', async () => {
      const prospects = [
        createProspect({ deal_value: 100000, close_probability: 80, stage: 'qualified' }),
        createProspect({ deal_value: 50000, close_probability: 40, stage: 'proposal_sent' }),
        createProspect({ deal_value: 200000, stage: 'closed_won' }),
        createProspect({ deal_value: 30000, stage: 'closed_lost' }),
      ];
      mockSupabaseQuery(prospects);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).not.toBeNull();
      });

      const metrics = result.current.metrics!;

      // Only open deals (qualified + proposal_sent) count for totalDeals
      expect(metrics.totalDeals).toBe(2);
      // totalValue = 100000 + 50000 = 150000
      expect(metrics.totalValue).toBe(150000);
      // avgDealSize = 150000 / 2 = 75000
      expect(metrics.avgDealSize).toBe(75000);
    });

    it('should calculate weighted value correctly', async () => {
      const prospects = [
        createProspect({ deal_value: 100000, close_probability: 80, stage: 'qualified' }),
        createProspect({ deal_value: 50000, close_probability: 40, stage: 'proposal_sent' }),
      ];
      mockSupabaseQuery(prospects);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).not.toBeNull();
      });

      // weightedValue = (100000 * 80/100) + (50000 * 40/100) = 80000 + 20000 = 100000
      expect(result.current.metrics!.weightedValue).toBe(100000);
    });

    it('should calculate win rate from closed deals', async () => {
      const prospects = [
        createProspect({ deal_value: 100000, stage: 'closed_won' }),
        createProspect({ deal_value: 50000, stage: 'closed_won' }),
        createProspect({ deal_value: 30000, stage: 'closed_won' }),
        createProspect({ deal_value: 20000, stage: 'closed_lost' }),
      ];
      mockSupabaseQuery(prospects);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).not.toBeNull();
      });

      // winRate = 3 won / (3 won + 1 lost) * 100 = 75
      expect(result.current.metrics!.winRate).toBe(75);
      expect(result.current.metrics!.wonDeals).toBe(3);
      expect(result.current.metrics!.lostDeals).toBe(1);
    });

    it('should calculate won value', async () => {
      const prospects = [
        createProspect({ deal_value: 100000, stage: 'closed_won' }),
        createProspect({ deal_value: 50000, stage: 'closed_won' }),
      ];
      mockSupabaseQuery(prospects);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).not.toBeNull();
      });

      expect(result.current.metrics!.wonValue).toBe(150000);
    });

    it('should handle zero deals with safe defaults', async () => {
      mockSupabaseQuery([]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).not.toBeNull();
      });

      const metrics = result.current.metrics!;
      expect(metrics.totalDeals).toBe(0);
      expect(metrics.totalValue).toBe(0);
      expect(metrics.weightedValue).toBe(0);
      expect(metrics.avgDealSize).toBe(0);
      expect(metrics.wonDeals).toBe(0);
      expect(metrics.wonValue).toBe(0);
      expect(metrics.lostDeals).toBe(0);
      expect(metrics.winRate).toBe(0);
    });

    it('should set winRate to 0 when no closed deals exist', async () => {
      const prospects = [
        createProspect({ stage: 'qualified' }),
        createProspect({ stage: 'proposal_sent' }),
      ];
      mockSupabaseQuery(prospects);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).not.toBeNull();
      });

      expect(result.current.metrics!.winRate).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should capture database fetch errors', async () => {
      mockSupabaseQuery(null, { message: 'Permission denied', code: '42501' });

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.deals).toEqual([]);
    });

    it('should handle null data gracefully', async () => {
      mockSupabaseQuery(null);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // null data without error = empty deals
      expect(result.current.deals).toEqual([]);
    });
  });

  describe('Refetch', () => {
    it('should provide a refetch function', async () => {
      mockSupabaseQuery([]);

      const { result } = renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Query filters', () => {
    it('should query crm_prospects table', async () => {
      mockSupabaseQuery([]);

      renderHook(() => useCRMDeals());

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('crm_prospects');
      });
    });
  });
});
