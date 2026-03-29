import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Shield, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permissions: string[];
  rate_limit: number;
  expires_at: string;
  is_active: boolean;
  last_used_at: string;
  usage_count: number;
  created_at: string;
  created_by: string;
}

const PERMISSIONS = ["read:candidates", "write:candidates", "read:jobs", "write:jobs", "read:applications", "write:applications", "read:analytics", "admin:all"];

export default function APIKeyManagement() {
  const { t } = useTranslation("admin");
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ name: "", permissions: ["read:candidates"] as string[], rate_limit: 1000, expires_days: 90 });

  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    if (data) setKeys(data);
    setLoading(false);
  };

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "tqc_";
    for (let i = 0; i < 48; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const createKey = async () => {
    const key = generateKey();
    const prefix = key.slice(0, 8);
    // Simple hash for storage (in production, use proper server-side hashing)
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const user = (await supabase.auth.getUser()).data.user;
    const expiresAt = new Date(Date.now() + form.expires_days * 86400000).toISOString();

    const { error } = await supabase.from("api_keys").insert({
      name: form.name, key_prefix: prefix, key_hash: hashHex,
      permissions: form.permissions, rate_limit: form.rate_limit,
      expires_at: expiresAt, is_active: true, created_by: user?.id, usage_count: 0,
    });
    if (!error) {
      setNewKeyValue(key);
      setDialogOpen(false);
      setShowKeyDialog(true);
      setForm({ name: "", permissions: ["read:candidates"], rate_limit: 1000, expires_days: 90 });
      fetchKeys();
    }
  };

  const revokeKey = (id: string, keyName: string) => {
    confirm(
      {
        type: "destructive",
        title: t("apiKeys.revokeKey", "Revoke API Key"),
        description: t("apiKeys.revokeConfirm", "Are you sure you want to revoke the API key '){{name}}\"? Any integrations using this key will immediately lose access. This action cannot be undone.", { name: keyName }),
        confirmText: t("apiKeys.revokeKeyBtn", "Revoke Key"),
      },
      async () => {
        await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
        toast.success(t("apiKeys.keyRevoked", "API key revoked"));
        fetchKeys();
      }
    );
  };

  const deleteKey = (id: string, keyName: string) => {
    confirm(
      {
        type: "delete",
        title: t("apiKeys.deleteKey", "Delete API Key"),
        description: t("apiKeys.deleteConfirm", "Are you sure you want to permanently delete the API key '){{name}}\"? This will remove all usage history and cannot be recovered.", { name: keyName }),
        confirmText: t("apiKeys.deleteKeyBtn", "Delete Key"),
      },
      async () => {
        await supabase.from("api_keys").delete().eq("id", id);
        toast.success(t("apiKeys.keyDeleted", "API key deleted"));
        fetchKeys();
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("actions.copied", "Copied to clipboard"));
  };

  const activeKeys = keys.filter(k => k.is_active).length;
  const expiringSoon = keys.filter(k => {
    if (!k.expires_at || !k.is_active) return false;
    const daysLeft = (new Date(k.expires_at).getTime() - Date.now()) / 86400000;
    return daysLeft < 14 && daysLeft > 0;
  }).length;

  const togglePermission = (perm: string) => {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(perm)
        ? p.permissions.filter(pp => pp !== perm)
        : [...p.permissions, perm],
    }));
  };

  const filteredKeys = keys.filter(k => {
    if (!searchQuery) return true;
    return k.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t("apiKeys.title", "API KEY MANAGEMENT")}</h1>
            </div>
            <p className="text-muted-foreground">{t("apiKeys.subtitle", "Create, manage, and revoke API keys for programmatic access")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t("apiKeys.createKey", "Create API Key")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("apiKeys.createNewKey", "Create New API Key")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>{t("apiKeys.keyName", "Key Name")}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t("apiKeys.keyNamePlaceholder", "Production Integration")} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>{t("apiKeys.rateLimit", "Rate Limit (req/hour)")}</Label><Input type="number" value={form.rate_limit} onChange={e => setForm(p => ({...p, rate_limit: Number(e.target.value)}))} /></div>
                  <div>
                    <Label>{t("apiKeys.expiresIn", "Expires In")}</Label>
                    <Select value={String(form.expires_days)} onValueChange={v => setForm(p => ({...p, expires_days: Number(v)}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">{t("30_days", "30 days")}</SelectItem>
                        <SelectItem value="90">{t("90_days", "90 days")}</SelectItem>
                        <SelectItem value="180">{t("6_months", "6 months")}</SelectItem>
                        <SelectItem value="365">{t("1_year", "1 year")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t("apiKeys.permissions", "Permissions")}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PERMISSIONS.map(perm => (
                      <Button key={perm} size="sm" variant={form.permissions.includes(perm) ? "default" : "outline"} className="justify-start text-xs" onClick={() => togglePermission(perm)}>
                        <Shield className="h-3 w-3 mr-1" />{perm}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={createKey} disabled={!form.name || form.permissions.length === 0}>{t("apiKeys.createKeyBtn", "Create Key")}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Key Created Dialog */}
        <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("apiKeys.keyCreated", "API Key Created")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{t("apiKeys.copyKeyWarning", "Copy this key now -- it won't be shown again")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-black p-2 rounded text-xs font-mono break-all border">{newKeyValue}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(newKeyValue)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={() => setShowKeyDialog(false)}>{t("actions.done", "Done")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardHeader className="pb-2"><Skeleton variant="text" className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t("apiKeys.totalKeys", "Total Keys")}</CardDescription><CardTitle className="text-2xl">{keys.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t("apiKeys.active", "Active")}</CardDescription><CardTitle className="text-2xl text-green-600">{activeKeys}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t("apiKeys.revoked", "Revoked")}</CardDescription><CardTitle className="text-2xl">{keys.length - activeKeys}</CardTitle></CardHeader></Card>
            <Card className={expiringSoon > 0 ? "border-amber-500/50" : ""}><CardHeader className="pb-2"><CardDescription>{t("apiKeys.expiringSoon", "Expiring Soon")}</CardDescription><CardTitle className="text-2xl text-amber-600">{expiringSoon}</CardTitle></CardHeader></Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("apiKeys.apiKeys", "API Keys")}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t("apiKeys.searchPlaceholder", "Search by key name...")}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <Skeleton variant="text" className="h-5 w-40" />
                    <Skeleton variant="text" className="h-5 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton variant="text" className="h-5 w-16" />
                    <Skeleton variant="text" className="h-5 w-12" />
                    <Skeleton variant="text" className="h-5 w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredKeys.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                {keys.length === 0 ? t("apiKeys.noKeysCreated", "No API keys created. Create one to enable programmatic access.") : t("apiKeys.noKeysMatch", "No API keys match your search.")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("apiKeys.name", "Name")}</TableHead>
                    <TableHead>{t("apiKeys.key", "Key")}</TableHead>
                    <TableHead>{t("apiKeys.permissions", "Permissions")}</TableHead>
                    <TableHead>{t("apiKeys.rateLimitCol", "Rate Limit")}</TableHead>
                    <TableHead>{t("apiKeys.usage", "Usage")}</TableHead>
                    <TableHead>{t("apiKeys.expires", "Expires")}</TableHead>
                    <TableHead>{t("status.title", "Status")}</TableHead>
                    <TableHead>{t("actions.title", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map(k => {
                    const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
                    const daysLeft = k.expires_at ? Math.round((new Date(k.expires_at).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="font-mono text-xs">{k.key_prefix}--------</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(k.permissions || []).slice(0, 2).map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                            {(k.permissions || []).length > 2 && <Badge variant="secondary" className="text-xs">+{k.permissions.length - 2}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{k.rate_limit}/hr</TableCell>
                        <TableCell>{k.usage_count || 0}</TableCell>
                        <TableCell>
                          {isExpired ? <Badge variant="destructive">{t("expired", "Expired")}</Badge> :
                           daysLeft !== null && daysLeft < 14 ? <Badge className="bg-amber-500">{daysLeft}d left</Badge> :
                           daysLeft !== null ? <span className="text-sm">{daysLeft}d</span> : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={k.is_active && !isExpired ? "default" : "destructive"}>
                            {!k.is_active ? "Revoked" : isExpired ? "Expired" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {k.is_active && <Button size="sm" variant="outline" onClick={() => revokeKey(k.id, k.name)}>{t("apiKeys.revoke", "Revoke")}</Button>}
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteKey(k.id, k.name)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}
