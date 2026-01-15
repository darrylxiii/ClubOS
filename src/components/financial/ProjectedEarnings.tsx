import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";

export function ProjectedEarnings() {
  const { data: projections, isLoading, refetch } = useQuery({
    queryKey: ["projected-earnings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projected_earnings")
        .select(`
          *,
          application:applications(
            position,
            status,
            current_stage_index
          ),
          company:companies(name),
          candidate:candidate_profiles(
            full_name,
            email
          )
        `)
        .order("projected_fee_amount", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("calculate_projected_earnings");
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Projections recalculated successfully");
    },
    onError: (error) => {
      toast.error("Failed to recalculate projections");
      console.error(error);
    },
  });

  const totalProjected = projections?.reduce((sum, p) => sum + Number(p.projected_fee_amount), 0) || 0;
  const highConfidence = projections?.filter(p => p.confidence_score >= 0.7).reduce((sum, p) => sum + Number(p.projected_fee_amount), 0) || 0;

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default">High</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
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
              <TrendingUp className="h-5 w-5" />
              Projected Earnings
            </CardTitle>
            <CardDescription>
              Revenue predictions based on active candidates
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
          >
            {recalculateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Projected</p>
            <p className="text-2xl font-bold">{formatCurrency(totalProjected)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">High Confidence</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(highConfidence)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active Candidates</p>
            <p className="text-2xl font-bold">{projections?.length || 0}</p>
          </div>
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Projected Fee</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Split</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No active candidates with salary information
                  </TableCell>
                </TableRow>
              ) : (
                projections?.map((projection) => (
                  <TableRow key={projection.id}>
                    <TableCell className="font-medium">
                      {projection.candidate?.full_name || projection.candidate?.email || "Unknown"}
                    </TableCell>
                    <TableCell>{projection.application?.position}</TableCell>
                    <TableCell>{projection.company?.name}</TableCell>
                    <TableCell>{formatCurrency(Number(projection.estimated_salary))}</TableCell>
                    <TableCell>{projection.fee_percentage}%</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(projection.projected_fee_amount))}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getConfidenceBadge(projection.confidence_score)}
                        <Progress value={projection.confidence_score * 100} className="h-1" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(projection.referrer_splits) && projection.referrer_splits.length > 0 ? (
                        <Badge variant="secondary">
                          {projection.referrer_splits.length} referrer{projection.referrer_splits.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
