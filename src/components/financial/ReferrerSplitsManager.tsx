import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users } from "lucide-react";

export function ReferrerSplitsManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedReferrer, setSelectedReferrer] = useState<string>("");
  const [splitPercentage, setSplitPercentage] = useState<string>("");

  const { data: splits, isLoading } = useQuery({
    queryKey: ["company-referrer-splits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_referrer_splits")
        .select(`
          *,
          company:companies(name),
          referrer:profiles(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: referrers } = useQuery({
    queryKey: ["referrers-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const createSplitMutation = useMutation({
    mutationFn: async (split: { company_id: string; referrer_id: string; split_percentage: number }) => {
      const { error } = await (supabase as any)
        .from("company_referrer_splits")
        .insert(split);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-referrer-splits"] });
      toast.success("Referrer split created successfully");
      setIsDialogOpen(false);
      setSelectedCompany("");
      setSelectedReferrer("");
      setSplitPercentage("");
    },
    onError: (error) => {
      toast.error("Failed to create referrer split");
      console.error(error);
    },
  });

  const deleteSplitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("company_referrer_splits")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-referrer-splits"] });
      toast.success("Referrer split deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete referrer split");
      console.error(error);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("company_referrer_splits")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-referrer-splits"] });
      toast.success("Referrer split updated successfully");
    },
  });

  const handleCreate = () => {
    const percentage = parseFloat(splitPercentage);
    if (!selectedCompany || !selectedReferrer || isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    createSplitMutation.mutate({
      company_id: selectedCompany,
      referrer_id: selectedReferrer,
      split_percentage: percentage,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referrer Splits Management
            </CardTitle>
            <CardDescription>
              Configure referral fee splits for each company
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Split
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Referrer Split</DialogTitle>
                <DialogDescription>
                  Assign a percentage of placement fees to a referrer for a specific company
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referrer">Referrer</Label>
                  <Select value={selectedReferrer} onValueChange={setSelectedReferrer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select referrer" />
                    </SelectTrigger>
                    <SelectContent>
                      {referrers?.map((referrer: any) => (
                        <SelectItem key={referrer.id} value={referrer.id}>
                          {referrer.full_name || referrer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Split Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={splitPercentage}
                      onChange={(e) => setSplitPercentage(e.target.value)}
                      placeholder="10.00"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={createSplitMutation.isPending}
                >
                  {createSplitMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Split
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Referrer</TableHead>
              <TableHead>Split %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {splits?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No referrer splits configured yet
                </TableCell>
              </TableRow>
            ) : (
              splits?.map((split: any) => (
                <TableRow key={split.id}>
                  <TableCell className="font-medium">
                    {split.company?.name}
                  </TableCell>
                  <TableCell>
                    {split.referrer?.full_name || split.referrer?.email}
                  </TableCell>
                  <TableCell>{split.split_percentage}%</TableCell>
                  <TableCell>
                    <Badge variant={split.is_active ? "default" : "secondary"}>
                      {split.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActiveMutation.mutate({ id: split.id, isActive: split.is_active })}
                      >
                        {split.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSplitMutation.mutate(split.id)}
                        disabled={deleteSplitMutation.isPending}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
