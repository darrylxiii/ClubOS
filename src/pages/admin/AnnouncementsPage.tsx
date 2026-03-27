import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Megaphone, Plus, Trash2, Eye, EyeOff, Bell } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface Announcement {
  id: string;
  title: string;
  body: string;
  display_type: string;
  priority: string;
  target_roles: string[];
  is_dismissible: boolean;
  requires_acknowledgment: boolean;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary",
  normal: "outline",
  high: "default",
  critical: "destructive",
};

const ROLES = ["admin", "strategist", "partner", "user"];

export default function AnnouncementsPage() {
  const { t } = useTranslation('admin');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    display_type: "banner",
    priority: "normal",
    target_roles: [] as string[],
    is_dismissible: true,
    requires_acknowledgment: false,
    expires_at: "",
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("admin_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
    setLoading(false);
  };

  const createAnnouncement = async () => {
    const { error } = await supabase.from("admin_announcements").insert({
      title: form.title,
      body: form.body,
      display_type: form.display_type,
      priority: form.priority,
      target_roles: form.target_roles.length > 0 ? form.target_roles : ROLES,
      is_dismissible: form.is_dismissible,
      requires_acknowledgment: form.requires_acknowledgment,
      expires_at: form.expires_at || null,
    });
    if (!error) {
      toast.success('Announcement published');
      setDialogOpen(false);
      setForm({ title: "", body: "", display_type: "banner", priority: "normal", target_roles: [], is_dismissible: true, requires_acknowledgment: false, expires_at: "" });
      fetchAnnouncements();
    } else {
      toast.error('Failed to create announcement');
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("admin_announcements").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Announcement activated" : "Announcement deactivated");
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("admin_announcements").delete().eq("id", id);
    toast.success('Announcement deleted');
    fetchAnnouncements();
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('announcementsPage.title')}</h1>
            </div>
            <p className="text-muted-foreground">{'Broadcast messages to users across the platform'}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{'New Announcement'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{'Create Announcement'}</DialogTitle>
                <DialogDescription>{'This will be shown to targeted users in-app'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>{t('announcementsPage.text1')}</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder={'Announcement title'} /></div>
                <div><Label>{t('announcementsPage.text2')}</Label><Textarea value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))} placeholder={'Announcement message body...'} rows={4} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{'Display Type'}</Label>
                    <Select value={form.display_type} onValueChange={v => setForm(p => ({...p, display_type: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banner">{t('announcementsPage.text3')}</SelectItem>
                        <SelectItem value="modal">{t('announcementsPage.text4')}</SelectItem>
                        <SelectItem value="toast">{t('announcementsPage.text5')}</SelectItem>
                        <SelectItem value="page">{'Full Page'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('announcementsPage.text6')}</Label>
                    <Select value={form.priority} onValueChange={v => setForm(p => ({...p, priority: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('announcementsPage.text7')}</SelectItem>
                        <SelectItem value="normal">{t('announcementsPage.text8')}</SelectItem>
                        <SelectItem value="high">{t('announcementsPage.text9')}</SelectItem>
                        <SelectItem value="critical">{t('announcementsPage.text10')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{"Target Roles (empty = all)"}</Label>
                  <div className="flex gap-3 mt-2">
                    {ROLES.map(role => (
                      <label key={role} className="flex items-center gap-2">
                        <Checkbox checked={form.target_roles.includes(role)} onCheckedChange={() => toggleRole(role)} />
                        <span className="text-sm capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div><Label>{t('announcementsPage.text11')}</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({...p, expires_at: e.target.value}))} /></div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2"><Switch checked={form.is_dismissible} onCheckedChange={v => setForm(p => ({...p, is_dismissible: v}))} /><span className="text-sm">{t('announcementsPage.text12')}</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.requires_acknowledgment} onCheckedChange={v => setForm(p => ({...p, requires_acknowledgment: v}))} /><span className="text-sm">{'Require Acknowledgment'}</span></label>
                </div>
              </div>
              <DialogFooter><Button onClick={createAnnouncement} disabled={!form.title || !form.body}>{t('announcementsPage.text13')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('announcementsPage.text14')}</CardDescription><CardTitle className="text-2xl text-green-600">{announcements.filter(a => a.is_active).length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{'Total Published'}</CardDescription><CardTitle className="text-2xl">{announcements.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('announcementsPage.text15')}</CardDescription><CardTitle className="text-2xl text-red-600">{announcements.filter(a => a.priority === 'critical' && a.is_active).length}</CardTitle></CardHeader></Card>
        </div>

        {/* Announcements Table */}
        <Card>
          <CardHeader><CardTitle>{'All Announcements'}</CardTitle></CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{'No announcements yet'}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('announcementsPage.text16')}</TableHead>
                    <TableHead>{t('announcementsPage.text17')}</TableHead>
                    <TableHead>{t('announcementsPage.text18')}</TableHead>
                    <TableHead>{t('announcementsPage.text19')}</TableHead>
                    <TableHead>{t('announcementsPage.text20')}</TableHead>
                    <TableHead>{t('announcementsPage.text21')}</TableHead>
                    <TableHead>{t('announcementsPage.text22')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map(ann => (
                    <TableRow key={ann.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{ann.title}</TableCell>
                      <TableCell><Badge variant="secondary">{ann.display_type}</Badge></TableCell>
                      <TableCell><Badge variant={PRIORITY_COLORS[ann.priority] as any}>{ann.priority}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(ann.target_roles || []).map(r => (
                            <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ann.is_active ? "default" : "secondary"}>
                          {ann.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(ann.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(ann.id, !ann.is_active)}>
                            {ann.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAnnouncement(ann.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
