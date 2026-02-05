import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Plus, Shield, Globe, CheckCircle, Loader2 } from 'lucide-react';

interface DomainManagementPanelProps {
  companyId: string;
  canManage: boolean;
}

interface DomainSetting {
  id: string;
  domain: string;
  is_enabled: boolean;
  auto_provision_users: boolean;
  default_role: string;
  require_admin_approval: boolean;
  allow_google_oauth: boolean;
}

export const DomainManagementPanel = ({ companyId, canManage }: DomainManagementPanelProps) => {
  const [domains, setDomains] = useState<DomainSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [companyId]);

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_domain_settings')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Failed to load domain settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Domain name is required');
      return;
    }

    setAddingDomain(true);
    try {
      const { error } = await supabase
        .from('organization_domain_settings')
        .insert({
          company_id: companyId,
          domain: newDomain.toLowerCase(),
          is_enabled: true,
          auto_provision_users: false,
          default_role: 'viewer',
          require_admin_approval: true,
          allow_google_oauth: true,
        });

      if (error) throw error;
      
      toast.success('Domain added successfully');
      setNewDomain('');
      fetchDomains();
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;

    try {
      const { error } = await supabase
        .from('organization_domain_settings')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      
      toast.success('Domain removed');
      fetchDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Failed to remove domain');
    }
  };

  const handleToggleSetting = async (domainId: string, setting: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('organization_domain_settings')
        .update({ [setting]: value })
        .eq('id', domainId);

      if (error) throw error;
      
      fetchDomains();
    } catch (error) {
      console.error('Error updating domain setting:', error);
      toast.error('Failed to update setting');
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Organization Domains</h3>
        <p className="text-sm text-muted-foreground">
          Configure domain-based SSO and auto-provisioning for your organization
        </p>
      </div>

      {canManage && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Domain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-domain">Domain Name</Label>
              <div className="flex gap-2">
                <Input
                  id="new-domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g., acme.com"
                  disabled={addingDomain}
                />
                <Button 
                  onClick={handleAddDomain} 
                  disabled={addingDomain || !newDomain.trim()}
                  size="sm"
                >
                  {addingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {domains.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">No domains configured</h3>
            <p className="text-sm text-muted-foreground">
              Add a domain to enable SSO and auto-provisioning
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <Card key={domain.id} className="border-2 border-foreground">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{domain.domain}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {domain.is_enabled ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3 text-muted-foreground" />
                            Disabled
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDomain(domain.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              {canManage && (
                <CardContent className="space-y-6 pt-0">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="provisioning">Provisioning</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`enabled-${domain.id}`} className="text-base">
                          Enable Domain
                        </Label>
                        <Switch
                          id={`enabled-${domain.id}`}
                          checked={domain.is_enabled}
                          onCheckedChange={(checked) =>
                            handleToggleSetting(domain.id, 'is_enabled', checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`google-oauth-${domain.id}`} className="text-base">
                          Allow Google OAuth
                        </Label>
                        <Switch
                          id={`google-oauth-${domain.id}`}
                          checked={domain.allow_google_oauth}
                          onCheckedChange={(checked) =>
                            handleToggleSetting(domain.id, 'allow_google_oauth', checked)
                          }
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="provisioning" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`auto-provision-${domain.id}`} className="text-base">
                          Auto-Provision Users
                        </Label>
                        <Switch
                          id={`auto-provision-${domain.id}`}
                          checked={domain.auto_provision_users}
                          onCheckedChange={(checked) =>
                            handleToggleSetting(domain.id, 'auto_provision_users', checked)
                          }
                        />
                      </div>

                      {domain.auto_provision_users && (
                        <div className="space-y-2">
                          <Label>Default Role for Auto-Provisioned Users</Label>
                          <select
                            value={domain.default_role}
                            onChange={(e) =>
                              handleToggleSetting(domain.id, 'default_role', e.target.value as any)
                            }
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`approval-${domain.id}`} className="text-base">
                          Require Admin Approval
                        </Label>
                        <Switch
                          id={`approval-${domain.id}`}
                          checked={domain.require_admin_approval}
                          onCheckedChange={(checked) =>
                            handleToggleSetting(domain.id, 'require_admin_approval', checked)
                          }
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
