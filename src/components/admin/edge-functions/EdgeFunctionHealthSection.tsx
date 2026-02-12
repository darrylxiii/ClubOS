import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEdgeFunctionRegistry, useToggleEdgeFunction } from '@/hooks/useEdgeFunctionRegistry';
import { AlertTriangle, XCircle, Power, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function EdgeFunctionHealthSection() {
  const { data: functions = [] } = useEdgeFunctionRegistry();
  const toggleFn = useToggleEdgeFunction();

  const unhealthy = functions.filter(f => f.is_active !== false && Number(f.error_rate) > 15);
  const warning = functions.filter(f => {
    const er = Number(f.error_rate) || 0;
    return f.is_active !== false && er > 5 && er <= 15;
  });
  const disabled = functions.filter(f => f.is_active === false);

  if (unhealthy.length === 0 && warning.length === 0 && disabled.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-500">
            <Shield className="h-5 w-5" />
            <p className="text-sm font-medium">All functions healthy — no issues detected.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {unhealthy.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              Unhealthy ({unhealthy.length}) — Error rate &gt; 15%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unhealthy.map(fn => (
              <div key={fn.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <span className="font-medium">{fn.display_name || fn.function_name}</span>
                  <span className="ml-2 text-xs text-red-500 font-mono">{Number(fn.error_rate).toFixed(1)}% errors</span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleFn.mutate({ id: fn.id, isActive: false })}>
                  <PowerOff className="h-3 w-3 mr-1" /> Disable
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {warning.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              Warning ({warning.length}) — Error rate 5–15%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warning.slice(0, 10).map(fn => (
              <div key={fn.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <span className="font-medium">{fn.display_name || fn.function_name}</span>
                  <span className="ml-2 text-xs text-yellow-500 font-mono">{Number(fn.error_rate).toFixed(1)}%</span>
                </div>
                <Badge variant="secondary" className="text-xs">{fn.category || 'Uncategorized'}</Badge>
              </div>
            ))}
            {warning.length > 10 && <p className="text-xs text-muted-foreground">+{warning.length - 10} more</p>}
          </CardContent>
        </Card>
      )}

      {disabled.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Power className="h-4 w-4" />
              Admin Disabled ({disabled.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {disabled.slice(0, 10).map(fn => (
              <div key={fn.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <span className="font-medium">{fn.display_name || fn.function_name}</span>
                  {fn.admin_disabled_at && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(fn.admin_disabled_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleFn.mutate({ id: fn.id, isActive: true })}>
                  <Power className="h-3 w-3 mr-1" /> Re-enable
                </Button>
              </div>
            ))}
            {disabled.length > 10 && <p className="text-xs text-muted-foreground">+{disabled.length - 10} more</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PowerOff(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}
