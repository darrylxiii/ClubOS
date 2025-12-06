import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Building2, Percent, AlertTriangle, CheckCircle, Edit2, X, Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CompanyWithFee {
  id: string;
  name: string;
  placement_fee_percentage: number | null;
  logo_url: string | null;
  active_jobs_count: number;
  total_pipeline_value: number;
}

export function CompanyFeeManagement() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [bulkFee, setBulkFee] = useState("20");

  // Fetch companies with their fee status and job counts
  const { data: companies, isLoading } = useQuery({
    queryKey: ["company-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          placement_fee_percentage,
          logo_url,
          jobs (
            id,
            status,
            deal_value_override
          )
        `)
        .order("name");

      if (error) throw error;

      return (data || []).map((company: any) => ({
        id: company.id,
        name: company.name,
        placement_fee_percentage: company.placement_fee_percentage,
        logo_url: company.logo_url,
        active_jobs_count: (company.jobs || []).filter((j: any) => j.status === "published").length,
        total_pipeline_value: (company.jobs || []).reduce((sum: number, j: any) => sum + (j.deal_value_override || 0), 0),
      })) as CompanyWithFee[];
    },
  });

  // Update single company fee
  const updateFeeMutation = useMutation({
    mutationFn: async ({ companyId, fee }: { companyId: string; fee: number }) => {
      const { error } = await supabase
        .from("companies")
        .update({ placement_fee_percentage: fee })
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-fees"] });
      queryClient.invalidateQueries({ queryKey: ["deal-pipeline"] });
      toast.success("Fee percentage updated");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Failed to update fee percentage");
    },
  });

  // Bulk update fees for companies without fees
  const bulkUpdateMutation = useMutation({
    mutationFn: async (fee: number) => {
      const companiesWithoutFee = companies?.filter((c) => !c.placement_fee_percentage) || [];
      
      if (companiesWithoutFee.length === 0) {
        throw new Error("No companies need fee configuration");
      }

      const { error } = await supabase
        .from("companies")
        .update({ placement_fee_percentage: fee })
        .in("id", companiesWithoutFee.map((c) => c.id));

      if (error) throw error;
      return companiesWithoutFee.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["company-fees"] });
      queryClient.invalidateQueries({ queryKey: ["deal-pipeline"] });
      toast.success(`Updated ${count} companies with ${bulkFee}% fee`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update fees");
    },
  });

  const handleEdit = (company: CompanyWithFee) => {
    setEditingId(company.id);
    setEditValue(company.placement_fee_percentage?.toString() || "20");
  };

  const handleSave = (companyId: string) => {
    const fee = parseFloat(editValue);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Fee must be between 0 and 100");
      return;
    }
    updateFeeMutation.mutate({ companyId, fee });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const companiesWithoutFee = companies?.filter((c) => !c.placement_fee_percentage) || [];
  const companiesWithFee = companies?.filter((c) => c.placement_fee_percentage) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{companies?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Companies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-card/60 backdrop-blur-xl border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{companiesWithFee.length}</p>
                  <p className="text-sm text-muted-foreground">Fee Configured</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`bg-gradient-to-br backdrop-blur-xl border-border/50 ${
            companiesWithoutFee.length > 0 
              ? "from-destructive/10 to-card/60 border-destructive/20" 
              : "from-card/90 to-card/60"
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  companiesWithoutFee.length > 0 ? "bg-destructive/10" : "bg-muted"
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${
                    companiesWithoutFee.length > 0 ? "text-destructive" : "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{companiesWithoutFee.length}</p>
                  <p className="text-sm text-muted-foreground">Missing Fee</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bulk Update for Missing Fees */}
      <AnimatePresence>
        {companiesWithoutFee.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-lg">Companies Missing Fee Configuration</CardTitle>
                </div>
                <CardDescription>
                  {companiesWithoutFee.length} {companiesWithoutFee.length === 1 ? "company has" : "companies have"} no 
                  placement fee configured. Revenue calculations will be inaccurate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={bulkFee}
                      onChange={(e) => setBulkFee(e.target.value)}
                      className="w-20"
                      min={0}
                      max={100}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <Button
                    onClick={() => bulkUpdateMutation.mutate(parseFloat(bulkFee))}
                    disabled={bulkUpdateMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {bulkUpdateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Set Default Fee for All ({companiesWithoutFee.length})
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This will set the placement fee to {bulkFee}% for all companies without a configured fee.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Company Fee Table */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Company Fee Configuration</CardTitle>
          <CardDescription>
            Manage placement fee percentages for all partner companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Active Jobs</TableHead>
                <TableHead className="text-right">Fee %</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies?.map((company) => (
                <TableRow key={company.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{company.active_jobs_count}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === company.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 text-right"
                          min={0}
                          max={100}
                          autoFocus
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    ) : (
                      <span className={company.placement_fee_percentage ? "font-mono" : "text-muted-foreground"}>
                        {company.placement_fee_percentage 
                          ? `${company.placement_fee_percentage}%` 
                          : "Not set"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.placement_fee_percentage ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Missing
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Revenue calculations will be inaccurate</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === company.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSave(company.id)}
                          disabled={updateFeeMutation.isPending}
                        >
                          <Save className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancel}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(company)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
