import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Users, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeProfile {
  id: string;
  user_id: string;
  commission_tier_id: string | null;
  commission_percentage: number | null;
  annual_target: number;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string | null;
  } | null;
  commission_tiers: {
    name: string;
    percentage: number;
  } | null;
}

interface CommissionTier {
  id: string;
  name: string;
  percentage: number;
}

export function EmployeeCommissionSettings() {
  const queryClient = useQueryClient();

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employee-profiles-with-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select(`
          id,
          user_id,
          commission_tier_id,
          commission_percentage,
          annual_target,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          commission_tiers (
            name,
            percentage
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as EmployeeProfile[];
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["commission-tiers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_tiers")
        .select("id, name, percentage")
        .eq("is_active", true)
        .order("min_revenue", { ascending: true });

      if (error) throw error;
      return data as CommissionTier[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ 
      employeeId, 
      tierId, 
      annualTarget 
    }: { 
      employeeId: string; 
      tierId?: string | null; 
      annualTarget?: number;
    }) => {
      const updates: Record<string, any> = {};
      if (tierId !== undefined) updates.commission_tier_id = tierId;
      if (annualTarget !== undefined) updates.annual_target = annualTarget;

      const { error } = await supabase
        .from("employee_profiles")
        .update(updates)
        .eq("id", employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee settings updated");
      queryClient.invalidateQueries({ queryKey: ["employee-profiles-with-tiers"] });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update employee settings");
    },
  });

  if (loadingEmployees) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Employee Commission Settings
        </CardTitle>
        <CardDescription>
          Assign commission tiers and annual targets to employees
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Commission Tier</TableHead>
              <TableHead>Effective Rate</TableHead>
              <TableHead>Annual Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees?.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {employee.profiles?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{employee.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{employee.profiles?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={employee.commission_tier_id || "none"}
                    onValueChange={(value) => {
                      updateMutation.mutate({
                        employeeId: employee.id,
                        tierId: value === "none" ? null : value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select tier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tier</SelectItem>
                      {tiers?.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name} ({tier.percentage}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <TrendingUp className="h-3 w-3" />
                    {employee.commission_tiers?.percentage || employee.commission_percentage || 10}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="w-32"
                      value={employee.annual_target || 0}
                      onChange={(e) => {
                        updateMutation.mutate({
                          employeeId: employee.id,
                          annualTarget: Number(e.target.value),
                        });
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!employees || employees.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No employee profiles found. Create employee profiles first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
