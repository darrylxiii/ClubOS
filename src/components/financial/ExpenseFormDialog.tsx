import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialAuditLog } from "@/hooks/useFinancialAuditLog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, FileText, Info, CheckCircle2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { useLiveFxRate } from "@/hooks/useLiveFxRate";
import { Currency, CURRENCY_SYMBOLS } from "@/lib/currencyConversion";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface OperatingExpense {
  id: string;
  expense_date: string;
  category_name: string;
  description: string;
  amount: number;
  currency: string;
  vendor: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  notes: string | null;
  receipt_url: string | null;
  vat_amount: number | null;
  amount_eur?: number | null;
}

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editExpense?: OperatingExpense | null;
}

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

const SUPPORTED_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'AED'];

export default function ExpenseFormDialog({ open, onOpenChange, editExpense }: ExpenseFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editExpense;
  const { logAction } = useFinancialAuditLog();

  const [currency, setCurrency] = useState<Currency>(
    (editExpense?.currency as Currency) || 'EUR'
  );

  const [form, setForm] = useState({
    expense_date: editExpense?.expense_date || format(new Date(), "yyyy-MM-dd"),
    category_name: editExpense?.category_name || "",
    description: editExpense?.description || "",
    amount: editExpense?.amount?.toString() || "",
    vendor: editExpense?.vendor || "",
    is_recurring: editExpense?.is_recurring || false,
    recurring_frequency: editExpense?.recurring_frequency || "",
    notes: editExpense?.notes || "",
    vat_amount: editExpense?.vat_amount?.toString() || "0",
    receipt_url: editExpense?.receipt_url || "",
    amount_eur: editExpense?.amount_eur?.toString() || editExpense?.amount?.toString() || "",
  });

  const { rate, toEur } = useLiveFxRate(currency);
  const isNonEur = currency !== 'EUR';

  // Auto-suggest EUR equivalent when currency changes
  useEffect(() => {
    if (!isNonEur) {
      setForm((prev) => ({ ...prev, amount_eur: prev.amount }));
      return;
    }
    const amt = parseFloat(form.amount);
    if (!isNaN(amt) && amt > 0) {
      setForm((prev) => ({ ...prev, amount_eur: toEur(amt).toString() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const handleAmountChange = (value: string) => {
    if (isNonEur) {
      const amt = parseFloat(value);
      setForm((prev) => ({
        ...prev,
        amount: value,
        amount_eur: !isNaN(amt) && amt > 0 ? toEur(amt).toString() : prev.amount_eur,
      }));
    } else {
      setForm((prev) => ({ ...prev, amount: value, amount_eur: value }));
    }
  };

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    if (c === 'EUR') {
      setForm((prev) => ({ ...prev, amount_eur: prev.amount }));
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFields, setParsedFields] = useState<string[] | null>(null);
  const [isVatExempt, setIsVatExempt] = useState(false);

  // Reset form when editExpense changes
  useEffect(() => {
    if (editExpense) {
      const c = (editExpense.currency as Currency) || 'EUR';
      setCurrency(c);
      setForm({
        expense_date: editExpense.expense_date,
        category_name: editExpense.category_name,
        description: editExpense.description,
        amount: editExpense.amount?.toString() || "",
        vendor: editExpense.vendor || "",
        is_recurring: editExpense.is_recurring,
        recurring_frequency: editExpense.recurring_frequency || "",
        notes: editExpense.notes || "",
        vat_amount: editExpense.vat_amount?.toString() || "0",
        receipt_url: editExpense.receipt_url || "",
        amount_eur: editExpense.amount_eur?.toString() || editExpense.amount?.toString() || "",
      });
      setParsedFields(null);
      setIsVatExempt(false);
    }
  }, [editExpense]);

  // Query expense categories from DB
  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("expense-receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from("expense-receipts")
        .createSignedUrl(uploadData.path, 3600);

      const { data: urlData } = supabase.storage
        .from("expense-receipts")
        .getPublicUrl(uploadData.path);

      const fileUrl = signedData?.signedUrl || urlData.publicUrl;
      setForm((prev) => ({ ...prev, receipt_url: uploadData.path }));

      setIsParsing(true);
      const { data: parsed, error: parseError } = await supabase.functions.invoke("parse-receipt", {
        body: { fileUrl },
      });

      if (!parseError && parsed) {
        const filled: string[] = [];

        // Auto-switch currency dropdown to match detected currency
        const detectedCurrency = (parsed.currency as Currency) || 'EUR';
        const newCurrency = SUPPORTED_CURRENCIES.includes(detectedCurrency) ? detectedCurrency : 'EUR';
        if (newCurrency !== currency) {
          setCurrency(newCurrency);
          filled.push(`Currency → ${newCurrency}`);
        }

        // Use net amount for the amount field; gross for EUR snapshot
        const rawAmount = parsed.amount_net ?? parsed.amount_gross ?? 0;
        const grossEur = newCurrency === 'EUR'
          ? (parsed.amount_gross ?? rawAmount)
          : toEur(parsed.amount_gross ?? rawAmount);

        const vatExempt = parsed.is_vat_exempt === true || (!parsed.vat_amount && parsed.vat_amount !== undefined);
        setIsVatExempt(vatExempt);

        setForm((prev) => {
          const next = { ...prev };

          if (parsed.supplier) { next.vendor = parsed.supplier; filled.push('Vendor'); }
          if (parsed.purchase_date) { next.expense_date = parsed.purchase_date; filled.push('Date'); }
          if (parsed.description) { next.description = parsed.description; filled.push('Description'); }

          if (rawAmount > 0) {
            next.amount = rawAmount.toString();
            next.amount_eur = grossEur.toFixed(2);
            filled.push('Amount');
          }

          next.vat_amount = (parsed.vat_amount ?? 0).toString();
          filled.push(vatExempt ? 'VAT (exempt → 0)' : 'VAT Amount');

          if (parsed.suggested_expense_category) {
            next.category_name = parsed.suggested_expense_category;
            filled.push('Category');
          }

          if (parsed.is_recurring_hint) {
            next.is_recurring = true;
            filled.push('Recurring');
            if (parsed.recurring_frequency_hint) {
              next.recurring_frequency = parsed.recurring_frequency_hint;
              filled.push('Frequency');
            }
          }

          if (parsed.invoice_reference) {
            next.notes = `Invoice ref: ${parsed.invoice_reference}`;
            filled.push('Invoice ref');
          }

          return next;
        });

        setParsedFields(filled);
        toast.success(`Receipt parsed — ${filled.length} fields filled automatically.`);
      } else {
        toast.error("Could not extract data from receipt. Please fill in manually.");
      }
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  }, [currency, toEur]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [] },
    maxFiles: 1,
    disabled: isUploading || isParsing,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amtEur = currency === 'EUR'
        ? parseFloat(form.amount)
        : parseFloat(form.amount_eur) || toEur(parseFloat(form.amount));

      const payload = {
        expense_date: form.expense_date,
        category_name: form.category_name,
        description: form.description,
        amount: parseFloat(form.amount),
        currency,
        amount_eur: amtEur,
        vendor: form.vendor || null,
        is_recurring: form.is_recurring,
        recurring_frequency: form.is_recurring ? form.recurring_frequency || null : null,
        notes: form.notes || null,
        vat_amount: parseFloat(form.vat_amount) || 0,
        receipt_url: form.receipt_url || null,
      };

      if (isEdit && editExpense) {
        const { error } = await supabase
          .from("operating_expenses")
          .update(payload)
          .eq("id", editExpense.id);
        if (error) throw error;
        logAction({ action: 'expense.updated', entityType: 'operating_expense', entityId: editExpense.id, oldValue: editExpense as any, newValue: payload as any });
      } else {
        const { data: inserted, error } = await supabase
          .from("operating_expenses")
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        logAction({ action: 'expense.created', entityType: 'operating_expense', entityId: inserted?.id, newValue: payload as any });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operating-expenses"] });
      toast.success(isEdit ? "Expense updated." : "Expense added.");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_name || !form.description || !form.amount) {
      toast.error("Please fill in all required fields.");
      return;
    }
    saveMutation.mutate();
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency];
  const eurRate = isNonEur ? `1 ${currency} ≈ €${(1 / rate).toFixed(4)}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update expense details."
              : "Record a new operating expense. Upload a receipt or invoice for AI-powered pre-fill."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Receipt / Invoice Upload */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            {isUploading || isParsing ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{isParsing ? "Parsing invoice with AI (QUIN)..." : "Uploading..."}</span>
              </div>
            ) : form.receipt_url ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Receipt attached. Drop another to replace.</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Drop PDF or image invoice here</span>
                <span className="text-xs">QUIN will extract vendor, amount, VAT, currency, category & more</span>
              </div>
            )}
          </div>

          {/* Parsed fields confirmation banner */}
          {parsedFields && parsedFields.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">QUIN filled {parsedFields.length} fields automatically</p>
                <p className="text-xs text-muted-foreground mt-0.5">{parsedFields.join(' · ')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Review and adjust if needed before saving.</p>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ({currency})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={form.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CURRENCY_SYMBOLS[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* EUR Equivalent — only shown for non-EUR */}
          {isNonEur && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                EUR Equivalent
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={form.amount_eur}
                  onChange={(e) => setForm({ ...form, amount_eur: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" />
                Suggested rate: {eurRate} · pre-filled from live feed. You can override.
              </p>
            </div>
          )}

          {/* VAT — label uses original currency, shows exempt badge if detected */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              VAT Amount ({currency}, optional)
              {isVatExempt && (
                <Badge variant="secondary" className="text-xs font-normal">
                  VAT exempt — set to 0
                </Badge>
              )}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.vat_amount}
              onChange={(e) => { setIsVatExempt(false); setForm({ ...form, vat_amount: e.target.value }); }}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category_name} onValueChange={(v) => setForm({ ...form, category_name: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="What was this expense for?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Input
              placeholder="Company / vendor name"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Recurring Expense</Label>
              <p className="text-xs text-muted-foreground">Mark as a recurring cost</p>
            </div>
            <Switch
              checked={form.is_recurring}
              onCheckedChange={(checked) => setForm({ ...form, is_recurring: checked })}
            />
          </div>

          {form.is_recurring && (
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={form.recurring_frequency}
                onValueChange={(v) => setForm({ ...form, recurring_frequency: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : isEdit ? "Update Expense" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
