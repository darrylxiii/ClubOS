import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Euro, TrendingDown, Calendar, Building2, Sparkles, RefreshCw, Pencil, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { useVendorSubscriptions } from "@/hooks/useVendorSubscriptions";
import ExpenseFormDialog from "@/components/financial/ExpenseFormDialog";
import RecurringExpensesPanel from "@/components/financial/RecurringExpensesPanel";
import ExpenseFilters from "@/components/financial/ExpenseFilters";

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
  receipt_url: string | null;
  vat_amount: number | null;
  created_at: string;
}

export default function ExpenseTracking() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<OperatingExpense | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recurringFilter, setRecurringFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

  const hasActiveFilters = search !== "" || categoryFilter !== "all" || recurringFilter !== "all" ||
    dateFrom !== `${currentYear}-01-01` || dateTo !== `${currentYear}-12-31`;

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setRecurringFilter("all");
    setDateFrom(`${currentYear}-01-01`);
    setDateTo(`${currentYear}-12-31`);
  };

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["operating-expenses", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operating_expenses")
        .select("*")
        .gte("expense_date", `${currentYear}-01-01`)
        .lte("expense_date", `${currentYear}-12-31`)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data as OperatingExpense[];
    },
  });

  // Vendor subscriptions for summary
  const { data: subscriptions } = useVendorSubscriptions("active");
  const totalSubsMonthly = subscriptions?.reduce((sum, s) => sum + s.monthly_cost, 0) || 0;
  const subsCount = subscriptions?.length || 0;

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (!e.description.toLowerCase().includes(q) && !(e.vendor || "").toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && e.category_name !== categoryFilter) return false;
      if (recurringFilter === "recurring" && !e.is_recurring) return false;
      if (recurringFilter === "one-time" && e.is_recurring) return false;
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      return true;
    });
  }, [expenses, search, categoryFilter, recurringFilter, dateFrom, dateTo]);

  // Recurring expenses
  const recurringExpenses = useMemo(
    () => (expenses || []).filter((e) => e.is_recurring),
    [expenses]
  );

  // Summary stats
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const monthsElapsed = new Date().getMonth() + 1;

  function normalizeToMonthly(amount: number, freq: string | null): number {
    switch (freq) {
      case "quarterly": return amount / 3;
      case "semi-annual": return amount / 6;
      case "annual": return amount / 12;
      default: return amount;
    }
  }

  const monthlyRecurringBurn = recurringExpenses.reduce(
    (sum, e) => sum + normalizeToMonthly(e.amount, e.recurring_frequency),
    0
  ) + totalSubsMonthly;

  // Delete mutation
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operating_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operating-expenses"] });
      toast.success("Expense deleted.");
    },
  });

  // AI categorize
  const handleAICategorize = async () => {
    const uncategorized = expenses?.filter((e) => !e.category_name || e.category_name === "Other") || [];
    if (uncategorized.length === 0) {
      toast.info("All expenses are already categorized.");
      return;
    }
    setIsCategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("categorize-expenses", {
        body: {
          expenses: uncategorized.slice(0, 20).map((e) => ({
            id: e.id,
            description: e.description,
            vendor: e.vendor,
            amount: e.amount,
          })),
        },
      });
      if (error) throw error;
      const categorizations = data?.categorizations || [];
      let updated = 0;
      for (const cat of categorizations) {
        if (cat.confidence >= 0.6) {
          const { error: updateErr } = await supabase
            .from("operating_expenses")
            .update({ category_name: cat.category })
            .eq("id", cat.id);
          if (!updateErr) updated++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["operating-expenses"] });
      toast.success(`Categorized ${updated} expenses using AI.`);
    } catch (err: any) {
      if (err?.status === 429) toast.error("Rate limit exceeded. Try again in a minute.");
      else if (err?.status === 402) toast.error("AI credits depleted. Please add funds.");
      else toast.error("AI categorization failed.");
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleEdit = (expense: OperatingExpense) => {
    setEditExpense(expense);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditExpense(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-muted-foreground">Track operating expenses, recurring costs, and vendor subscriptions</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAICategorize} disabled={isCategorizing}>
            <Sparkles className={`h-4 w-4 mr-2 ${isCategorizing ? "animate-pulse" : ""}`} />
            {isCategorizing ? "Categorizing..." : "AI Categorize"}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Euro className="h-4 w-4" />YTD Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">{expenses?.length || 0} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />Monthly Recurring Burn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(monthlyRecurringBurn)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {recurringExpenses.length} recurring + {subsCount} subscriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalSubsMonthly)}/mo</p>
            <p className="text-xs text-muted-foreground mt-1">{subsCount} active vendor subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />Avg Monthly Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses / monthsElapsed)}</p>
            <p className="text-xs text-muted-foreground mt-1">Based on {monthsElapsed} months</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Panel */}
      <RecurringExpensesPanel recurringExpenses={recurringExpenses} />

      {/* Expense Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Ledger</CardTitle>
          <CardDescription>All operating expenses for {currentYear}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <ExpenseFilters
            search={search}
            onSearchChange={setSearch}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            recurringFilter={recurringFilter}
            onRecurringFilterChange={setRecurringFilter}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            categories={categories || []}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No expenses found</p>
              <p className="text-sm">{hasActiveFilters ? "Try adjusting your filters." : "Add your first expense to start tracking."}</p>
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
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(expense.expense_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{expense.category_name}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.vendor || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {expense.vat_amount ? formatCurrency(expense.vat_amount) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.is_recurring ? (
                        <Badge variant="outline" className="text-[10px]">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {expense.recurring_frequency || "Monthly"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">One-time</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expense.receipt_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Receipt attached">
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteExpense.mutate(expense.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ExpenseFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditExpense(null);
        }}
        editExpense={editExpense}
      />
    </div>
  );
}
