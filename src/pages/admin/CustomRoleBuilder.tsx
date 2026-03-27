import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Plus, Pencil, Trash2, Shield, Users, Save } from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  resource: string;
  action: string;
  display_name: string;
  description: string;
  category: string;
}

interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
}

export default function CustomRoleBuilder() {
  const { t } = useTranslation('admin');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [form, setForm] = useState({ name: "", display_name: "", description: "", permissions: {} as Record<string, boolean> });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [permRes, roleRes] = await Promise.all([
      supabase.from("permission_definitions").select("*").order("category, resource, action"),
      supabase.from("custom_roles").select("*").order("name"),
    ]);
    if (permRes.data) setPermissions(permRes.data);
    if (roleRes.data) setRoles(roleRes.data);
    setLoading(false);
  };

  const permissionsByCategory = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const togglePermission = (key: string) => {
    setForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const toggleCategory = (category: string, checked: boolean) => {
    const categoryPerms = permissionsByCategory[category] || [];
    setForm(prev => {
      const updated = { ...prev.permissions };
      categoryPerms.forEach(p => { updated[`${p.resource}.${p.action}`] = checked; });
      return { ...prev, permissions: updated };
    });
  };

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: "", display_name: "", description: "", permissions: {} });
    setDialogOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      permissions: role.permissions || {},
    });
    setDialogOpen(true);
  };

  const saveRole = async () => {
    const payload = {
      name: form.name.toLowerCase().replace(/\s+/g, '_'),
      display_name: form.display_name,
      description: form.description,
      permissions: form.permissions,
    };

    if (editingRole) {
      const { error } = await supabase.from("custom_roles").update(payload).eq("id", editingRole.id);
      if (error) { toast.error('Failed to update role'); return; }
      toast.success('Role updated');
    } else {
      const { error } = await supabase.from("custom_roles").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Role created');
    }
    setDialogOpen(false);
    fetchData();
  };

  const deleteRole = async (id: string) => {
    await supabase.from("custom_roles").delete().eq("id", id);
    toast.success('Role deleted');
    fetchData();
  };

  const getPermCount = (perms: Record<string, boolean>) =>
    Object.values(perms).filter(Boolean).length;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <KeyRound className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{'CUSTOM ROLE BUILDER'}</h1>
            </div>
            <p className="text-muted-foreground">{'Create custom roles with granular permission sets for your organization'}</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{'Create Role'}</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{'Custom Roles'}</CardDescription><CardTitle className="text-2xl">{roles.filter(r => !r.is_system).length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'System Roles'}</CardDescription><CardTitle className="text-2xl">{roles.filter(r => r.is_system).length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'Available Permissions'}</CardDescription><CardTitle className="text-2xl">{permissions.length}</CardTitle></CardHeader></Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{"Roles"}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"Role"}</TableHead>
                  <TableHead>{"Description"}</TableHead>
                  <TableHead>{"Permissions"}</TableHead>
                  <TableHead>{"Type"}</TableHead>
                  <TableHead>{"Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div><span className="font-medium">{role.display_name}</span><br /><span className="text-xs text-muted-foreground">{role.name}</span></div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{role.description}</TableCell>
                    <TableCell><Badge variant="secondary">{getPermCount(role.permissions)} permissions</Badge></TableCell>
                    <TableCell><Badge variant={role.is_system ? "default" : "outline"}>{role.is_system ? "System" : "Custom"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(role)}><Pencil className="h-3 w-3" /></Button>
                        {!role.is_system && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRole(role.id)}><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{'No custom roles created yet'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Create Custom Role"}</DialogTitle>
              <DialogDescription>{'Define the role name and select which permissions to grant'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{'Display Name'}</Label><Input value={form.display_name} onChange={e => setForm(p => ({...p, display_name: e.target.value}))} placeholder={'Junior Recruiter'} /></div>
                <div><Label>{'System Name'}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="junior_recruiter" /></div>
              </div>
              <div><Label>{"Description"}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder={'What can this role do?'} /></div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" />{"Permissions"}</h3>
                <Tabs defaultValue={Object.keys(permissionsByCategory)[0]}>
                  <TabsList className="flex-wrap h-auto">
                    {Object.keys(permissionsByCategory).map(cat => (
                      <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.entries(permissionsByCategory).map(([cat, perms]) => {
                    const allChecked = perms.every(p => form.permissions[`${p.resource}.${p.action}`]);
                    return (
                      <TabsContent key={cat} value={cat} className="space-y-3">
                        <label className="flex items-center gap-2 p-2 border rounded bg-muted/50">
                          <Checkbox checked={allChecked} onCheckedChange={(v) => toggleCategory(cat, !!v)} />
                          <span className="font-medium text-sm">Select all {cat}</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {perms.map(p => {
                            const key = `${p.resource}.${p.action}`;
                            return (
                              <label key={p.id} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/30 cursor-pointer">
                                <Checkbox checked={!!form.permissions[key]} onCheckedChange={() => togglePermission(key)} />
                                <div>
                                  <div className="text-sm font-medium">{p.display_name}</div>
                                  <div className="text-xs text-muted-foreground">{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>

              <div className="text-sm text-muted-foreground">
                {getPermCount(form.permissions)} permission(s) selected
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{"Cancel"}</Button>
              <Button onClick={saveRole} disabled={!form.display_name || !form.name}>
                <Save className="h-4 w-4 mr-2" />{editingRole ? "Update Role" : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}
