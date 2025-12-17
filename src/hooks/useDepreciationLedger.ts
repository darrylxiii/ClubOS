import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DepreciationEntry {
  id: string;
  asset_id: string;
  period_year: number;
  period_month: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value_after: number;
  is_posted: boolean | null;
  posted_at: string | null;
  posted_by: string | null;
  created_at: string | null;
  asset?: {
    asset_name: string;
    inventory_number: string;
    category: string;
  };
}

interface UseDepreciationLedgerOptions {
  assetId?: string;
  year?: number;
  month?: number;
  isPosted?: boolean;
}

export function useDepreciationLedger(options?: UseDepreciationLedgerOptions) {
  const [entries, setEntries] = useState<DepreciationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('inventory_depreciation_ledger')
        .select(`
          *,
          asset:inventory_assets(asset_name, inventory_number, category)
        `)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (options?.assetId) {
        query = query.eq('asset_id', options.assetId);
      }
      if (options?.year) {
        query = query.eq('period_year', options.year);
      }
      if (options?.month) {
        query = query.eq('period_month', options.month);
      }
      if (options?.isPosted !== undefined) {
        query = query.eq('is_posted', options.isPosted);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setEntries((data || []) as unknown as DepreciationEntry[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch ledger entries';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [options?.assetId, options?.year, options?.month, options?.isPosted]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const generateMonthlyEntries = async (year: number, month: number): Promise<boolean> => {
    try {
      // Get all active assets
      const { data: assets, error: assetsError } = await supabase
        .from('inventory_assets')
        .select('*')
        .eq('status', 'active');

      if (assetsError) throw assetsError;

      const newEntries = [];

      for (const asset of assets || []) {
        // Check if entry already exists
        const { data: existing } = await supabase
          .from('inventory_depreciation_ledger')
          .select('id')
          .eq('asset_id', asset.id)
          .eq('period_year', year)
          .eq('period_month', month)
          .single();

        if (!existing) {
          const bookValueStart = asset.current_book_value || asset.total_purchase_value || 0;
          const depreciation = asset.monthly_depreciation || 0;
          const residualValue = asset.residual_value || 0;
          const bookValueEnd = Math.max(residualValue, bookValueStart - depreciation);
          const actualDepreciation = bookValueStart > residualValue ? depreciation : 0;

          newEntries.push({
            asset_id: asset.id,
            period_year: year,
            period_month: month,
            depreciation_amount: actualDepreciation,
            accumulated_depreciation: (asset.accumulated_depreciation || 0) + actualDepreciation,
            book_value_after: bookValueEnd,
            is_posted: false,
          });
        }
      }

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('inventory_depreciation_ledger')
          .insert(newEntries);

        if (insertError) throw insertError;
        toast.success(`Generated ${newEntries.length} depreciation entries`);
      } else {
        toast.info('All entries already exist for this period');
      }

      await fetchEntries();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate entries';
      toast.error(message);
      return false;
    }
  };

  const postEntry = async (entryId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('inventory_depreciation_ledger')
        .update({
          is_posted: true,
          posted_at: new Date().toISOString(),
          posted_by: user?.id,
        })
        .eq('id', entryId);

      if (error) throw error;

      // Update the asset's accumulated depreciation and book value
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        await supabase
          .from('inventory_assets')
          .update({
            accumulated_depreciation: entry.accumulated_depreciation,
            current_book_value: entry.book_value_after,
          })
          .eq('id', entry.asset_id);
      }

      toast.success('Entry posted successfully');
      await fetchEntries();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to post entry';
      toast.error(message);
      return false;
    }
  };

  const unpostEntry = async (entryId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('inventory_depreciation_ledger')
        .update({
          is_posted: false,
          posted_at: null,
          posted_by: null,
        })
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Entry unposted successfully');
      await fetchEntries();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unpost entry';
      toast.error(message);
      return false;
    }
  };

  const bulkPost = async (year: number, month: number): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('inventory_depreciation_ledger')
        .update({
          is_posted: true,
          posted_at: new Date().toISOString(),
          posted_by: user?.id,
        })
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('is_posted', false);

      if (error) throw error;

      toast.success('All entries posted successfully');
      await fetchEntries();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to bulk post';
      toast.error(message);
      return false;
    }
  };

  // Calculate totals for a period
  const getPeriodTotals = (year: number, month: number) => {
    const periodEntries = entries.filter(
      e => e.period_year === year && e.period_month === month
    );
    
    return {
      totalDepreciation: periodEntries.reduce((sum, e) => sum + e.depreciation_amount, 0),
      postedCount: periodEntries.filter(e => e.is_posted).length,
      unpostedCount: periodEntries.filter(e => !e.is_posted).length,
      totalEntries: periodEntries.length,
    };
  };

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
    generateMonthlyEntries,
    postEntry,
    unpostEntry,
    bulkPost,
    getPeriodTotals,
  };
}
