import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Percent, Save } from "lucide-react";

export function PartnerFeeConfig() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feeValue, setFeeValue] = useState<string>("");

  const { data: partners, isLoading } = useQuery({
    queryKey: ["partner-fee-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_billing_details")
        .select(`
          *,
          company:companies(
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateFeeMutation = useMutation({
    mutationFn: async ({ id, fee }: { id: string; fee: number }) => {
      const { error } = await (supabase as any)
        .from("partner_billing_details")
        .update({ default_fee_percentage: fee })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-fee-config"] });
      toast.success("Fee percentage updated successfully");
      setEditingId(null);
      setFeeValue("");
    },
    onError: (error) => {
      toast.error("Failed to update fee percentage");
      console.error(error);
    },
  });

  const handleEdit = (id: string, currentFee: number) => {
    setEditingId(id);
    setFeeValue(currentFee.toString());
  };

  const handleSave = (id: string) => {
    const fee = parseFloat(feeValue);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Please enter a valid percentage between 0 and 100");
      return;
    }
    updateFeeMutation.mutate({ id, fee });
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
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Partner Fee Configuration
        </CardTitle>
        <CardDescription>
          Configure placement fee percentages for each partner company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Fee Percentage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners?.map((partner: any) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">
                  {partner.company?.name || "Unknown Company"}
                </TableCell>
                <TableCell>
                  {editingId === partner.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={feeValue}
                        onChange={(e) => setFeeValue(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <span>{partner.default_fee_percentage}%</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === partner.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(partner.id)}
                        disabled={updateFeeMutation.isPending}
                      >
                        {updateFeeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setFeeValue("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(partner.id, partner.default_fee_percentage)}
                    >
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
  );
}
