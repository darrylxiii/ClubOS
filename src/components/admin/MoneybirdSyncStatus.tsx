import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Users, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import {
  useMoneybirdConnection,
  useMoneybirdContactSyncs,
  useMoneybirdInvoiceSyncs,
  useSyncMoneybirdContacts,
  useSyncMoneybirdInvoiceStatus,
} from '@/hooks/useMoneybird';

export function MoneybirdSyncStatus() {
  const { t } = useTranslation('common');
  const { data: connection } = useMoneybirdConnection();
  const { data: contactSyncs, isLoading: contactsLoading } = useMoneybirdContactSyncs();
  const { data: invoiceSyncs, isLoading: invoicesLoading } = useMoneybirdInvoiceSyncs();
  const syncContacts = useSyncMoneybirdContacts();
  const syncInvoiceStatus = useSyncMoneybirdInvoiceStatus();

  if (!connection?.connected) {
    return null;
  }

  const isLoading = contactsLoading || invoicesLoading;

  const contactStats = {
    synced: contactSyncs?.filter(c => c.sync_status === 'synced').length || 0,
    pending: contactSyncs?.filter(c => c.sync_status === 'pending').length || 0,
    error: contactSyncs?.filter(c => c.sync_status === 'error').length || 0,
    total: contactSyncs?.length || 0,
  };

  const invoiceStats = {
    synced: invoiceSyncs?.filter(i => i.sync_status === 'synced').length || 0,
    paid: invoiceSyncs?.filter(i => i.moneybird_status === 'paid').length || 0,
    pending: invoiceSyncs?.filter(i => i.moneybird_status === 'open' || i.moneybird_status === 'sent').length || 0,
    error: invoiceSyncs?.filter(i => i.sync_status === 'error').length || 0,
    total: invoiceSyncs?.length || 0,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sync_status", "Sync Status")}</CardTitle>
        <CardDescription>{t("overview_of_synced_contacts", "Overview of synced contacts and invoices")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contacts */}
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium">{t("contacts", "Contacts")}</h4>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncContacts.mutate({})}
                  disabled={syncContacts.isPending}
                >
                  {syncContacts.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">{t("sync", "Sync")}</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold">{contactStats.synced}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("synced", "Synced")}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-4 w-4" />
                    <span className="font-bold">{contactStats.pending}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("pending", "Pending")}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-bold">{contactStats.error}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("errors", "Errors")}</p>
                </div>
              </div>
            </div>

            {/* Invoices */}
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium">{t("invoices", "Invoices")}</h4>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncInvoiceStatus.mutate({})}
                  disabled={syncInvoiceStatus.isPending}
                >
                  {syncInvoiceStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">{t("refresh", "Refresh")}</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                    <FileText className="h-4 w-4" />
                    <span className="font-bold">{invoiceStats.total}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("total", "Total")}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold">{invoiceStats.paid}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("paid", "Paid")}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-4 w-4" />
                    <span className="font-bold">{invoiceStats.pending}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("pending", "Pending")}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-bold">{invoiceStats.error}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("errors", "Errors")}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
