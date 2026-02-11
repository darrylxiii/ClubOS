import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Department, STANDARD_DEPARTMENTS } from '@/types/organization';
import { toast } from 'sonner';

export function useDepartments(companyId: string | null) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadDepartments();
    }
  }, [companyId]);

  const loadDepartments = async () => {
    if (!companyId) return;

    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('company_departments')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setDepartments(data || []);
    } catch (error: unknown) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (
    name: string,
    departmentType: 'core' | 'support' | 'leadership',
    options: {
      description?: string;
      colorHex?: string;
      iconName?: string;
      parentDepartmentId?: string | null;
    } = {}
  ) => {
    if (!companyId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('company_departments')
        .insert({
          company_id: companyId,
          name,
          department_type: departmentType,
          description: options.description,
          color_hex: options.colorHex || '#C9A24E',
          icon_name: options.iconName || 'Users',
          parent_department_id: options.parentDepartmentId,
          display_order: departments.length,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Department "${name}" created`);
      await loadDepartments();
      return data;
    } catch (error: unknown) {
      console.error('Error creating department:', error);
      toast.error('Failed to create department');
      throw error;
    }
  };

  const updateDepartment = async (
    departmentId: string,
    updates: Partial<Department>
  ) => {
    try {
      const { error } = await (supabase as any)
        .from('company_departments')
        .update(updates)
        .eq('id', departmentId);

      if (error) throw error;

      toast.success('Department updated');
      await loadDepartments();
    } catch (error: unknown) {
      console.error('Error updating department:', error);
      toast.error('Failed to update department');
    }
  };

  const deleteDepartment = async (departmentId: string) => {
    try {
      // Soft delete - mark as inactive
      const { error } = await (supabase as any)
        .from('company_departments')
        .update({ is_active: false })
        .eq('id', departmentId);

      if (error) throw error;

      toast.success('Department archived');
      await loadDepartments();
    } catch (error: unknown) {
      console.error('Error deleting department:', error);
      toast.error('Failed to archive department');
    }
  };

  const seedStandardDepartments = async () => {
    if (!companyId) return;

    try {
      const departmentsToCreate = STANDARD_DEPARTMENTS.map((dept, index) => ({
        company_id: companyId,
        name: dept.name,
        department_type: dept.type,
        color_hex: dept.color,
        icon_name: dept.icon,
        display_order: dept.order,
        is_active: true,
      }));

      const { error } = await (supabase as any)
        .from('company_departments')
        .insert(departmentsToCreate);

      if (error) throw error;

      toast.success('Standard departments created');
      await loadDepartments();
    } catch (error: unknown) {
      console.error('Error seeding departments:', error);
      toast.error('Failed to create standard departments');
    }
  };

  return {
    departments,
    loading,
    refresh: loadDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    seedStandardDepartments,
  };
}
