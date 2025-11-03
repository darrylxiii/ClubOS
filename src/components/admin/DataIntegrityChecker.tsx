import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';

interface IntegrityIssue {
  user_id: string;
  auth_email: string;
  profile_email: string;
  auth_full_name: string;
  profile_full_name: string;
  mismatch_type: string;
}

export function DataIntegrityChecker() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [mismatches, setMismatches] = useState<IntegrityIssue[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkIntegrity = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_profile_auth_integrity');
      
      if (error) throw error;
      
      setMismatches(data || []);
      setLastChecked(new Date());
      
      if (data && data.length > 0) {
        toast.warning(`Found ${data.length} data integrity issue(s)`);
      } else {
        toast.success('No data integrity issues found');
      }
    } catch (error) {
      console.error('Error checking integrity:', error);
      toast.error('Failed to check data integrity');
    } finally {
      setLoading(false);
    }
  };

  const fixAllMismatches = async () => {
    setFixing(true);
    try {
      const { data, error } = await supabase.rpc('fix_profile_auth_mismatches');
      
      if (error) throw error;
      
      toast.success(`Fixed ${data?.length || 0} profile(s)`);
      
      // Recheck after fixing
      await checkIntegrity();
    } catch (error) {
      console.error('Error fixing mismatches:', error);
      toast.error('Failed to fix mismatches');
    } finally {
      setFixing(false);
    }
  };

  return (
    <Card className="border-warning/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Data Integrity Monitor
            </CardTitle>
            <CardDescription>
              Detect and fix mismatches between authentication and profile data
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkIntegrity}
              disabled={loading || fixing}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check Now
            </Button>
            {mismatches.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={fixAllMismatches}
                disabled={loading || fixing}
              >
                {fixing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4 mr-2" />
                )}
                Fix All ({mismatches.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {lastChecked && (
          <div className="text-sm text-muted-foreground">
            Last checked: {lastChecked.toLocaleString()}
          </div>
        )}

        {mismatches.length === 0 && lastChecked && (
          <Alert className="border-success/20 bg-success/5">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle>All Clear</AlertTitle>
            <AlertDescription>
              No data integrity issues detected. All profiles are in sync with authentication data.
            </AlertDescription>
          </Alert>
        )}

        {mismatches.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data Integrity Issues Detected</AlertTitle>
            <AlertDescription>
              Found {mismatches.length} profile(s) with mismatched data. Review and fix below.
            </AlertDescription>
          </Alert>
        )}

        {mismatches.length > 0 && (
          <div className="space-y-3">
            {mismatches.map((issue) => (
              <Card key={issue.user_id} className="border-destructive/20">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">
                        {issue.user_id}
                      </span>
                      <Badge variant="destructive">{issue.mismatch_type}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="font-medium text-success">Auth Data (Correct)</div>
                        <div className="text-muted-foreground">
                          Email: {issue.auth_email}
                        </div>
                        <div className="text-muted-foreground">
                          Name: {issue.auth_full_name || '(empty)'}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="font-medium text-destructive">Profile Data (Wrong)</div>
                        <div className="text-muted-foreground">
                          Email: {issue.profile_email}
                        </div>
                        <div className="text-muted-foreground">
                          Name: {issue.profile_full_name || '(empty)'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
