import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SSOConnection {
  id: string;
  company_id: string;
  idp_type: string;
  idp_name: string;
  entity_id: string;
  sso_url: string;
  is_active: boolean;
  created_at: string;
}

export const SSOManagement = () => {
  const [connections, setConnections] = useState<SSOConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    idp_type: 'saml',
    idp_name: '',
    entity_id: '',
    sso_url: '',
    certificate: '',
    metadata_xml: '',
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sso_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error: unknown) {
      notify.error('Failed to Load SSO Connections', { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnection = async () => {
    try {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!member) throw new Error('No company association found');

      const { error } = await supabase
        .from('sso_connections')
        .insert({
          company_id: member.company_id,
          ...formData,
        });

      if (error) throw error;

      notify.success('SSO Connection Created', { description: 'The SSO connection has been configured successfully' });

      setDialogOpen(false);
      setFormData({
        idp_type: 'saml',
        idp_name: '',
        entity_id: '',
        sso_url: '',
        certificate: '',
        metadata_xml: '',
      });
      loadConnections();
    } catch (error: unknown) {
      notify.error('Failed to Create Connection', { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  const handleToggleConnection = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sso_connections')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      notify.success(isActive ? 'SSO Disabled' : 'SSO Enabled', { 
        description: `The SSO connection has been ${isActive ? 'disabled' : 'enabled'}` 
      });

      loadConnections();
    } catch (error: unknown) {
      notify.error('Failed to Update Connection', { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SSO connection?')) return;

    try {
      const { error } = await supabase
        .from('sso_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      notify.success('SSO Connection Deleted', { description: 'The SSO connection has been removed' });

      loadConnections();
    } catch (error: unknown) {
      notify.error('Failed to Delete Connection', { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Single Sign-On (SSO)
            </CardTitle>
            <CardDescription>
              Configure SAML and OAuth identity providers for enterprise authentication
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure SSO Connection</DialogTitle>
                <DialogDescription>
                  Set up a new identity provider for single sign-on authentication
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Identity Provider Type</Label>
                  <Select
                    value={formData.idp_type}
                    onValueChange={(value) => setFormData({ ...formData, idp_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saml">SAML 2.0</SelectItem>
                      <SelectItem value="oidc">OpenID Connect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Provider Name</Label>
                  <Input
                    placeholder="e.g., Okta, Azure AD, Google Workspace"
                    value={formData.idp_name}
                    onChange={(e) => setFormData({ ...formData, idp_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entity ID / Client ID</Label>
                  <Input
                    placeholder="https://your-domain.okta.com"
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>SSO URL / Authorization Endpoint</Label>
                  <Input
                    placeholder="https://your-domain.okta.com/app/app-id/sso/saml"
                    value={formData.sso_url}
                    onChange={(e) => setFormData({ ...formData, sso_url: e.target.value })}
                  />
                </div>

                {formData.idp_type === 'saml' && (
                  <>
                    <div className="space-y-2">
                      <Label>X.509 Certificate (Optional)</Label>
                      <Textarea
                        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                        value={formData.certificate}
                        onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>SAML Metadata XML (Optional)</Label>
                      <Textarea
                        placeholder="Paste SAML metadata XML here..."
                        value={formData.metadata_xml}
                        onChange={(e) => setFormData({ ...formData, metadata_xml: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateConnection}>Create Connection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading connections...</div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No SSO connections configured. Click "Add Connection" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{connection.idp_name}</h4>
                    <Badge variant={connection.is_active ? 'default' : 'secondary'}>
                      {connection.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {connection.idp_type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{connection.entity_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleConnection(connection.id, connection.is_active)}
                  >
                    {connection.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteConnection(connection.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
