import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type AssetStatus = Database['public']['Enums']['inventory_asset_status'];
export type AssetCategory = Database['public']['Enums']['inventory_category'];
export type AssetType = Database['public']['Enums']['inventory_asset_type'];

export interface InventoryAsset {
  id: string;
  inventory_number: string;
  asset_name: string;
  description: string | null;
  category: AssetCategory;
  asset_type: AssetType;
  purchase_date: string;
  purchase_value_excl_vat: number;
  vat_amount: number | null;
  total_purchase_value: number | null;
  useful_life_years: number;
  residual_value: number | null;
  annual_depreciation: number | null;
  monthly_depreciation: number | null;
  accumulated_depreciation: number | null;
  current_book_value: number | null;
  status: AssetStatus | null;
  supplier: string | null;
  invoice_reference: string | null;
  invoice_file_url: string | null;
  cost_center: string | null;
  assigned_to: string | null;
  notes: string | null;
  kia_eligible: boolean | null;
  depreciation_start_date: string | null;
  depreciation_end_date: string | null;
  capitalization_date: string | null;
  disposed_at: string | null;
  disposal_reason: string | null;
  disposal_value: number | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface AssetFormData {
  asset_name: string;
  description?: string;
  category: AssetCategory;
  asset_type: AssetType;
  purchase_date: string;
  purchase_value_excl_vat: number;
  vat_amount?: number;
  useful_life_years: number;
  residual_value?: number;
  supplier?: string;
  invoice_reference?: string;
  invoice_file_url?: string;
  cost_center?: string;
  assigned_to?: string;
  notes?: string;
  kia_eligible: boolean;
}

interface UseInventoryAssetsFilters {
  category?: AssetCategory;
  status?: AssetStatus;
  assetType?: AssetType;
  search?: string;
  costCenter?: string;
}

export function useInventoryAssets(filters?: UseInventoryAssetsFilters) {
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('inventory_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assetType) {
        query = query.eq('asset_type', filters.assetType);
      }
      if (filters?.costCenter) {
        query = query.eq('cost_center', filters.costCenter);
      }
      if (filters?.search) {
        query = query.or(`asset_name.ilike.%${filters.search}%,inventory_number.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAssets((data || []) as InventoryAsset[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assets';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters?.category, filters?.status, filters?.assetType, filters?.costCenter, filters?.search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const createAsset = async (data: AssetFormData): Promise<InventoryAsset | null> => {
    try {
      // Generate inventory number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('inventory_assets')
        .select('*', { count: 'exact', head: true });
      
      const nextNum = ((count || 0) + 1).toString().padStart(4, '0');
      const inventoryNumber = `TQC-${year}-${nextNum}`;

      const { data: newAsset, error } = await supabase
        .from('inventory_assets')
        .insert({
          inventory_number: inventoryNumber,
          asset_name: data.asset_name,
          description: data.description || null,
          category: data.category,
          asset_type: data.asset_type,
          purchase_date: data.purchase_date,
          purchase_value_excl_vat: data.purchase_value_excl_vat,
          vat_amount: data.vat_amount || 0,
          useful_life_years: data.useful_life_years,
          residual_value: data.residual_value || 0,
          status: 'active',
          supplier: data.supplier || null,
          invoice_reference: data.invoice_reference || null,
          invoice_file_url: data.invoice_file_url || null,
          cost_center: data.cost_center || null,
          assigned_to: data.assigned_to || null,
          notes: data.notes || null,
          kia_eligible: data.kia_eligible,
          depreciation_start_date: data.purchase_date,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Asset created successfully');
      await fetchAssets();
      return newAsset as InventoryAsset;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create asset';
      toast.error(message);
      return null;
    }
  };

  const updateAsset = async (id: string, data: Partial<AssetFormData>): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = { ...data };

      // Recalculate depreciation if relevant fields changed
      if (data.purchase_value_excl_vat !== undefined || 
          data.vat_amount !== undefined ||
          data.useful_life_years !== undefined || 
          data.residual_value !== undefined) {
        const asset = assets.find(a => a.id === id);
        if (asset) {
          const purchaseValue = data.purchase_value_excl_vat ?? asset.purchase_value_excl_vat;
          const vatAmount = data.vat_amount ?? (asset.vat_amount || 0);
          const usefulLife = data.useful_life_years ?? asset.useful_life_years;
          const residualValue = data.residual_value ?? (asset.residual_value || 0);

          // Remove computed fields — DB generates these automatically
          delete updates.total_purchase_value;
          delete updates.annual_depreciation;
          delete updates.monthly_depreciation;
          delete updates.accumulated_depreciation;
          delete updates.current_book_value;
        }
      }

      const { error } = await supabase
        .from('inventory_assets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Asset updated successfully');
      await fetchAssets();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update asset';
      toast.error(message);
      return false;
    }
  };

  const changeStatus = async (id: string, newStatus: AssetStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('inventory_assets')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Asset status changed to ${newStatus.replace('_', ' ')}`);
      await fetchAssets();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change status';
      toast.error(message);
      return false;
    }
  };

  return {
    assets,
    loading,
    error,
    refetch: fetchAssets,
    createAsset,
    updateAsset,
    changeStatus,
  };
}
