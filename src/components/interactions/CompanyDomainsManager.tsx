import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Mail } from "lucide-react";
import { toast } from "sonner";

interface CompanyDomainsManagerProps {
  companyId: string;
}

export function CompanyDomainsManager({
  companyId,
}: CompanyDomainsManagerProps) {
  const [newDomain, setNewDomain] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: domains, isLoading, error: domainsError } = useQuery({
    queryKey: ["company-domains", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_email_domains")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching domains:", error);
        throw error;
      }
      return data || [];
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async () => {
      const cleanDomain = newDomain
        .toLowerCase()
        .trim()
        .replace(/^@/, "");

      if (!cleanDomain) {
        throw new Error("Please enter a domain");
      }

      // Basic domain validation
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
      if (!domainRegex.test(cleanDomain)) {
        throw new Error("Please enter a valid domain (e.g., example.com)");
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("company_email_domains").insert({
        company_id: companyId,
        domain: cleanDomain,
        notes: newNotes || null,
        added_by: userData.user?.id,
      });

      if (error) {
        console.error("Error adding domain:", error);
        if (error.code === "23505") {
          throw new Error("This domain is already added for this company");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-domains", companyId] });
      setNewDomain("");
      setNewNotes("");
      toast.success("Domain added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add domain");
    },
  });

  const toggleDomainMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("company_email_domains")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) {
        console.error("Error toggling domain:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-domains", companyId] });
      toast.success("Domain status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update domain status");
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("company_email_domains")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting domain:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-domains", companyId] });
      toast.success("Domain deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete domain");
    },
  });

  const syncPartnerDomainsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('sync_existing_partner_domains');
      
      if (error) {
        console.error("Error syncing partner domains:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-domains", companyId] });
      const count = data?.length || 0;
      toast.success(count > 0 ? `Synced ${count} partner domain(s)` : "All partner domains are already tracked");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sync partner domains");
    },
  });

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5" />
              Tracked Email Domains
            </h3>
            <p className="text-sm text-muted-foreground">
              Add email domains to automatically track interactions with this company.
              Partner email domains are automatically synced.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncPartnerDomainsMutation.mutate()}
            disabled={syncPartnerDomainsMutation.isPending || isLoading}
          >
            {syncPartnerDomainsMutation.isPending ? "Syncing..." : "Sync Partners"}
          </Button>
        </div>

        {/* Add new domain */}
        <div className="flex gap-2">
          <Input
            placeholder="@example.com or example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => addDomainMutation.mutate()}
            disabled={!newDomain || addDomainMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Domain list */}
        {domainsError ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <p className="text-sm font-medium">Error loading domains</p>
            <p className="text-xs mt-1">{domainsError.message}</p>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading domains...</p>
        ) : domains && domains.length > 0 ? (
          <div className="space-y-2">
            {domains.map((domain: any) => (
              <div
                key={domain.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">@{domain.domain}</code>
                    <Badge variant={domain.is_active ? "default" : "secondary"}>
                      {domain.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {domain.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {domain.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleDomainMutation.mutate({
                        id: domain.id,
                        isActive: domain.is_active,
                      })
                    }
                  >
                    {domain.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDomainMutation.mutate(domain.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No domains configured yet. Add one above to start tracking emails.
          </p>
        )}

        {/* Forwarding email info */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-sm mb-2">Email Forwarding Address</h4>
          <div className="bg-muted/50 p-3 rounded-lg">
            <code className="text-sm">learn@thequantumclub.com</code>
            <p className="text-xs text-muted-foreground mt-2">
              Forward any company emails to this address to add them to the ML learning system.
              They'll be automatically matched to companies based on the configured domains above.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
