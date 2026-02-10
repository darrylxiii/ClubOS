import { useState } from "react";
import { GameResultsSkeleton } from "@/components/LoadingSkeletons";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Users, Clock, Search, Eye, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionTitle } from "@/components/ui/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SwipeGameAdmin() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-swipe-game-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_results")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("assessment_name", "Would You Rather?")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-swipe-game-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_results")
        .select("score, time_spent_seconds")
        .eq("assessment_name", "Would You Rather?");

      if (error) throw error;

      const totalCompletions = data?.length || 0;
      const avgScore = data?.length
        ? data.reduce((sum, r) => sum + (r.score || 0), 0) / data.length
        : 0;
      const avgTime = data?.length
        ? data.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / data.length
        : 0;

      return { totalCompletions, avgScore, avgTime };
    },
  });

  const filteredResults = results?.filter((result) => {
    const name = (result.profiles as any)?.full_name?.toLowerCase() || "";
    const email = (result.profiles as any)?.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCompletions || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgScore?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((stats?.avgTime || 0) / 60)} min
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <SectionTitle>All Results</SectionTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GameResultsSkeleton />
          ) : filteredResults?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults?.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {(result.profiles as any)?.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(result.profiles as any)?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={result.score && result.score >= 70 ? "default" : "secondary"}>
                        {result.score || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Math.round((result.time_spent_seconds || 0) / 60)} min
                    </TableCell>
                    <TableCell>
                      {format(new Date(result.completed_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/candidate/${result.user_id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Profile
                        </Link>
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
  );
}
