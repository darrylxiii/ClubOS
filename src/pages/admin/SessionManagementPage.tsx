import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Globe, LogOut, Shield, Clock, Users } from "lucide-react";
import { toast } from "sonner";

interface ActiveSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  country: string;
  logged_in_at: string;
  last_active_at: string;
  is_current: boolean;
}

interface SessionPolicy {
  id: string;
  role: string;
  max_concurrent_sessions: number;
  session_timeout_minutes: number;
  require_mfa: boolean;
  idle_timeout_minutes: number;
}

export default function SessionManagementPage() {
  const { t } = useTranslation('admin');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [policies, setPolicies] = useState<SessionPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [sRes, pRes] = await Promise.all([
      supabase.from("active_sessions_log").select("*").order("last_active_at", { ascending: false }).limit(100),
      supabase.from("session_policies").select("*").order("role"),
    ]);
    if (sRes.data) setSessions(sRes.data);
    if (pRes.data) setPolicies(pRes.data);
    setLoading(false);
  };

  const terminateSession = async (id: string) => {
    await supabase.from("active_sessions_log").delete().eq("id", id);
    toast.success(t('sessionManagement.sessionTerminated'));
    fetchData();
  };

  const terminateAllForUser = async (userId: string) => {
    await supabase.from("active_sessions_log").delete().eq("user_id", userId);
    toast.success(t('sessionManagement.allSessionsTerminated'));
    fetchData();
  };

  const updatePolicy = async (id: string, field: string, value: number | boolean) => {
    await supabase.from("session_policies").update({ [field]: value }).eq("id", id);
    toast.success(t('sessionManagement.policyUpdated'));
    fetchData();
  };

  const deviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;
  const mobileCount = sessions.filter(s => s.device_type === "mobile").length;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Monitor className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{t('sessionManagement.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('sessionManagement.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('sessionManagement.activeSessions')}</CardDescription><CardTitle className="text-2xl">{sessions.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('sessionManagement.uniqueUsers')}</CardDescription><CardTitle className="text-2xl">{uniqueUsers}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('sessionManagement.mobileSessions')}</CardDescription><CardTitle className="text-2xl">{mobileCount}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('sessionManagement.policiesActive')}</CardDescription><CardTitle className="text-2xl">{policies.length}</CardTitle></CardHeader></Card>
        </div>

        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions">{t('sessionManagement.activeSessions')}</TabsTrigger>
            <TabsTrigger value="policies">{t('sessionManagement.sessionPolicies')}</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {sessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('sessionManagement.noSessions')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('sessionManagement.device')}</TableHead>
                        <TableHead>{t('sessionManagement.user')}</TableHead>
                        <TableHead>{t('sessionManagement.ipAddress')}</TableHead>
                        <TableHead>{t('sessionManagement.country')}</TableHead>
                        <TableHead>{t('sessionManagement.loggedIn')}</TableHead>
                        <TableHead>{t('sessionManagement.lastActive')}</TableHead>
                        <TableHead>{t('sessionManagement.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {deviceIcon(s.device_type)}
                              <span className="text-xs text-muted-foreground max-w-[150px] truncate">{s.user_agent}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-sm">{s.ip_address}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span className="text-sm">{s.country || t('sessionManagement.unknown')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(s.logged_in_at).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{new Date(s.last_active_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => terminateSession(s.id)} title={t('sessionManagement.terminateSession')}>
                                <LogOut className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => terminateAllForUser(s.user_id)} title={t('sessionManagement.terminateAllForUser')}>
                                <Users className="h-3 w-3" />
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
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('sessionManagement.perRolePolicies')}</CardTitle>
                <CardDescription>Configure max concurrent sessions, timeouts, and MFA requirements per role (SOC2 CC6.1)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('sessionManagement.role')}</TableHead>
                      <TableHead>{t('sessionManagement.maxConcurrent')}</TableHead>
                      <TableHead>{t('sessionManagement.sessionTimeout')}</TableHead>
                      <TableHead>{t('sessionManagement.idleTimeout')}</TableHead>
                      <TableHead>{t('sessionManagement.requireMFA')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="outline" className="capitalize">{p.role}</Badge></TableCell>
                        <TableCell>
                          <Input type="number" className="w-20" value={p.max_concurrent_sessions} onChange={e => updatePolicy(p.id, "max_concurrent_sessions", parseInt(e.target.value) || 1)} min={1} max={20} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-24" value={p.session_timeout_minutes} onChange={e => updatePolicy(p.id, "session_timeout_minutes", parseInt(e.target.value) || 60)} min={15} max={10080} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-24" value={p.idle_timeout_minutes} onChange={e => updatePolicy(p.id, "idle_timeout_minutes", parseInt(e.target.value) || 30)} min={5} max={1440} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.require_mfa ? "default" : "secondary"} className="cursor-pointer" onClick={() => updatePolicy(p.id, "require_mfa", !p.require_mfa)}>
                            {p.require_mfa ? t('sessionManagement.required') : t('sessionManagement.optional')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {policies.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('sessionManagement.noPolicies')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
