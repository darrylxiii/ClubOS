import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';

interface FieldPermission {
  field_name: string;
  can_view: boolean;
  can_edit: boolean;
  requires_approval: boolean;
}

export function useFieldPermissions() {
  const { currentRole: role } = useRole();
  const [permissions, setPermissions] = useState<Map<string, FieldPermission>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [role]);

  const loadPermissions = async () => {
    if (!role) return;

    try {
      const { data, error } = await (supabase as any)
        .from('candidate_field_permissions')
        .select('*')
        .eq('role', role);

      if (error) throw error;

      const permMap = new Map<string, FieldPermission>();
      data?.forEach((perm: FieldPermission) => {
        permMap.set(perm.field_name, perm);
      });

      setPermissions(permMap);
    } catch (error) {
      console.error('Error loading field permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const canViewField = (fieldName: string): boolean => {
    const perm = permissions.get(fieldName);
    return perm?.can_view ?? false;
  };

  const canEditField = (fieldName: string): boolean => {
    const perm = permissions.get(fieldName);
    return perm?.can_edit ?? false;
  };

  const requiresApproval = (fieldName: string): boolean => {
    const perm = permissions.get(fieldName);
    return perm?.requires_approval ?? false;
  };

  const getEditableFields = (): string[] => {
    return Array.from(permissions.entries())
      .filter(([_, perm]) => perm.can_edit)
      .map(([fieldName]) => fieldName);
  };

  return {
    permissions,
    loading,
    canViewField,
    canEditField,
    requiresApproval,
    getEditableFields,
  };
}
