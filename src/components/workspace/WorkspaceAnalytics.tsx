import React from 'react';
import { useWorkspaceAnalytics } from '@/hooks/usePageActivity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  Eye, 
  Edit3, 
  TrendingUp, 
  FileText,
  Activity,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkspaceAnalyticsProps {
  workspaceId: string;
}

export function WorkspaceAnalytics({ workspaceId }: WorkspaceAnalyticsProps) {
  const { data, isLoading } = useWorkspaceAnalytics(workspaceId, 30);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pages?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalViews || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Total Edits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEdits || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Daily Activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((data.totalViews || 0) / 30)}
            </div>
            <p className="text-xs text-muted-foreground">Views per day</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top-pages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top-pages">Top Pages</TabsTrigger>
          <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="top-pages">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Most Viewed Pages
              </CardTitle>
              <CardDescription>
                Pages with the highest engagement in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topPages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No page views recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topPages?.map((page, index) => (
                    <div
                      key={page.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <span className="text-xl">
                        {page.icon_emoji || '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {page.title || 'Untitled'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {page.views}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent-activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest actions across all workspace pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentActivity?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {data.recentActivity?.map((activity: any) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30"
                      >
                        <div className="p-2 rounded-full bg-muted">
                          {activity.activity_type === 'view' && <Eye className="h-4 w-4" />}
                          {activity.activity_type === 'edit' && <Edit3 className="h-4 w-4" />}
                          {!['view', 'edit'].includes(activity.activity_type) && <Activity className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm capitalize">
                            {activity.activity_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
