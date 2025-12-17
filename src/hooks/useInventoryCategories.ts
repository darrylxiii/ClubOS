import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryCategory {
  id: string;
  category_key: string;
  category_name: string;
  category_name_nl: string | null;
  default_useful_life_years: number;
  depreciation_method: string;
  description: string | null;
  display_order: number | null;
  kia_eligible: boolean | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  it_hardware: 'IT Hardware',
  office_furniture: 'Office Furniture',
  software_purchased: 'Software (Purchased)',
  software_developed: 'Software (Developed)',
  development_costs: 'Development Costs',
  other: 'Other',
};

export const INTANGIBLE_CATEGORIES = [
  'software_purchased',
  'software_developed', 
  'development_costs',
];

export function useInventoryCategories() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_categories')
          .select('*')
          .order('display_order');

        if (error) throw error;
        setCategories((data || []) as InventoryCategory[]);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getDefaultUsefulLife = (categoryKey: string): number => {
    const category = categories.find(c => c.category_key === categoryKey);
    return category?.default_useful_life_years || 5;
  };

  const getCategoryType = (categoryKey: string): 'tangible' | 'intangible' => {
    return INTANGIBLE_CATEGORIES.includes(categoryKey) ? 'intangible' : 'tangible';
  };

  const isKiaEligible = (categoryKey: string): boolean => {
    const category = categories.find(c => c.category_key === categoryKey);
    return category?.kia_eligible ?? true;
  };

  return {
    categories,
    loading,
    getDefaultUsefulLife,
    getCategoryType,
    isKiaEligible,
    categoryLabels: CATEGORY_LABELS,
    intangibleCategories: INTANGIBLE_CATEGORIES,
  };
}
