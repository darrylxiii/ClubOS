import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpsertSubscriptionBudget } from '@/hooks/useSubscriptionBudgets';
import { Plus } from 'lucide-react';

const CATEGORIES = [
  'CRM & Sales',
  'Marketing & Outreach',
  'ATS & Recruitment',
  'Communication',
  'Productivity',
  'Infrastructure',
  'Analytics & BI',
  'HR & Payroll',
  'Other',
];

export function AddBudgetDialog() {
  const [open, setOpen] = useState(false);
  const upsert = useUpsertSubscriptionBudget();
  const [form, setForm] = useState({
    category: '',
    budget_amount: '',
    period_type: 'monthly',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.budget_amount) return;
    upsert.mutate(
      {
        category: form.category,
        budget_amount: parseFloat(form.budget_amount),
        period_type: form.period_type,
        year: new Date().getFullYear(),
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ category: '', budget_amount: '', period_type: 'monthly', notes: '' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Set Budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Category Budget</DialogTitle>
          <DialogDescription>Define a monthly spend limit for a subscription category.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monthly Budget (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="500.00"
              value={form.budget_amount}
              onChange={(e) => setForm({ ...form, budget_amount: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Budget rationale..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
