import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AssetFormData, InventoryAsset, AssetCategory, AssetType } from '@/hooks/useInventoryAssets';
import { CATEGORY_LABELS, INTANGIBLE_CATEGORIES } from '@/hooks/useInventoryCategories';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: InventoryAsset | null;
  onSave: (data: AssetFormData) => Promise<InventoryAsset | null>;
  onUpdate?: (id: string, data: Partial<AssetFormData>) => Promise<boolean>;
}

const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Straight-line' },
  { value: 'declining_balance', label: 'Declining Balance' },
  { value: 'none', label: 'None (No Depreciation)' },
];

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: 'it_hardware', label: 'Computers & IT' },
  { value: 'office_furniture', label: 'Office Furniture' },
  { value: 'software_purchased', label: 'Software (Purchased)' },
  { value: 'software_developed', label: 'Software (Developed)' },
  { value: 'development_costs', label: 'Development Costs' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_USEFUL_LIFE: Record<string, number> = {
  it_hardware: 3,
  office_furniture: 5,
  software_purchased: 3,
  software_developed: 5,
  development_costs: 5,
  other: 5,
};

export function AssetFormDialog({ open, onOpenChange, asset, onSave, onUpdate }: AssetFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [form, setForm] = useState({
    asset_name: '',
    description: '',
    category: 'it_hardware' as AssetCategory,
    purchase_date: new Date(),
    purchase_value_excl_vat: 0,
    vat_amount: 0,
    useful_life_years: 3,
    residual_value: 0,
    supplier: '',
    invoice_reference: '',
    invoice_file_url: '',
    cost_center: '',
    assigned_to: '',
    notes: '',
    kia_eligible: true,
    depreciation_method: 'straight_line',
  });

  useEffect(() => {
    if (asset) {
      setForm({
        asset_name: asset.asset_name,
        description: asset.description || '',
        category: asset.category,
        purchase_date: new Date(asset.purchase_date),
        purchase_value_excl_vat: asset.purchase_value_excl_vat,
        vat_amount: asset.vat_amount || 0,
        useful_life_years: asset.useful_life_years,
        residual_value: asset.residual_value || 0,
        supplier: asset.supplier || '',
        invoice_reference: asset.invoice_reference || '',
        invoice_file_url: asset.invoice_file_url || '',
        cost_center: asset.cost_center || '',
        assigned_to: asset.assigned_to || '',
        notes: asset.notes || '',
        kia_eligible: asset.kia_eligible ?? true,
        depreciation_method: 'straight_line',
      });
    } else {
      setForm({
        asset_name: '',
        description: '',
        category: 'it_hardware',
        purchase_date: new Date(),
        purchase_value_excl_vat: 0,
        vat_amount: 0,
        useful_life_years: 3,
        residual_value: 0,
        supplier: '',
        invoice_reference: '',
        invoice_file_url: '',
        cost_center: '',
        assigned_to: '',
        notes: '',
        kia_eligible: true,
        depreciation_method: 'straight_line',
      });
    }
  }, [asset, open]);

  const handleCategoryChange = (category: AssetCategory) => {
    setForm(prev => ({
      ...prev,
      category,
      useful_life_years: DEFAULT_USEFUL_LIFE[category] || 5,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `inventory-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, invoice_file_url: publicUrl }));
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload file');
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.asset_name.trim()) {
      toast.error('Asset name is required');
      return;
    }
    if (form.purchase_value_excl_vat <= 0) {
      toast.error('Purchase value must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const assetType: AssetType = INTANGIBLE_CATEGORIES.includes(form.category) ? 'intangible' : 'tangible';
      
      const formData: AssetFormData = {
        asset_name: form.asset_name,
        description: form.description || undefined,
        category: form.category,
        asset_type: assetType,
        purchase_date: format(form.purchase_date, 'yyyy-MM-dd'),
        purchase_value_excl_vat: form.purchase_value_excl_vat,
        vat_amount: form.vat_amount,
        useful_life_years: form.useful_life_years,
        residual_value: form.residual_value,
        supplier: form.supplier || undefined,
        invoice_reference: form.invoice_reference || undefined,
        invoice_file_url: form.invoice_file_url || undefined,
        cost_center: form.cost_center || undefined,
        assigned_to: form.assigned_to || undefined,
        notes: form.notes || undefined,
        kia_eligible: form.kia_eligible,
      };

      if (asset && onUpdate) {
        await onUpdate(asset.id, formData);
      } else {
        await onSave(formData);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = form.purchase_value_excl_vat + form.vat_amount;
  const annualDepreciation = form.useful_life_years > 0 
    ? (totalValue - form.residual_value) / form.useful_life_years 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="asset_name">Asset Name *</Label>
              <Input
                id="asset_name"
                value={form.asset_name}
                onChange={(e) => setForm(prev => ({ ...prev, asset_name: e.target.value }))}
                placeholder="e.g., MacBook Pro 16-inch"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => handleCategoryChange(v as AssetCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Purchase Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.purchase_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.purchase_date ? format(form.purchase_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={form.purchase_date} onSelect={(d) => d && setForm(prev => ({ ...prev, purchase_date: d }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase_value">Purchase Value (excl. VAT) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="purchase_value"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.purchase_value_excl_vat || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, purchase_value_excl_vat: parseFloat(e.target.value) || 0 }))}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vat_amount">VAT Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="vat_amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.vat_amount || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, vat_amount: parseFloat(e.target.value) || 0 }))}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="depreciation_method">Depreciation Method</Label>
              <Select value={form.depreciation_method} onValueChange={(v) => setForm(prev => ({ ...prev, depreciation_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPRECIATION_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="useful_life">Useful Life (years)</Label>
              <Input
                id="useful_life"
                type="number"
                min={1}
                max={50}
                value={form.useful_life_years}
                onChange={(e) => setForm(prev => ({ ...prev, useful_life_years: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div>
              <Label htmlFor="residual_value">Residual Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="residual_value"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.residual_value || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, residual_value: parseFloat(e.target.value) || 0 }))}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kia_eligible"
                  checked={form.kia_eligible}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, kia_eligible: !!checked }))}
                />
                <Label htmlFor="kia_eligible" className="cursor-pointer">KIA Eligible</Label>
              </div>
            </div>
          </div>

          {/* Calculated Values Preview */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="font-medium text-sm">Calculated Values</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Value:</span>
                <span className="ml-2 font-medium">€{totalValue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Annual Depreciation:</span>
                <span className="ml-2 font-medium">€{annualDepreciation.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Depreciation:</span>
                <span className="ml-2 font-medium">€{(annualDepreciation / 12).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Supplier & Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier / Vendor</Label>
              <Input
                id="supplier"
                value={form.supplier}
                onChange={(e) => setForm(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="e.g., Apple Store"
              />
            </div>

            <div>
              <Label htmlFor="invoice_reference">Invoice / Serial Number</Label>
              <Input
                id="invoice_reference"
                value={form.invoice_reference}
                onChange={(e) => setForm(prev => ({ ...prev, invoice_reference: e.target.value }))}
                placeholder="e.g., INV-2024-001"
              />
            </div>

            <div>
              <Label htmlFor="cost_center">Location / Cost Center</Label>
              <Input
                id="cost_center"
                value={form.cost_center}
                onChange={(e) => setForm(prev => ({ ...prev, cost_center: e.target.value }))}
                placeholder="e.g., Amsterdam Office"
              />
            </div>

            <div>
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Input
                id="assigned_to"
                value={form.assigned_to}
                onChange={(e) => setForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label>Receipt / Document</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="flex-1"
              />
              {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {form.invoice_file_url && (
              <a href={form.invoice_file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 inline-block">
                View uploaded document
              </a>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this asset..."
              rows={3}
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the asset..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {asset ? 'Update Asset' : 'Create Asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
