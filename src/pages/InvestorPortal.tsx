import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Lock } from 'lucide-react';
import { LiveARRTicker } from '@/components/financial/LiveARRTicker';
import { MultiYearPLTable } from '@/components/financial/MultiYearPLTable';
import { RevenueConcentrationCard } from '@/components/financial/RevenueConcentrationCard';
import { PlacementVelocity } from '@/components/financial/PlacementVelocity';
import { ClientHealthMatrix } from '@/components/financial/ClientHealthMatrix';
import { TransactionReadinessScore } from '@/components/financial/TransactionReadinessScore';
import { RevenueWaterfallChart } from '@/components/financial/RevenueWaterfallChart';
import { EBITDACard } from '@/components/financial/EBITDACard';

async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code.trim().toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function InvestorPortal() {
  const [code, setCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [label, setLabel] = useState('');
  const currentYear = new Date().getFullYear();

  // Check session storage for existing valid code
  useEffect(() => {
    const stored = sessionStorage.getItem('investor_portal_auth');
    if (stored) {
      try {
        const { expiry, label: storedLabel } = JSON.parse(stored);
        if (new Date(expiry) > new Date()) {
          setIsAuthenticated(true);
          setLabel(storedLabel || 'Investor');
        } else {
          sessionStorage.removeItem('investor_portal_auth');
        }
      } catch {
        sessionStorage.removeItem('investor_portal_auth');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsChecking(true);
    try {
      const codeHash = await hashCode(code);
      
      const { data, error } = await (supabase as any)
        .from('investor_access_codes')
        .select('id, label, expires_at')
        .eq('code_hash', codeHash)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        toast.error('Invalid or expired access code');
        return;
      }

      // Update last_used_at
      await (supabase as any)
        .from('investor_access_codes')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      // Store in session
      sessionStorage.setItem('investor_portal_auth', JSON.stringify({
        expiry: data.expires_at,
        label: data.label,
      }));

      setIsAuthenticated(true);
      setLabel(data.label || 'Investor');
      toast.success('Access granted');
    } catch {
      toast.error('Verification failed');
    } finally {
      setIsChecking(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">The Quantum Club</CardTitle>
            <CardDescription>
              Enter your investor access code to view the live dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full" variant="primary" loading={isChecking}>
                <Shield className="h-4 w-4 mr-2" />
                Verify Access
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              This portal is strictly confidential. Access is logged.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20 bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">The Quantum Club — Investor Portal</h1>
            <p className="text-sm text-muted-foreground">Live financial metrics · {label}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('investor_portal_auth');
              setIsAuthenticated(false);
              setCode('');
            }}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <LiveARRTicker />
        <RevenueWaterfallChart />
        <MultiYearPLTable />
        <div className="grid gap-6 md:grid-cols-2">
          <EBITDACard year={currentYear} />
          <RevenueConcentrationCard year={currentYear} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ClientHealthMatrix />
          <PlacementVelocity />
        </div>
        <TransactionReadinessScore />

        <p className="text-xs text-center text-muted-foreground pt-4 pb-8">
          Powered by QUIN · Data refreshes every 2 minutes · Confidential
        </p>
      </main>
    </div>
  );
}
