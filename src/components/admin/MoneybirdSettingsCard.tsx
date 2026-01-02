import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useMoneybirdConnection, useSyncMoneybirdContacts, useSyncMoneybirdInvoiceStatus } from '@/hooks/useMoneybird';

export function MoneybirdSettingsCard() {
  const { data: connection, isLoading, refetch } = useMoneybirdConnection();
  const syncContacts = useSyncMoneybirdContacts();
  const syncInvoices = useSyncMoneybirdInvoiceStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Moneybird Integration
              {connection?.connected ? (
                <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {connection?.connected 
                ? `Connected to ${connection.administrationName}`
                : connection?.error || 'Configure your Moneybird tokens to connect'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      {connection?.connected && (
        <CardContent className="space-y-6">
          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Administration</p>
              <p className="font-medium">{connection.administrationName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Administration ID</p>
              <p className="font-mono text-sm">{connection.administrationId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p className="font-medium">{connection.country || 'NL'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{connection.currency || 'EUR'}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => syncContacts.mutate({ syncAll: true })}
              disabled={syncContacts.isPending}
            >
              {syncContacts.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sync All Contacts
            </Button>
            <Button
              variant="outline"
              onClick={() => syncInvoices.mutate({ syncAll: true })}
              disabled={syncInvoices.isPending}
            >
              {syncInvoices.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sync Invoice Statuses
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.open(`https://moneybird.com/${connection.administrationId}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Moneybird
            </Button>
          </div>
        </CardContent>
      )}

      {!connection?.connected && (
        <CardContent>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              To connect Moneybird, ensure the <code className="px-1 py-0.5 bg-muted rounded">MONEYBIRD_ACCESS_TOKEN</code> and <code className="px-1 py-0.5 bg-muted rounded">MONEYBIRD_ADMINISTRATION_ID</code> secrets are configured correctly.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
