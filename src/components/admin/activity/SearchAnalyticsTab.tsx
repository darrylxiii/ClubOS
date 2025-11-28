import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function SearchAnalyticsTab() {
  const { data: searchData } = useQuery({
    queryKey: ['search-analytics'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      
      const { data: searches } = await supabase
        .from('user_search_analytics')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      const queryStats = (searches || []).reduce((acc: any, search: any) => {
        const query = search.search_query.toLowerCase();
        if (!acc[query]) {
          acc[query] = {
            query,
            count: 0,
            totalResults: 0,
            clicks: 0,
            zeroResults: 0,
            avgTimeToClick: 0,
            category: search.search_category
          };
        }
        acc[query].count += 1;
        acc[query].totalResults += search.results_count || 0;
        if (search.clicked_result_position) acc[query].clicks += 1;
        if (search.results_count === 0) acc[query].zeroResults += 1;
        if (search.time_to_first_click_ms) {
          acc[query].avgTimeToClick += search.time_to_first_click_ms;
        }
        return acc;
      }, {});

      const topQueries = Object.values(queryStats)
        .map((q: any) => ({
          ...q,
          avgResults: q.count > 0 ? Math.round(q.totalResults / q.count) : 0,
          clickRate: q.count > 0 ? Math.round((q.clicks / q.count) * 100) : 0,
          zeroResultRate: q.count > 0 ? Math.round((q.zeroResults / q.count) * 100) : 0,
          avgTimeToClick: q.clicks > 0 ? Math.round(q.avgTimeToClick / q.clicks) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      const zeroResultQueries = topQueries.filter(q => q.zeroResultRate > 50);

      return {
        recentSearches: searches || [],
        topQueries,
        zeroResultQueries
      };
    },
    refetchInterval: 60000
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searchData?.recentSearches?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Queries</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searchData?.topQueries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Different searches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zero Results</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searchData?.zeroResultQueries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Queries with no results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {searchData?.topQueries?.[0]?.avgTimeToClick
                ? `${Math.round(searchData.topQueries[0].avgTimeToClick / 1000)}s`
                : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">Time to first click</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Search Queries</CardTitle>
          <CardDescription>Most frequently searched terms</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={searchData?.topQueries?.slice(0, 10) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="query" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Searches" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Search Performance</CardTitle>
            <CardDescription>Click rates and result counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchData?.topQueries && searchData.topQueries.length > 0 ? (
                searchData.topQueries.slice(0, 10).map((query: any) => (
                  <div key={query.query} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{query.query}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {query.count} searches
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {query.avgResults} avg results
                        </Badge>
                        <Badge variant={query.clickRate > 50 ? 'default' : 'secondary'} className="text-xs">
                          {query.clickRate}% click rate
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No search data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zero Result Queries</CardTitle>
            <CardDescription>Searches that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchData?.zeroResultQueries && searchData.zeroResultQueries.length > 0 ? (
                searchData.zeroResultQueries.map((query: any) => (
                  <div key={query.query} className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{query.query}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {query.count} searches • {query.zeroResultRate}% zero results
                      </p>
                    </div>
                    <Badge variant="destructive">No results</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">All searches returning results 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
