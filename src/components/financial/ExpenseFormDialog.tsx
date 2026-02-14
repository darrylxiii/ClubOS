import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";

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
  vendor: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  notes: string | null;
  receipt_url: string | null;
  vat_amount: number | null;
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

export default function ExpenseFormDialog({ open, onOpenChange, editExpense }: ExpenseFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editExpense;

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
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Reset form when editExpense changes
  useState(() => {
    if (editExpense) {
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
      });
    }
  });

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

      const { data: urlData } = supabase.storage
        .from("expense-receipts")
        .getPublicUrl(uploadData.path);

      // Use signed URL for private bucket
      const { data: signedData } = await supabase.storage
        .from("expense-receipts")
        .createSignedUrl(uploadData.path, 3600);

      const fileUrl = signedData?.signedUrl || urlData.publicUrl;
      setForm((prev) => ({ ...prev, receipt_url: uploadData.path }));

      // Parse receipt with AI
      setIsParsing(true);
      const { data: parsed, error: parseError } = await supabase.functions.invoke("parse-receipt", {
        body: { fileUrl },
      });

      if (!parseError && parsed) {
        setForm((prev) => ({
          ...prev,
          vendor: parsed.supplier || prev.vendor,
          amount: parsed.purchase_value_excl_vat?.toString() || prev.amount,
          vat_amount: parsed.vat_amount?.toString() || prev.vat_amount,
          description: parsed.description || parsed.asset_name || prev.description,
          expense_date: parsed.purchase_date || prev.expense_date,
        }));
        toast.success("Receipt parsed — fields pre-filled.");
      }
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [] },
    maxFiles: 1,
    disabled: isUploading || isParsing,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        expense_date: form.expense_date,
        category_name: form.category_name,
        description: form.description,
        amount: parseFloat(form.amount),
        vendor: form.vendor || null,
        is_recurring: form.is_recurring,
        recurring_frequency: form.is_recurring ? form.recurring_frequency || null : null,
        notes: form.notes || null,
        vat_amount: parseFloat(form.vat_amount) || 0,
        receipt_url: form.receipt_url || null,
        currency: "EUR",
      };

      if (isEdit && editExpense) {
        const { error } = await supabase
          .from("operating_expenses")
          .update(payload)
          .eq("id", editExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("operating_expenses")
          .insert([payload]);
        if (error) throw error;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update expense details." : "Record a new operating expense. Upload a receipt for AI-powered pre-fill."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Receipt Upload */}
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
                <span>{isParsing ? "Parsing receipt with AI..." : "Uploading..."}</span>
              </div>
            ) : form.receipt_url ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Receipt attached. Drop another to replace.</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Upload className="h-6 w-6" />
                <span className="text-sm">Drop receipt here or click to upload</span>
                <span className="text-xs">AI will extract vendor, amount, and date</span>
              </div>
            )}
          </div>

          {/* Date & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          {/* VAT */}
          <div className="space-y-2">
            <Label>VAT Amount (EUR, optional)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.vat_amount}
              onChange={(e) => setForm({ ...form, vat_amount: e.target.value })}
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
              placeholder="Company/vendor name"
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
              <Select value={form.recurring_frequency} onValueChange={(v) => setForm({ ...form, recurring_frequency: v })}>
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
