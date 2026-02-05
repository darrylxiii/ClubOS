import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Check, Clock, AlertCircle, Plus } from "lucide-react";
import { useCompanyDomains } from "@/hooks/useCompanyDomains";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PartnerDomainSettingsProps {
  companyId: string;
  canRequestDomains?: boolean;
}

export const PartnerDomainSettings = ({ companyId, canRequestDomains = true }: PartnerDomainSettingsProps) => {
  const { domains, allDomainSettings, loading, refetch } = useCompanyDomains(companyId);
  const { user } = useAuth();
  const [newDomain, setNewDomain] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const handleRequestDomain = async () => {
    if (!newDomain.trim() || !user) return;

    // Basic domain validation
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    if (!domainRegex.test(newDomain.trim())) {
      toast.error("Please enter a valid domain (e.g., example.com)");
      return;
    }

    setRequesting(true);
    try {
      // Check if domain already exists
      const { data: existing } = await supabase
        .from('organization_domain_settings')
        .select('id')
        .eq('company_id', companyId)
        .eq('domain', newDomain.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        toast.error("This domain is already configured");
        return;
      }

      // Create domain request (pending admin approval)
      const { error } = await supabase
        .from('organization_domain_settings')
        .insert({
          company_id: companyId,
          domain: newDomain.toLowerCase().trim(),
          is_enabled: false, // Pending approval
          auto_provision_users: false,
          require_admin_approval: true,
          created_by: user.id
        });

      if (error) throw error;

      toast.success("Domain request submitted for admin approval");
      setNewDomain("");
      setShowRequestForm(false);
      refetch();
    } catch (error) {
      console.error("Error requesting domain:", error);
      toast.error("Failed to submit domain request");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading domain settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <Globe className="w-5 h-5" />
          Authorized Domains
        </CardTitle>
        <CardDescription>
          Team members can only be invited from these email domains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No domains configured yet
            </p>
            <p className="text-xs text-muted-foreground">
              Contact your administrator to set up authorized domains
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allDomainSettings.map((setting) => (
              <div
                key={setting.domain}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-sm">@{setting.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  {setting.is_enabled ? (
                    <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-600/20">
                      <Check className="w-3 h-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-600/20">
                      <Clock className="w-3 h-3" />
                      Pending
                    </Badge>
                  )}
                  {setting.auto_provision_users && (
                    <Badge variant="secondary" className="text-xs">
                      Auto-provision
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Request new domain */}
        {canRequestDomains && (
          <div className="pt-4 border-t">
            {showRequestForm ? (
              <div className="space-y-3">
                <Label htmlFor="new-domain">Request New Domain</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="new-domain"
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button onClick={handleRequestDomain} disabled={requesting || !newDomain.trim()}>
                    {requesting ? "Submitting..." : "Submit"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Domain requests require admin approval before they become active
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRequestForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request Additional Domain
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
