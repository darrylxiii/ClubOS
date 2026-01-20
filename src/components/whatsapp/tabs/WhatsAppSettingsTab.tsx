import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';
import { 
  MessageSquare, Shield, RefreshCw, ExternalLink, Copy, CheckCircle, 
  AlertCircle, Key, Globe, Loader2, Users, Wifi, WifiOff, Clock,
  ShieldCheck, Activity, Stethoscope, AlertTriangle, CheckCircle2, XCircle, LogIn
} from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  phone_number_id: string;
  business_account_id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  is_active?: boolean;
  is_primary?: boolean;
  verification_status?: string;
  last_verified_at?: string;
  account_label?: string;
}

interface DiagnosticsResult {
  overall_status: string;
  diagnostics: {
    request_id: string;
    timestamp: string;
    checks: {
      auth: { ok: boolean; user_id?: string; role?: string; error?: string; code?: string };
      secrets: { ok: boolean; missing?: string[]; skipped?: string };
      meta_api: { ok: boolean; phone_number?: string; verified_name?: string; error?: string; skipped?: string };
      database: { ok: boolean; accounts_count?: number; error?: string; skipped?: string };
    };
  };
}

/**
 * Ensures we have a valid session, refreshing if needed
 * Returns the session or throws an error with redirect flag
 */
async function ensureValidSession(navigate: ReturnType<typeof useNavigate>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('[WhatsApp] Session error:', sessionError);
    throw new Error('SESSION_ERROR');
  }
  
  if (!sessionData.session) {
    // Try to refresh
    console.log('[WhatsApp] No session, attempting refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      console.error('[WhatsApp] Refresh failed:', refreshError);
      // Auto-redirect on expired session
      notify.error('Session expired', {
        description: 'Redirecting to sign in...',
        action: { label: 'Sign In Now', onClick: () => navigate('/auth') }
      });
      setTimeout(() => navigate('/auth'), 2000);
      throw new Error('SESSION_EXPIRED_REDIRECT');
    }
    
    return refreshData.session;
  }
  
  // Proactively refresh if expiring within 5 minutes
  const expiresAt = sessionData.session.expires_at;
  if (expiresAt && expiresAt * 1000 < Date.now() + 300000) {
    console.log('[WhatsApp] Session expiring soon, refreshing...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      throw new Error('SESSION_EXPIRED');
    }
    
    return refreshData.session;
  }
  
  return sessionData.session;
}

/**
 * Parse error from edge function invocation
 */
function parseEdgeFunctionError(error: unknown): { message: string; code?: string; action?: string } {
  // Handle FunctionsHttpError (non-2xx response)
  if (error instanceof FunctionsHttpError) {
    try {
      // The context contains the parsed JSON body
      const errorBody = error.context as { error?: string; code?: string; action?: string; message?: string };
      return {
        message: errorBody?.error || errorBody?.message || error.message,
        code: errorBody?.code,
        action: errorBody?.action,
      };
    } catch {
      return { message: error.message };
    }
  }
  
  // Handle FunctionsFetchError (network/CORS issues)
  if (error instanceof FunctionsFetchError) {
    return {
      message: 'Network error connecting to backend',
      code: 'NETWORK_ERROR',
      action: 'Check your internet connection, disable ad blockers, or try refreshing the page',
    };
  }
  
  // Handle regular errors
  if (error instanceof Error) {
    // Check for session errors we threw
    if (error.message === 'SESSION_EXPIRED' || error.message === 'SESSION_ERROR') {
      return {
        message: 'Session expired',
        code: 'SESSION_EXPIRED',
        action: 'Please sign in again',
      };
    }
    
    // Try to parse JSON from message (legacy format)
    try {
      const parsed = JSON.parse(error.message);
      return {
        message: parsed.error || parsed.message || error.message,
        code: parsed.code,
        action: parsed.action || parsed.details?.action,
      };
    } catch {
      return { message: error.message };
    }
  }
  
  return { message: 'An unexpected error occurred' };
}
export function WhatsAppSettingsTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<DiagnosticsResult | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'valid' | 'expiring' | 'expired' | 'checking'>('checking');
  const [connectivityProbe, setConnectivityProbe] = useState<{
    running: boolean;
    optionsResult?: { ok: boolean; status?: number; error?: string; headers?: string };
    invokeResult?: { ok: boolean; status?: number; error?: string; data?: string };
    pingResult?: { ok: boolean; status?: number; error?: string; data?: string };
  }>({ running: false });

  // Check session status on mount and periodically
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSessionStatus('expired');
        return;
      }
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      if (expiresAt < now) {
        setSessionStatus('expired');
      } else if (expiresAt < now + 600000) { // 10 minutes
        setSessionStatus('expiring');
      } else {
        setSessionStatus('valid');
      }
    }
    checkSession();
    const interval = setInterval(checkSession, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle session refresh
  async function handleRefreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      notify.error('Could not refresh session', { description: 'Please sign in again.' });
      navigate('/auth');
    } else {
      setSessionStatus('valid');
      notify.success('Session refreshed');
    }
  }

  // Wrap ensureValidSession with navigate
  const ensureSession = () => ensureValidSession(navigate);

  // Fetch all accounts
  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['whatsapp-accounts-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_business_accounts')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WhatsAppAccount[];
    },
  });

  // Primary account
  const primaryAccount = accounts?.find(a => a.is_primary) || accounts?.[0];

  // Templates
  const { data: templates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('template_name');
      return data || [];
    },
  });

  // Run connectivity probe (tests raw network before full diagnostics)
  const runConnectivityProbe = async () => {
    setConnectivityProbe({ running: true });
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-whatsapp-account`;
    const results: typeof connectivityProbe = { running: false };

    // Test 1: Direct OPTIONS preflight
    try {
      const optionsRes = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type,apikey,x-client-info',
        },
      });
      const allowHeaders = optionsRes.headers.get('access-control-allow-headers') || 'none';
      const allowOrigin = optionsRes.headers.get('access-control-allow-origin') || 'none';
      results.optionsResult = {
        ok: optionsRes.status === 204 || optionsRes.status === 200,
        status: optionsRes.status,
        headers: `Allow-Origin: ${allowOrigin}, Allow-Headers: ${allowHeaders}`,
      };
    } catch (err) {
      results.optionsResult = { ok: false, error: (err as Error).message };
    }

    // Test 2: supabase.functions.invoke with 'ping' action
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'ping' },
      });
      if (error) {
        const parsed = parseEdgeFunctionError(error);
        results.pingResult = { ok: false, error: parsed.message };
      } else {
        results.pingResult = { ok: true, data: JSON.stringify(data).slice(0, 200) };
      }
    } catch (err) {
      results.pingResult = { ok: false, error: (err as Error).message };
    }

    // Test 3: supabase.functions.invoke with 'diagnostics' action
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'diagnostics' },
      });
      if (error) {
        const parsed = parseEdgeFunctionError(error);
        results.invokeResult = { ok: false, error: parsed.message };
      } else {
        results.invokeResult = { ok: true, data: JSON.stringify(data).slice(0, 200) };
      }
    } catch (err) {
      results.invokeResult = { ok: false, error: (err as Error).message };
    }

    setConnectivityProbe(results);
  };

  // Run diagnostics
  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticsResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'diagnostics' }
      });
      
      if (error) {
        const parsed = parseEdgeFunctionError(error);
        setDiagnosticsResult({
          overall_status: 'error',
          diagnostics: {
            request_id: 'unknown',
            timestamp: new Date().toISOString(),
            checks: {
              auth: { ok: false, error: parsed.message, code: parsed.code },
              secrets: { ok: false, skipped: 'request failed' },
              meta_api: { ok: false, skipped: 'request failed' },
              database: { ok: false, skipped: 'request failed' },
            },
          },
        });
        return;
      }
      
      setDiagnosticsResult(data as DiagnosticsResult);
    } catch (err) {
      const parsed = parseEdgeFunctionError(err);
      setDiagnosticsResult({
        overall_status: 'error',
        diagnostics: {
          request_id: 'unknown',
          timestamp: new Date().toISOString(),
          checks: {
            auth: { ok: false, error: parsed.message, code: parsed.code },
            secrets: { ok: false, skipped: 'request failed' },
            meta_api: { ok: false, skipped: 'request failed' },
            database: { ok: false, skipped: 'request failed' },
          },
        },
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Helper to invoke with session check
  async function invokeWithSession(action: string, extraData: Record<string, unknown> = {}) {
    await ensureSession();
    
    const { data, error } = await supabase.functions.invoke('manage-whatsapp-account', {
      body: { action, ...extraData }
    });
    
    if (error) {
      throw error;
    }
    
    if (data && !data.success && data.error) {
      const err = new Error(data.error);
      (err as unknown as Record<string, unknown>).code = data.code;
      (err as unknown as Record<string, unknown>).action = data.action;
      throw err;
    }
    
    return data;
  }

  // Activate account mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      return invokeWithSession('activate');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-settings'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-status'] });
      notify.success(`Connected: ${data.account?.display_phone_number || 'WhatsApp Business'}`);
    },
    onError: (error: unknown) => {
      const parsed = parseEdgeFunctionError(error);
      
      if (parsed.code === 'SESSION_EXPIRED' || parsed.code === 'AUTH_REQUIRED' || parsed.code === 'AUTH_ERROR') {
        notify.error('Session expired', {
          description: 'Please sign in again to continue',
          action: {
            label: 'Sign In',
            onClick: () => window.location.href = '/auth'
          }
        });
      } else if (parsed.code === 'NETWORK_ERROR') {
        notify.error('Connection failed', {
          description: parsed.action || 'Check your network connection'
        });
      } else if (parsed.code === 'MISSING_CREDENTIALS') {
        notify.error('Missing API credentials', {
          description: parsed.action || 'Configure WhatsApp API credentials in backend settings'
        });
      } else {
        notify.error(parsed.message, {
          description: parsed.action
        });
      }
    },
  });

  // Verify account mutation
  const verifyMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setVerifyingId(accountId);
      return invokeWithSession('verify', { account_id: accountId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-settings'] });
      if (data.verified) {
        notify.success('Connection verified successfully');
      } else {
        notify.warning(data.error || 'Verification failed');
      }
    },
    onError: (error: unknown) => {
      const parsed = parseEdgeFunctionError(error);
      
      if (parsed.code === 'SESSION_EXPIRED' || parsed.code === 'AUTH_REQUIRED') {
        notify.error('Session expired', {
          description: 'Please sign in again'
        });
      } else {
        notify.error(parsed.message);
      }
    },
    onSettled: () => {
      setVerifyingId(null);
    },
  });

  const syncTemplates = async () => {
    setIsSyncing(true);
    try {
      await ensureSession();
      const { error } = await supabase.functions.invoke('sync-whatsapp-templates');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      notify.success('Templates synced');
    } catch (err) {
      if ((err as Error).message === 'SESSION_EXPIRED_REDIRECT') return;
      const parsed = parseEdgeFunctionError(err);
      notify.error(parsed.message || 'Failed to sync templates');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook-receiver`;
    navigator.clipboard.writeText(url);
    notify.success('Webhook URL copied');
  };

  const isConnected = accounts && accounts.length > 0 && accounts.some(a => a.is_active);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  const getQualityColor = (rating?: string) => {
    switch (rating) {
      case 'GREEN': return 'text-green-500';
      case 'YELLOW': return 'text-amber-500';
      case 'RED': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const DiagnosticsCheckRow = ({ label, check }: { label: string; check: { ok: boolean; error?: string; skipped?: string; [key: string]: unknown } }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {check.ok ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            OK
          </Badge>
        ) : check.skipped ? (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Skipped
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            {String(check.error || check.code || 'Failed')}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Session Status Banner */}
      {sessionStatus === 'expired' && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Session expired. Please sign in again.</span>
            </div>
            <Button size="sm" variant="destructive" onClick={() => navigate('/auth')}>
              <LogIn className="h-4 w-4 mr-1" /> Sign In
            </Button>
          </CardContent>
        </Card>
      )}
      {sessionStatus === 'expiring' && (
        <Card className="border-amber-500 bg-amber-500/10">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Session expiring soon.</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefreshSession}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh Session
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">WhatsApp Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your WhatsApp Business integration</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
          isConnected 
            ? 'bg-green-500/10 text-green-600 border-green-500/20' 
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <Users className="w-4 h-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Globe className="w-4 h-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Activation Card - Only show if no accounts */}
          {(!accounts || accounts.length === 0) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Activate WhatsApp Business
                </CardTitle>
                <CardDescription>
                  Connect your WhatsApp Business API to start messaging candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => activateMutation.mutate()} 
                  disabled={activateMutation.isPending}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {activateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Connect WhatsApp
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Requires WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_BUSINESS_ACCOUNT_ID in backend secrets
                </p>
              </CardContent>
            </Card>
          )}

          {/* Connected Accounts */}
          {accountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id} className={account.is_primary ? 'border-primary/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${account.is_active ? 'bg-green-500/10' : 'bg-muted'}`}>
                          <MessageSquare className={`h-5 w-5 ${account.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.display_phone_number}</span>
                            {account.is_primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {account.verified_name || account.account_label || 'WhatsApp Business'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quality Rating */}
                        {account.quality_rating && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Activity className={`w-4 h-4 ${getQualityColor(account.quality_rating)}`} />
                            <span className={getQualityColor(account.quality_rating)}>{account.quality_rating}</span>
                          </div>
                        )}

                        {/* Status Badge */}
                        <Badge variant="outline" className={getStatusColor(account.verification_status)}>
                          {account.verification_status === 'verified' && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {account.verification_status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {account.verification_status || 'Pending'}
                        </Badge>

                        {/* Verify Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyMutation.mutate(account.id)}
                          disabled={verifyingId === account.id}
                        >
                          {verifyingId === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Last verified info */}
                    {account.last_verified_at && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Last verified: {new Date(account.last_verified_at).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Re-activate button if accounts exist */}
              <Button 
                variant="outline" 
                onClick={() => activateMutation.mutate()} 
                disabled={activateMutation.isPending}
                className="w-full"
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Connection from API Credentials
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>Pre-approved templates for outbound messaging</CardDescription>
                </div>
                <Button onClick={syncTemplates} disabled={isSyncing} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Templates
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates?.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{template.template_name}</p>
                      <p className="text-sm text-muted-foreground">{template.language_code} • {template.template_category}</p>
                    </div>
                    <Badge variant={template.approval_status === 'APPROVED' ? 'default' : 'secondary'}>
                      {template.approval_status}
                    </Badge>
                  </div>
                ))}
                {(!templates || templates.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No templates found. Click "Sync Templates" to fetch from WhatsApp.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOK TAB */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure these settings in Meta Business Suite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Callback URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook-receiver`}
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Verify Token</Label>
                <Input 
                  value="Use WHATSAPP_WEBHOOK_VERIFY_TOKEN from backend secrets"
                  readOnly 
                  className="font-mono text-sm text-muted-foreground"
                />
              </div>

              <div className="pt-4">
                <Button variant="outline" asChild>
                  <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Meta Business Suite
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API TAB */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Credentials
              </CardTitle>
              <CardDescription>
                Required secrets for WhatsApp Business API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">WHATSAPP_ACCESS_TOKEN</p>
                    <p className="text-sm text-muted-foreground">Permanent access token from Meta</p>
                  </div>
                  <Badge variant="outline">Required</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">WHATSAPP_PHONE_NUMBER_ID</p>
                    <p className="text-sm text-muted-foreground">Phone number ID from WhatsApp Business</p>
                  </div>
                  <Badge variant="outline">Required</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">WHATSAPP_BUSINESS_ACCOUNT_ID</p>
                    <p className="text-sm text-muted-foreground">Business account ID from Meta</p>
                  </div>
                  <Badge variant="outline">Required</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">WHATSAPP_WEBHOOK_VERIFY_TOKEN</p>
                    <p className="text-sm text-muted-foreground">Custom token for webhook verification</p>
                  </div>
                  <Badge variant="secondary">Optional</Badge>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button variant="outline" asChild>
                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Meta Developer Portal
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIAGNOSTICS TAB */}
        <TabsContent value="diagnostics" className="space-y-4">
          {/* Connectivity Probe Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wifi className="h-5 w-5" />
                Connectivity Probe
              </CardTitle>
              <CardDescription>
                Test raw network connectivity before running full diagnostics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runConnectivityProbe} 
                disabled={connectivityProbe.running}
                variant="outline"
                className="w-full"
              >
                {connectivityProbe.running ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing connectivity...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Run Connectivity Probe
                  </>
                )}
              </Button>

              {(connectivityProbe.optionsResult || connectivityProbe.pingResult || connectivityProbe.invokeResult) && (
                <div className="space-y-3 text-sm">
                  {/* OPTIONS Test */}
                  {connectivityProbe.optionsResult && (
                    <div className={`p-3 rounded-lg border ${connectivityProbe.optionsResult.ok ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="flex items-center gap-2 font-medium">
                        {connectivityProbe.optionsResult.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        OPTIONS Preflight
                        {connectivityProbe.optionsResult.status && <Badge variant="outline" className="ml-auto text-xs">{connectivityProbe.optionsResult.status}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                        {connectivityProbe.optionsResult.headers || connectivityProbe.optionsResult.error}
                      </p>
                    </div>
                  )}

                  {/* Ping Test */}
                  {connectivityProbe.pingResult && (
                    <div className={`p-3 rounded-lg border ${connectivityProbe.pingResult.ok ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="flex items-center gap-2 font-medium">
                        {connectivityProbe.pingResult.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        Ping (minimal invoke)
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                        {connectivityProbe.pingResult.data || connectivityProbe.pingResult.error}
                      </p>
                    </div>
                  )}

                  {/* Diagnostics Invoke Test */}
                  {connectivityProbe.invokeResult && (
                    <div className={`p-3 rounded-lg border ${connectivityProbe.invokeResult.ok ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="flex items-center gap-2 font-medium">
                        {connectivityProbe.invokeResult.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        Diagnostics Invoke
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                        {connectivityProbe.invokeResult.data || connectivityProbe.invokeResult.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Diagnostics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Connection Diagnostics
              </CardTitle>
              <CardDescription>
                Run health checks to diagnose connection issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runDiagnostics} 
                disabled={isRunningDiagnostics}
                className="w-full"
              >
                {isRunningDiagnostics ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running diagnostics...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Run Diagnostics
                  </>
                )}
              </Button>

              {diagnosticsResult && (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div className={`p-4 rounded-lg border ${
                    diagnosticsResult.overall_status === 'healthy' 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {diagnosticsResult.overall_status === 'healthy' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {diagnosticsResult.overall_status === 'healthy' 
                          ? 'All systems operational' 
                          : 'Issues found'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Request ID: {diagnosticsResult.diagnostics.request_id} • {diagnosticsResult.diagnostics.timestamp}
                    </p>
                  </div>

                  {/* Individual Checks */}
                  <div className="border rounded-lg divide-y">
                    <DiagnosticsCheckRow label="Authentication" check={diagnosticsResult.diagnostics.checks.auth} />
                    <DiagnosticsCheckRow label="API Credentials" check={diagnosticsResult.diagnostics.checks.secrets} />
                    <DiagnosticsCheckRow label="Meta API Connection" check={diagnosticsResult.diagnostics.checks.meta_api} />
                    <DiagnosticsCheckRow label="Database Access" check={diagnosticsResult.diagnostics.checks.database} />
                  </div>

                  {/* Detailed Info */}
                  {diagnosticsResult.diagnostics.checks.auth.ok && (
                    <div className="text-sm text-muted-foreground">
                      <p>Signed in as: <code className="bg-muted px-1 rounded">{diagnosticsResult.diagnostics.checks.auth.user_id}</code></p>
                      <p>Role: <code className="bg-muted px-1 rounded">{diagnosticsResult.diagnostics.checks.auth.role}</code></p>
                    </div>
                  )}

                  {diagnosticsResult.diagnostics.checks.secrets.missing && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm font-medium text-amber-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Missing credentials:
                      </p>
                      <ul className="text-sm mt-1 space-y-1">
                        {diagnosticsResult.diagnostics.checks.secrets.missing.map((s: string) => (
                          <li key={s} className="font-mono text-xs">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnosticsResult.diagnostics.checks.meta_api.ok && (
                    <div className="text-sm text-muted-foreground">
                      <p>Phone: <code className="bg-muted px-1 rounded">{diagnosticsResult.diagnostics.checks.meta_api.phone_number}</code></p>
                      <p>Name: <code className="bg-muted px-1 rounded">{diagnosticsResult.diagnostics.checks.meta_api.verified_name}</code></p>
                    </div>
                  )}

                  {diagnosticsResult.diagnostics.checks.database.ok && (
                    <div className="text-sm text-muted-foreground">
                      <p>Existing accounts: <code className="bg-muted px-1 rounded">{diagnosticsResult.diagnostics.checks.database.accounts_count}</code></p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Troubleshooting Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Session expired errors</p>
                  <p className="text-muted-foreground">Sign out and sign back in to refresh your session.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Network errors</p>
                  <p className="text-muted-foreground">Disable ad blockers, check VPN/proxy settings, or try a different browser.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Missing credentials</p>
                  <p className="text-muted-foreground">Add the required API keys in backend settings.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
