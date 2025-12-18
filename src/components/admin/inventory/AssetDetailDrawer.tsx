import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Package, Calendar, DollarSign, FileText, Clock, 
  AlertCircle, CheckCircle, Wrench, XCircle, ExternalLink,
  TrendingDown, Edit, History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { InventoryAsset, AssetStatus } from '@/hooks/useInventoryAssets';
import { useAssetEvents, type AssetEvent } from '@/hooks/useAssetEvents';
import { CATEGORY_LABELS } from '@/hooks/useInventoryCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssetDetailDrawerProps {
  asset: InventoryAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (asset: InventoryAsset) => void;
  onStatusChange: (id: string, status: AssetStatus) => Promise<boolean>;
}

const formatCurrency = (v: number | null) => 
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v || 0);

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: 'Active', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  under_maintenance: { label: 'Under Maintenance', icon: <Wrench className="h-4 w-4" />, color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  fully_depreciated: { label: 'Fully Depreciated', icon: <TrendingDown className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  disposed: { label: 'Disposed', icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500/10 text-red-700 border-red-500/30' },
  sold: { label: 'Sold', icon: <DollarSign className="h-4 w-4" />, color: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  written_off: { label: 'Written Off', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-gray-500/10 text-gray-700 border-gray-500/30' },
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Asset Created',
  updated: 'Asset Updated',
  status_changed: 'Status Changed',
  kia_changed: 'KIA Eligibility Changed',
  depreciation_run: 'Depreciation Processed',
  disposed: 'Asset Disposed',
};

export function AssetDetailDrawer({ asset, open, onOpenChange, onEdit, onStatusChange }: AssetDetailDrawerProps) {
  const { events, loading: eventsLoading, createEvent } = useAssetEvents(asset?.id);
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [disposeForm, setDisposeForm] = useState({ reason: '', value: 0 });
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    if (asset) {
      setDisposeForm({ reason: '', value: asset.current_book_value || 0 });
    }
  }, [asset]);

  if (!asset) return null;

  const status = asset.status || 'active';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const isDisposed = status === 'disposed' || status === 'sold' || status === 'written_off';

  const handleStatusChange = async (newStatus: AssetStatus) => {
    if (newStatus === 'disposed') {
      setDisposeDialogOpen(true);
      return;
    }

    setStatusChanging(true);
    const previousStatus = asset.status;
    const success = await onStatusChange(asset.id, newStatus);
    
    if (success) {
      await createEvent('status_changed', {}, { status: previousStatus }, { status: newStatus });
    }
    setStatusChanging(false);
  };

  const handleDispose = async () => {
    setStatusChanging(true);
    try {
      const { error } = await supabase
        .from('inventory_assets')
        .update({
          status: 'disposed',
          disposed_at: new Date().toISOString(),
          disposal_reason: disposeForm.reason,
          disposal_value: disposeForm.value,
        })
        .eq('id', asset.id);

      if (error) throw error;

      await createEvent('disposed', {
        disposal_reason: disposeForm.reason,
        disposal_value: disposeForm.value,
      }, { status: asset.status }, { status: 'disposed' });

      toast.success('Asset disposed successfully');
      setDisposeDialogOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to dispose asset');
      console.error(err);
    } finally {
      setStatusChanging(false);
    }
  };

  const getValidTransitions = (): AssetStatus[] => {
    if (isDisposed) return [];
    
    switch (status) {
      case 'active':
        return ['under_maintenance', 'disposed'];
      case 'under_maintenance':
        return ['active', 'disposed'];
      case 'fully_depreciated':
        return ['disposed'];
      default:
        return [];
    }
  };

  const validTransitions = getValidTransitions();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">{asset.asset_name}</SheetTitle>
                <p className="text-sm text-muted-foreground font-mono mt-1">{asset.inventory_number}</p>
              </div>
              <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
          </SheetHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="details" className="mt-0 space-y-4">
                {/* Basic Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category</span>
                      <p className="font-medium">{CATEGORY_LABELS[asset.category] || asset.category}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Asset Type</span>
                      <p className="font-medium capitalize">{asset.asset_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supplier</span>
                      <p className="font-medium">{asset.supplier || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serial/Invoice #</span>
                      <p className="font-medium">{asset.invoice_reference || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location</span>
                      <p className="font-medium">{asset.cost_center || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Assigned To</span>
                      <p className="font-medium">{asset.assigned_to || '—'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Purchase Value</span>
                      <p className="font-medium">{formatCurrency(asset.total_purchase_value)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Book Value</span>
                      <p className="font-medium text-primary">{formatCurrency(asset.current_book_value)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accumulated Depreciation</span>
                      <p className="font-medium">{formatCurrency(asset.accumulated_depreciation)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monthly Depreciation</span>
                      <p className="font-medium">{formatCurrency(asset.monthly_depreciation)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Useful Life</span>
                      <p className="font-medium">{asset.useful_life_years} years</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Residual Value</span>
                      <p className="font-medium">{formatCurrency(asset.residual_value)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Purchase Date</span>
                      <p className="font-medium">{format(new Date(asset.purchase_date), 'PPP')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Depreciation Start</span>
                      <p className="font-medium">
                        {asset.depreciation_start_date 
                          ? format(new Date(asset.depreciation_start_date), 'PPP')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Depreciation End</span>
                      <p className="font-medium">
                        {asset.depreciation_end_date 
                          ? format(new Date(asset.depreciation_end_date), 'PPP')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">KIA Eligible</span>
                      <p className="font-medium">{asset.kia_eligible ? 'Yes' : 'No'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments */}
                {asset.invoice_file_url && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Attachments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a 
                        href={asset.invoice_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Invoice/Receipt
                      </a>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {(asset.description || asset.notes) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {asset.description && <p className="mb-2">{asset.description}</p>}
                      {asset.notes && <p className="text-muted-foreground">{asset.notes}</p>}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" /> Event Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eventsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events recorded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {events.map((event) => (
                          <TimelineEvent key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="mt-0 space-y-4">
                {/* Edit */}
                <Card>
                  <CardContent className="pt-4">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(asset);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Asset Details
                    </Button>
                  </CardContent>
                </Card>

                {/* Status Transitions */}
                {!isDisposed && validTransitions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Change Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {validTransitions.map((newStatus) => {
                        const config = STATUS_CONFIG[newStatus];
                        return (
                          <Button
                            key={newStatus}
                            variant="outline"
                            className="w-full justify-start"
                            disabled={statusChanging}
                            onClick={() => handleStatusChange(newStatus)}
                          >
                            {config.icon}
                            <span className="ml-2">Move to {config.label}</span>
                          </Button>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {isDisposed && (
                  <Card className="border-destructive/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">This asset has been disposed</span>
                      </div>
                      {asset.disposal_reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Reason: {asset.disposal_reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dispose Dialog */}
      <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will mark the asset as disposed and stop future depreciation calculations.
            </p>
            <div>
              <Label>Disposal Reason</Label>
              <Textarea
                value={disposeForm.reason}
                onChange={(e) => setDisposeForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., End of life, replaced, sold..."
                rows={3}
              />
            </div>
            <div>
              <Label>Disposal Value (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={disposeForm.value}
                onChange={(e) => setDisposeForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current book value: {formatCurrency(asset.current_book_value)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={handleDispose} disabled={statusChanging}>
              Confirm Disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TimelineEvent({ event }: { event: AssetEvent }) {
  const getEventIcon = () => {
    switch (event.event_type) {
      case 'created': return <Package className="h-4 w-4 text-green-500" />;
      case 'status_changed': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'kia_changed': return <DollarSign className="h-4 w-4 text-yellow-500" />;
      case 'depreciation_run': return <TrendingDown className="h-4 w-4 text-purple-500" />;
      case 'disposed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">{getEventIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{EVENT_LABELS[event.event_type] || event.event_type}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(event.created_at), 'PPP p')}
        </p>
        {event.previous_value && event.new_value && (
          <p className="text-xs text-muted-foreground mt-1">
            {JSON.stringify(event.previous_value)} → {JSON.stringify(event.new_value)}
          </p>
        )}
        {event.event_data && Object.keys(event.event_data).length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {Object.entries(event.event_data).map(([k, v]) => `${k}: ${v}`).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
