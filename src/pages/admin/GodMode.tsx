import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Users, Database, AlertTriangle, Search, Eye, RefreshCw, ToggleLeft, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Label } from '@/components/ui/label';

export default function GodMode() {
  const { t } = useTranslation('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: featureFlags, isLoading: flagsLoading, refetch: refetchFlags } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feature_flags').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: impersonationSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['impersonation-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_impersonation_sessions').select('*').order('started_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, role').or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`).limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2
  });

  const toggleFeatureFlag = async (flagId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase.from('feature_flags').update({ enabled: !currentValue }).eq('id', flagId);
      if (error) throw error;
      toast.success("Feature flag updated");
      refetchFlags();
    } catch (error) {
      toast.error("Failed to update feature flag");
    }
  };

  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('godMode.text1')}</AlertTitle>
        <AlertDescription>{t('godMode.text2')}</AlertDescription>
      </Alert>

      <Tabs defaultValue="feature-flags" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="feature-flags" className="gap-2"><ToggleLeft className="h-4 w-4" /><span className="hidden sm:inline">{t('godMode.text3')}</span></TabsTrigger>
          <TabsTrigger value="user-lookup" className="gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">{t('godMode.text4')}</span></TabsTrigger>
          <TabsTrigger value="impersonation" className="gap-2"><Eye className="h-4 w-4" /><span className="hidden sm:inline">{t('godMode.text5')}</span></TabsTrigger>
          <TabsTrigger value="database" className="gap-2"><Database className="h-4 w-4" /><span className="hidden sm:inline">{t('godMode.text6')}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="feature-flags">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ToggleLeft className="h-5 w-5" />{t('godMode.text7')}</CardTitle><CardDescription>{t('godMode.text8')}</CardDescription></CardHeader>
            <CardContent>
              {flagsLoading ? <div className="text-center py-8 text-muted-foreground">{t('godMode.text9')}</div> : featureFlags && featureFlags.length > 0 ? (
                <div className="space-y-4">
                  {featureFlags.map((flag: any) => (
                    <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div><p className="font-medium">{flag.name || flag.flag_key}</p><p className="text-sm text-muted-foreground">{flag.description || 'No description'}</p></div>
                      <Switch checked={flag.enabled} onCheckedChange={() => toggleFeatureFlag(flag.id, flag.enabled)} />
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={ToggleLeft} title={t('godMode.text10')} description={t('godMode.text11')} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-lookup">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t('godMode.text12')}</CardTitle><CardDescription>{t('godMode.text13')}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('godMode.text14')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
                {searchLoading && <div className="text-center py-4 text-muted-foreground">{t('godMode.text15')}</div>}
                {searchResults && searchResults.length > 0 ? (
                  <ScrollArea className="h-[300px]"><div className="space-y-2">
                    {searchResults.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                        <div><p className="font-medium">{user.full_name || 'No name'}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
                        <Badge variant="outline">{user.role || 'candidate'}</Badge>
                      </div>
                    ))}
                  </div></ScrollArea>
                ) : searchQuery.length >= 2 && !searchLoading ? <div className="text-center py-8 text-muted-foreground">{t('godMode.text16')}</div> : <div className="text-center py-8 text-muted-foreground">{t('godMode.text17')}</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impersonation">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />{t('godMode.text18')}</CardTitle><CardDescription>{t('godMode.text19')}</CardDescription></CardHeader>
            <CardContent>
              {sessionsLoading ? <div className="text-center py-8 text-muted-foreground">{t('godMode.text20')}</div> : impersonationSessions && impersonationSessions.length > 0 ? (
                <ScrollArea className="h-[400px]"><div className="space-y-3">
                  {impersonationSessions.map((session: any) => (
                    <div key={session.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2"><Badge variant={session.is_active ? 'default' : 'secondary'}>{session.is_active ? 'Active' : 'Ended'}</Badge><span className="text-sm text-muted-foreground">{new Date(session.started_at).toLocaleString()}</span></div>
                      <p className="text-sm">Admin: <span className="font-medium">{session.admin_id}</span></p>
                      <p className="text-sm">Target: <span className="font-medium">{session.target_user_id}</span></p>
                      {session.reason && <p className="text-sm text-muted-foreground mt-1">Reason: {session.reason}</p>}
                    </div>
                  ))}
                </div></ScrollArea>
              ) : <EmptyState icon={Eye} title={t('godMode.text21')} description={t('godMode.text22')} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />{t('godMode.text23')}</CardTitle><CardDescription>{t('godMode.text24')}</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3 mb-4"><RefreshCw className="h-5 w-5 text-primary" /><div><p className="font-medium">{t('godMode.text25')}</p><p className="text-sm text-muted-foreground">{t('godMode.text26')}</p></div></div><Button variant="outline" className="w-full" onClick={() => toast.info("Cache cleared")}>{t('godMode.text27')}</Button></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3 mb-4"><Lock className="h-5 w-5 text-primary" /><div><p className="font-medium">{t('godMode.text28')}</p><p className="text-sm text-muted-foreground">{t('godMode.text29')}</p></div></div><Button variant="destructive" className="w-full" onClick={() => toast.warning("This action requires confirmation")}>{t('godMode.text30')}</Button></CardContent></Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
