import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Link2, Mail, AlertCircle, TrendingUp } from "lucide-react";
import { adminCandidateService } from "@/services/adminCandidateService";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function MergeStatusDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentMerges, setRecentMerges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResult, mergesResult] = await Promise.all([
        adminCandidateService.getMergeStats(),
        adminCandidateService.getRecentMerges(5)
      ]);

      if (statsResult.error) throw statsResult.error;
      if (mergesResult.error) throw mergesResult.error;

      setStats(statsResult.data);
      setRecentMerges(mergesResult.data || []);
    } catch (error) {
      console.error('Error loading merge stats:', error);
      toast.error('Failed to load merge statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merged</CardTitle>
            <Link2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.merged || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.total > 0 
                ? `${Math.round((stats.merged / stats.total) * 100)}% of total`
                : '0%'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invited</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.invited || 0}</div>
            <p className="text-xs text-muted-foreground">Pending registration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unlinked</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.unlinked || 0}</div>
            <p className="text-xs text-muted-foreground">Need invitation</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Average Data Completeness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">
              {stats?.avgCompleteness || 0}%
            </div>
            <Badge variant={
              (stats?.avgCompleteness || 0) >= 80 ? "default" :
              (stats?.avgCompleteness || 0) >= 50 ? "secondary" :
              "destructive"
            }>
              {(stats?.avgCompleteness || 0) >= 80 ? "Excellent" :
               (stats?.avgCompleteness || 0) >= 50 ? "Good" :
               "Needs Improvement"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Across all candidate profiles
          </p>
        </CardContent>
      </Card>

      {/* Recent Merges */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Merges</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMerges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent merges
            </p>
          ) : (
            <div className="space-y-3">
              {recentMerges.map((merge) => (
                <div 
                  key={merge.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{merge.full_name}</p>
                    <p className="text-sm text-muted-foreground">{merge.email}</p>
                  </div>
                  <Badge variant="outline">
                    {formatDistanceToNow(new Date(merge.merged_at), { addSuffix: true })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
