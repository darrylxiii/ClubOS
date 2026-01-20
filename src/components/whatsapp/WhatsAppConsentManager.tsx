import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Search, 
  Upload, 
  Download, 
  Check, 
  X, 
  HelpCircle,
  Users,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useWhatsAppBroadcastConsent, type BroadcastConsent } from '@/hooks/useWhatsAppBroadcastConsent';
import { format } from 'date-fns';

interface WhatsAppConsentManagerProps {
  open: boolean;
  onClose: () => void;
}

export function WhatsAppConsentManager({ open, onClose }: WhatsAppConsentManagerProps) {
  const { allConsents, stats, loading, updateConsent, bulkUpdate, isUpdating } = useWhatsAppBroadcastConsent();
  const [search, setSearch] = useState('');
  const [bulkPhones, setBulkPhones] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'opted_in' | 'opted_out'>('opted_in');

  const filteredConsents = (allConsents || []).filter(
    c => c.phone_number.includes(search) || search === ''
  );

  const handleBulkImport = () => {
    const phones = bulkPhones
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (phones.length > 0) {
      bulkUpdate({ phoneNumbers: phones, status: bulkStatus, source: 'bulk_import' });
      setBulkPhones('');
    }
  };

  const handleExport = () => {
    const csv = [
      'phone_number,consent_status,consent_source,consent_given_at,consent_revoked_at',
      ...(allConsents || []).map(c => 
        `${c.phone_number},${c.consent_status},${c.consent_source || ''},${c.consent_given_at || ''},${c.consent_revoked_at || ''}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-consent-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'opted_in': return <Check className="w-4 h-4 text-emerald-500" />;
      case 'opted_out': return <X className="w-4 h-4 text-red-500" />;
      default: return <HelpCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Broadcast Consent Manager
          </DialogTitle>
          <DialogDescription>
            Manage GDPR-compliant opt-in/opt-out status for WhatsApp broadcast campaigns.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-2xl font-bold text-emerald-600">{stats.optedIn}</p>
              <p className="text-xs text-muted-foreground">Opted In</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-3 text-center">
              <XCircle className="w-5 h-5 mx-auto text-red-500 mb-1" />
              <p className="text-2xl font-bold text-red-600">{stats.optedOut}</p>
              <p className="text-xs text-muted-foreground">Opted Out</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <HelpCircle className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold text-amber-600">{stats.unknown}</p>
              <p className="text-xs text-muted-foreground">Unknown</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="list">Consent List</TabsTrigger>
            <TabsTrigger value="import">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConsents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No consent records found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConsents.map((consent) => (
                    <div
                      key={consent.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(consent.consent_status)}
                        <div>
                          <p className="font-medium">{consent.phone_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {consent.consent_source || 'No source'} • 
                            {consent.campaign_send_count} campaigns sent
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={consent.consent_status === 'opted_in' ? 'default' : 'secondary'}>
                          {consent.consent_status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateConsent({
                            phone: consent.phone_number,
                            status: consent.consent_status === 'opted_in' ? 'opted_out' : 'opted_in',
                            source: 'manual',
                          })}
                          disabled={isUpdating}
                        >
                          Toggle
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="import" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="space-y-4">
              <div>
                <Label>Phone Numbers (one per line)</Label>
                <Textarea
                  placeholder="+31612345678&#10;+31698765432&#10;+31687654321"
                  value={bulkPhones}
                  onChange={(e) => setBulkPhones(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bulkPhones.split('\n').filter(p => p.trim()).length} phone numbers
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Label>Set status to:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={bulkStatus === 'opted_in' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBulkStatus('opted_in')}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Opted In
                  </Button>
                  <Button
                    variant={bulkStatus === 'opted_out' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBulkStatus('opted_out')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Opted Out
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleBulkImport}
                disabled={!bulkPhones.trim() || isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import {bulkPhones.split('\n').filter(p => p.trim()).length} Numbers
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
