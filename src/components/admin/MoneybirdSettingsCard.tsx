import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Unlink, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useMoneybirdSettings, useGetMoneybirdAuthUrl, useDisconnectMoneybird, useUpdateMoneybirdSettings } from '@/hooks/useMoneybird';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function MoneybirdSettingsCard() {
  const { data: settings, isLoading } = useMoneybirdSettings();
  const getAuthUrl = useGetMoneybirdAuthUrl();
  const disconnect = useDisconnectMoneybird();
  const updateSettings = useUpdateMoneybirdSettings();

  const handleConnect = async () => {
    const authUrl = await getAuthUrl.mutateAsync();
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  const handleToggle = (field: 'auto_create_invoices' | 'auto_send_invoices', value: boolean) => {
    updateSettings.mutate({ [field]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!settings?.is_active;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Connection Status
              {isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isConnected
                ? `Connected to ${settings.administration_name || 'Moneybird'}`
                : 'Connect your Moneybird account to sync invoices automatically'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isConnected ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Moneybird?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will stop automatic invoice syncing. Existing synced invoices will remain in Moneybird.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => disconnect.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={handleConnect} disabled={getAuthUrl.isPending}>
                {getAuthUrl.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect Moneybird
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isConnected && (
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Administration</Label>
              <p className="font-medium">{settings.administration_name || settings.administration_id}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Last Updated</Label>
              <p className="font-medium">
                {settings.updated_at ? format(new Date(settings.updated_at), 'PPp') : 'Never'}
              </p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h4 className="font-medium">Automation Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-create invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create Moneybird invoices when TQC invoices are generated
                </p>
              </div>
              <Switch
                checked={settings.auto_create_invoices || false}
                onCheckedChange={(checked) => handleToggle('auto_create_invoices', checked)}
                disabled={updateSettings.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-send invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send invoices via email after creation in Moneybird
                </p>
              </div>
              <Switch
                checked={settings.auto_send_invoices || false}
                onCheckedChange={(checked) => handleToggle('auto_send_invoices', checked)}
                disabled={updateSettings.isPending}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
