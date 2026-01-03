import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Euro, TrendingDown, Calendar, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface OperatingExpense {
  id: string;
  expense_date: string;
  category_id: string | null;
  category_name: string;
  description: string;
  amount: number;
  currency: string;
  vendor: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  notes: string | null;
  created_at: string;
}

export default function ExpenseTracking() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category_name: '',
    description: '',
    amount: '',
    vendor: '',
    is_recurring: false,
  });
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['operating-expenses', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operating_expenses')
        .select('*')
        .gte('expense_date', `${currentYear}-01-01`)
        .lte('expense_date', `${currentYear}-12-31`)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as OperatingExpense[];
    },
  });

  // Add expense mutation
  const addExpense = useMutation({
    mutationFn: async (expense: {
      expense_date: string;
      category_name: string;
      description: string;
      amount: number;
      vendor: string | null;
      is_recurring: boolean;
      currency: string;
    }) => {
      const { error } = await supabase
        .from('operating_expenses')
        .insert([expense]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operating-expenses'] });
      toast.success('Expense added successfully');
      setIsDialogOpen(false);
      setNewExpense({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        category_name: '',
        description: '',
        amount: '',
        vendor: '',
        is_recurring: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete expense mutation
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('operating_expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operating-expenses'] });
      toast.success('Expense deleted');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.category_name || !newExpense.description || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    addExpense.mutate({
      expense_date: newExpense.expense_date,
      category_name: newExpense.category_name,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      vendor: newExpense.vendor || null,
      is_recurring: newExpense.is_recurring,
      currency: 'EUR',
    });
  };

  // Calculate summary stats
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const expensesByCategory = expenses?.reduce((acc, e) => {
    acc[e.category_name] = (acc[e.category_name] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>) || {};
  const recurringTotal = expenses?.filter(e => e.is_recurring).reduce((sum, e) => sum + e.amount, 0) || 0;

  const categoryColors: Record<string, string> = {
    'Salaries & Benefits': 'bg-blue-500',
    'Software & SaaS': 'bg-purple-500',
    'Office & Facilities': 'bg-green-500',
    'Marketing & Advertising': 'bg-orange-500',
    'Professional Services': 'bg-slate-500',
    'Travel & Entertainment': 'bg-cyan-500',
    'Other': 'bg-gray-500',
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']} showLoading>
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Expense Tracking</h1>
              <p className="text-muted-foreground">
                Track operating expenses for accurate profit calculations
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a new operating expense
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (EUR)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newExpense.category_name}
                      onValueChange={(value) => setNewExpense({ ...newExpense, category_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="What was this expense for?"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor (optional)</Label>
                    <Input
                      id="vendor"
                      placeholder="Company/vendor name"
                      value={newExpense.vendor}
                      onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addExpense.isPending}>
                      {addExpense.isPending ? 'Adding...' : 'Add Expense'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  YTD Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses?.length || 0} transactions
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Monthly Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalExpenses / 12)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on YTD
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recurring Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(recurringTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Subscriptions & fixed costs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${categoryColors[category] || 'bg-gray-500'}`} />
                      <span className="flex-1 text-sm">{category}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {((amount / totalExpenses) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>All operating expenses for {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : expenses?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expenses recorded yet</p>
                  <p className="text-sm">Add your first expense to start tracking</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses?.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.expense_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {expense.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {expense.vendor || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExpense.mutate(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
