import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CompanyOffice {
  id: string;
  company_id: string;
  label: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  is_headquarters: boolean;
  created_at: string;
  created_by: string | null;
}

export interface AddOfficeParams {
  company_id: string;
  label: string;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  is_headquarters?: boolean;
}

export function useCompanyOffices(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["company-offices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_offices")
        .select("*")
        .eq("company_id", companyId)
        .order("is_headquarters", { ascending: false })
        .order("label", { ascending: true });

      if (error) throw error;
      return (data || []) as CompanyOffice[];
    },
    enabled: !!companyId,
  });
}

export function useAddCompanyOffice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: AddOfficeParams) => {
      const { data, error } = await supabase
        .from("company_offices")
        .insert({
          ...params,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CompanyOffice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-offices", data.company_id] });
      toast.success("Office location added");
    },
    onError: (error) => {
      console.error("Error adding office:", error);
      toast.error("Failed to add office location");
    },
  });
}

export function useUpdateCompanyOffice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyOffice> & { id: string }) => {
      const { data, error } = await supabase
        .from("company_offices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CompanyOffice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-offices", data.company_id] });
      toast.success("Office location updated");
    },
    onError: (error) => {
      console.error("Error updating office:", error);
      toast.error("Failed to update office location");
    },
  });
}

export function useDeleteCompanyOffice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from("company_offices")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-offices", data.companyId] });
      toast.success("Office location removed");
    },
    onError: (error) => {
      console.error("Error deleting office:", error);
      toast.error("Failed to remove office location");
    },
  });
}
