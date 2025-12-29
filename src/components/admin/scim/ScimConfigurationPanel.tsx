import { useState } from "react";
import { Shield, Key, Copy, RefreshCw, Eye, EyeOff, Trash2, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface ScimToken {
  id: string;
  company_id: string;
  token_prefix: string;
  name: string;
  description: string | null;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ScimLog {
  id: string;
  operation: string;
  resource_type: string;
  resource_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  ip_address: string | null;
}

export const ScimConfigurationPanel = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenDescription, setNewTokenDescription] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const queryClient = useQueryClient();

  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['scim-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scim_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScimToken[];
    },
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['scim-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scim_provisioning_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ScimLog[];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ['scim-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scim_groups')
        .select('*, scim_user_group_memberships(count)')
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      // Generate a random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const prefix = token.substring(0, 8);

      // Hash the token
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('scim_tokens').insert({
        name,
        description,
        token_hash: hashHex,
        token_prefix: prefix,
        created_by: user?.id,
        scopes: ['users:read', 'users:write', 'groups:read', 'groups:write'],
      });

      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      setGeneratedToken(token);
      queryClient.invalidateQueries({ queryKey: ['scim-tokens'] });
      toast.success("SCIM token created");
    },
    onError: () => {
      toast.error("Failed to create SCIM token");
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scim_tokens')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scim-tokens'] });
      toast.success("Token revoked");
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scim_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scim-tokens'] });
      toast.success("Token deleted");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const scimBaseUrl = `${window.location.origin}/functions/v1`;

  const isLoading = tokensLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SCIM 2.0 Provisioning</h2>
          <p className="text-muted-foreground">Configure automated user provisioning from your identity provider</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Shield className="h-4 w-4 mr-1" />
          SCIM 2.0 Compliant
        </Badge>
      </div>

      {/* Setup Instructions */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Identity Provider Setup:</strong> Use the SCIM endpoints below to configure Okta, Azure AD, OneLogin, or other SCIM-compatible identity providers.
        </AlertDescription>
      </Alert>

      {/* Endpoint Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">SCIM Endpoints</CardTitle>
          <CardDescription>Configure these URLs in your identity provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Base URL</Label>
            <div className="flex gap-2">
              <Input value={scimBaseUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(scimBaseUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Users Endpoint</Label>
              <div className="flex gap-2">
                <Input value={`${scimBaseUrl}/scim-users`} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${scimBaseUrl}/scim-users`)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Groups Endpoint</Label>
              <div className="flex gap-2">
                <Input value={`${scimBaseUrl}/scim-groups`} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${scimBaseUrl}/scim-groups`)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tokens">
        <TabsList>
          <TabsTrigger value="tokens">API Tokens</TabsTrigger>
          <TabsTrigger value="groups">Groups ({groups?.length || 0})</TabsTrigger>
          <TabsTrigger value="logs">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">SCIM Tokens</CardTitle>
                  <CardDescription>Bearer tokens for IdP authentication</CardDescription>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Token
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create SCIM Token</DialogTitle>
                    </DialogHeader>
                    {generatedToken ? (
                      <div className="space-y-4 py-4">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Copy this token now. It won't be shown again.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label>Token</Label>
                          <div className="flex gap-2">
                            <Input
                              value={showToken ? generatedToken : '•'.repeat(32)}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedToken)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => {
                            setGeneratedToken(null);
                            setShowCreateDialog(false);
                            setNewTokenName("");
                            setNewTokenDescription("");
                          }}>
                            Done
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Token Name</Label>
                          <Input
                            value={newTokenName}
                            onChange={(e) => setNewTokenName(e.target.value)}
                            placeholder="e.g., Okta Production"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Input
                            value={newTokenDescription}
                            onChange={(e) => setNewTokenDescription(e.target.value)}
                            placeholder="e.g., Used for Okta SCIM integration"
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => createTokenMutation.mutate({ 
                              name: newTokenName, 
                              description: newTokenDescription 
                            })}
                            disabled={!newTokenName || createTokenMutation.isPending}
                          >
                            {createTokenMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Key className="h-4 w-4 mr-2" />
                            )}
                            Generate Token
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens?.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{token.name}</div>
                          {token.description && (
                            <div className="text-xs text-muted-foreground">{token.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{token.token_prefix}...</TableCell>
                      <TableCell>
                        <Badge variant={token.is_active ? "secondary" : "destructive"}>
                          {token.is_active ? "Active" : "Revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {token.last_used_at
                          ? format(new Date(token.last_used_at), 'MMM d, HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(token.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {token.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeTokenMutation.mutate(token.id)}
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteTokenMutation.mutate(token.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tokens?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No SCIM tokens configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Synced Groups</CardTitle>
              <CardDescription>Groups provisioned from your identity provider</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups?.map((group: any) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.display_name}</TableCell>
                      <TableCell className="font-mono text-sm">{group.external_id}</TableCell>
                      <TableCell className="text-right">{group.members_count}</TableCell>
                      <TableCell>
                        {format(new Date(group.updated_at), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {groups?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No groups synced yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Provisioning Activity</CardTitle>
              <CardDescription>Recent SCIM operations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline">{log.operation}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.resource_type}
                          {log.resource_id && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({log.resource_id.substring(0, 8)}...)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No provisioning activity yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
