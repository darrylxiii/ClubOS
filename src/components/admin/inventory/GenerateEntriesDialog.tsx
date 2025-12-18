import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS } from '@/hooks/useInventoryCategories';
import { toast } from 'sonner';

interface GenerateEntriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  onGenerated: () => void;
}

interface PreviewEntry {
  asset_id: string;
  asset_name: string;
  inventory_number: string;
  category: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value_after: number;
  adjusted_amount: number;
  already_exists: boolean;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function GenerateEntriesDialog({ open, onOpenChange, year, month, onGenerated }: GenerateEntriesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewEntry[]>([]);

  useEffect(() => {
    if (open) {
      loadPreview();
    }
  }, [open, year, month]);

  const loadPreview = async () => {
    try {
      setLoading(true);

      // Get all active assets
      const { data: assets, error: assetsError } = await supabase
        .from('inventory_assets')
        .select('*')
        .eq('status', 'active');

      if (assetsError) throw assetsError;

      // Get existing entries for this period
      const { data: existingEntries } = await supabase
        .from('inventory_depreciation_ledger')
        .select('asset_id')
        .eq('period_year', year)
        .eq('period_month', month);

      const existingAssetIds = new Set((existingEntries || []).map(e => e.asset_id));

      const previewEntries: PreviewEntry[] = (assets || []).map(asset => {
        const bookValueStart = asset.current_book_value || asset.total_purchase_value || 0;
        const depreciation = asset.monthly_depreciation || 0;
        const residualValue = asset.residual_value || 0;
        const bookValueEnd = Math.max(residualValue, bookValueStart - depreciation);
        const actualDepreciation = bookValueStart > residualValue ? Math.min(depreciation, bookValueStart - residualValue) : 0;

        return {
          asset_id: asset.id,
          asset_name: asset.asset_name,
          inventory_number: asset.inventory_number,
          category: asset.category,
          depreciation_amount: actualDepreciation,
          accumulated_depreciation: (asset.accumulated_depreciation || 0) + actualDepreciation,
          book_value_after: bookValueEnd,
          adjusted_amount: actualDepreciation,
          already_exists: existingAssetIds.has(asset.id),
        };
      });

      setPreview(previewEntries);
    } catch (err) {
      console.error('Failed to load preview:', err);
      toast.error('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustAmount = (assetId: string, amount: number) => {
    setPreview(prev => prev.map(entry => 
      entry.asset_id === assetId 
        ? { ...entry, adjusted_amount: Math.max(0, amount) }
        : entry
    ));
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);

      const entriesToCreate = preview
        .filter(e => !e.already_exists && e.adjusted_amount > 0)
        .map(e => ({
          asset_id: e.asset_id,
          period_year: year,
          period_month: month,
          depreciation_amount: e.adjusted_amount,
          accumulated_depreciation: e.accumulated_depreciation,
          book_value_after: e.book_value_after,
          is_posted: false,
        }));

      if (entriesToCreate.length === 0) {
        toast.info('No new entries to create');
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from('inventory_depreciation_ledger')
        .insert(entriesToCreate);

      if (error) throw error;

      // Record the depreciation run
      const totalDepr = entriesToCreate.reduce((sum, e) => sum + e.depreciation_amount, 0);
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('inventory_depreciation_runs')
        .insert({
          period_year: year,
          period_month: month,
          total_entries: entriesToCreate.length,
          total_depreciation: totalDepr,
          run_type: existingEntries.length > 0 ? 'partial' : 'generate',
          run_by: user?.id || null,
          metadata: { 
            skipped_existing: existingEntries.length,
            adjusted_entries: preview.filter(e => e.adjusted_amount !== e.depreciation_amount).length
          },
        });

      toast.success(`Created ${entriesToCreate.length} depreciation entries`);
      onGenerated();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to generate entries:', err);
      toast.error('Failed to generate entries');
    } finally {
      setGenerating(false);
    }
  };

  const newEntries = preview.filter(e => !e.already_exists);
  const existingEntries = preview.filter(e => e.already_exists);
  const totalDepreciation = newEntries.reduce((sum, e) => sum + e.adjusted_amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Depreciation Entries</DialogTitle>
          <DialogDescription>
            Preview and adjust depreciation entries for {months[month - 1]} {year}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">New Entries</div>
                <div className="text-2xl font-bold">{newEntries.length}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Already Exists</div>
                <div className="text-2xl font-bold text-muted-foreground">{existingEntries.length}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Total Depreciation</div>
                <div className="text-2xl font-bold">{formatCurrency(totalDepreciation)}</div>
              </div>
            </div>

            {existingEntries.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm mb-4">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>{existingEntries.length} entries already exist for this period and will be skipped.</span>
              </div>
            )}

            {/* Preview Table */}
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Calculated</TableHead>
                    <TableHead className="text-right w-[140px]">Adjusted Amount</TableHead>
                    <TableHead className="text-right">Book Value After</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((entry) => (
                    <TableRow key={entry.asset_id} className={entry.already_exists ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="font-medium">{entry.asset_name}</div>
                        <div className="text-xs text-muted-foreground">{entry.inventory_number}</div>
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[entry.category] || entry.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.depreciation_amount)}</TableCell>
                      <TableCell className="text-right">
                        {entry.already_exists ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={entry.adjusted_amount}
                              onChange={(e) => handleAdjustAmount(entry.asset_id, parseFloat(e.target.value) || 0)}
                              className="pl-6 h-8 w-full text-right"
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.book_value_after)}</TableCell>
                      <TableCell>
                        {entry.already_exists ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Exists
                          </span>
                        ) : (
                          <span className="text-xs text-primary">New</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating || newEntries.length === 0}>
            {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate {newEntries.length} Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
