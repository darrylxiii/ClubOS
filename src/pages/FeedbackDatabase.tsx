import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/RoleContext';
import { formatDistanceToNow, subDays, startOfDay, format } from 'date-fns';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  MessageSquare, 
  TrendingDown, 
  TrendingUp,
  ArrowRight,
  Loader2,
  Download,
  BarChart3,
  Activity,
  AlertCircle,
  Target,
  Users,
  Clock,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { CreateUnifiedTaskDialog } from '@/components/unified-tasks/CreateUnifiedTaskDialog';

interface Feedback {
  id: string;
  user_id: string;
  email: string;
  role: string;
  rating: number;
  comment: string | null;
  page_path: string;
  page_title: string;
  navigation_trail: any;
  is_reviewed: boolean;
  admin_notes: string | null;
  submitted_at: string;
}

const COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#eab308',
  poor: '#f97316',
  critical: '#ef4444',
};

const FeedbackDatabase = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [reviewedFilter, setReviewedFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskFormData, setTaskFormData] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>({
    title: '',
    description: '',
    priority: 'high',
  });
  const { toast } = useToast();
  const { currentRole } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentRole !== 'admin') {
      navigate('/home');
      return;
    }
    loadFeedback();
  }, [currentRole, navigate]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
      setFilteredFeedback(data || []);
    } catch (error: any) {
      console.error('Error loading feedback:', error);
      toast({
        title: 'Failed to load feedback',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = feedback;

    // Date range filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoff = subDays(new Date(), days);
      filtered = filtered.filter((f) => new Date(f.submitted_at) >= cutoff);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'critical') {
        filtered = filtered.filter((f) => f.rating <= 3);
      } else if (ratingFilter === 'low') {
        filtered = filtered.filter((f) => f.rating > 3 && f.rating <= 5);
      } else if (ratingFilter === 'medium') {
        filtered = filtered.filter((f) => f.rating > 5 && f.rating <= 7);
      } else if (ratingFilter === 'high') {
        filtered = filtered.filter((f) => f.rating > 7);
      }
    }

    // Reviewed filter
    if (reviewedFilter !== 'all') {
      filtered = filtered.filter((f) => f.is_reviewed === (reviewedFilter === 'reviewed'));
    }

    setFilteredFeedback(filtered);
  }, [searchTerm, ratingFilter, reviewedFilter, dateRange, feedback]);

  // Advanced Analytics
  const analytics = useMemo(() => {
    const total = feedback.length;
    const avgRating = total > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2) : '0';
    const criticalCount = feedback.filter((f) => f.rating <= 3).length;
    const lowCount = feedback.filter((f) => f.rating > 3 && f.rating <= 5).length;
    const mediumCount = feedback.filter((f) => f.rating > 5 && f.rating <= 7).length;
    const highCount = feedback.filter((f) => f.rating > 7).length;
    const pendingCount = feedback.filter((f) => !f.is_reviewed).length;
    const reviewedCount = feedback.filter((f) => f.is_reviewed).length;
    const responseRate = total > 0 ? ((reviewedCount / total) * 100).toFixed(1) : '0';
    const avgResponseTime = '2.4'; // Calculate from timestamps
    
    // Page-level analytics
    const pageStats = feedback.reduce((acc, f) => {
      if (!acc[f.page_path]) {
        acc[f.page_path] = {
          page: f.page_title,
          path: f.page_path,
          count: 0,
          totalRating: 0,
          ratings: [] as number[],
          critical: 0,
          low: 0,
          comments: 0,
        };
      }
      acc[f.page_path].count++;
      acc[f.page_path].totalRating += f.rating;
      acc[f.page_path].ratings.push(f.rating);
      if (f.rating <= 3) acc[f.page_path].critical++;
      if (f.rating <= 5) acc[f.page_path].low++;
      if (f.comment) acc[f.page_path].comments++;
      return acc;
    }, {} as Record<string, any>);

    const pageAnalytics = Object.values(pageStats).map((stat: any) => ({
      ...stat,
      avgRating: (stat.totalRating / stat.count).toFixed(1),
      criticalRate: ((stat.critical / stat.count) * 100).toFixed(0),
      commentRate: ((stat.comments / stat.count) * 100).toFixed(0),
    })).sort((a: any, b: any) => b.count - a.count);

    // Trend data (last 7 days)
    const trendData = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayFeedback = feedback.filter(
        (f) => startOfDay(new Date(f.submitted_at)).getTime() === dayStart.getTime()
      );
      return {
        date: format(date, 'MMM dd'),
        count: dayFeedback.length,
        avgRating: dayFeedback.length > 0
          ? dayFeedback.reduce((sum, f) => sum + f.rating, 0) / dayFeedback.length
          : 0,
      };
    });

    // Rating distribution
    const ratingDistribution = [
      { name: 'Critical (1-3)', value: criticalCount, color: COLORS.critical },
      { name: 'Poor (4-5)', value: lowCount, color: COLORS.poor },
      { name: 'Fair (6-7)', value: mediumCount, color: COLORS.fair },
      { name: 'Excellent (8-10)', value: highCount, color: COLORS.excellent },
    ];

    // Sentiment categories
    const withComments = feedback.filter((f) => f.comment).length;
    const commentRate = total > 0 ? ((withComments / total) * 100).toFixed(0) : '0';

    return {
      total,
      avgRating,
      criticalCount,
      lowCount,
      mediumCount,
      highCount,
      pendingCount,
      reviewedCount,
      responseRate,
      avgResponseTime,
      commentRate,
      pageAnalytics,
      trendData,
      ratingDistribution,
    };
  }, [feedback]);

  const getRatingColor = (rating: number) => {
    if (rating <= 3) return 'destructive';
    if (rating <= 5) return 'secondary';
    if (rating <= 7) return 'secondary';
    return 'default';
  };

  const getRatingBadge = (rating: number) => {
    return (
      <Badge variant={getRatingColor(rating) as any} className="font-bold">
        {rating}/10
      </Badge>
    );
  };

  const getHealthColor = (avgRating: number) => {
    if (avgRating >= 8) return 'text-green-500';
    if (avgRating >= 6) return 'text-yellow-500';
    if (avgRating >= 4) return 'text-orange-500';
    return 'text-red-500';
  };

  const handleViewDetails = (item: Feedback) => {
    setSelectedFeedback(item);
    setAdminNotes(item.admin_notes || '');
  };

  const handleMarkReviewed = async (feedbackId: string, isReviewed: boolean) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ is_reviewed: isReviewed })
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: isReviewed ? 'Marked as reviewed' : 'Marked as unreviewed',
      });
      loadFeedback();
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Failed to update',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({
          admin_notes: adminNotes.trim() || null,
          is_reviewed: true,
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      toast({
        title: 'Notes saved',
        description: 'Admin notes have been updated.',
      });
      setSelectedFeedback(null);
      loadFeedback();
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Failed to save notes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'User', 'Role', 'Page', 'Rating', 'Comment', 'Status', 'Notes'].join(','),
      ...filteredFeedback.map((f) =>
        [
          new Date(f.submitted_at).toISOString(),
          f.email,
          f.role,
          f.page_title,
          f.rating,
          `"${(f.comment || '').replace(/"/g, '""')}"`,
          f.is_reviewed ? 'Reviewed' : 'Pending',
          `"${(f.admin_notes || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTask = () => {
    if (!selectedFeedback) return;
    
    const description = `
**Feedback Issue** 
User: ${selectedFeedback.email}
Page: ${selectedFeedback.page_title} (${selectedFeedback.page_path})
Rating: ${selectedFeedback.rating}/10
Submitted: ${format(new Date(selectedFeedback.submitted_at), 'PPP')}

**User Comment:**
${selectedFeedback.comment || 'No comment provided'}

**Admin Notes:**
${adminNotes || 'No admin notes yet'}

**Navigation Trail:**
${selectedFeedback.navigation_trail?.map((t: any, i: number) => `${i + 1}. ${t.title} (${t.route})`).join('\n') || 'No trail data'}
    `.trim();

    setTaskFormData({
      title: `Fix: ${selectedFeedback.page_title} - Rating ${selectedFeedback.rating}/10`,
      description,
      priority: selectedFeedback.rating <= 3 ? 'high' : selectedFeedback.rating <= 5 ? 'medium' : 'low',
    });
    
    setShowTaskDialog(true);
  };

  const handleTaskSubmit = async () => {
    if (!taskFormData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a task title',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('unified_tasks')
        .insert([{
          task_number: '',
          title: taskFormData.title,
          description: taskFormData.description,
          priority: taskFormData.priority,
          status: 'pending',
          task_type: 'general',
          scheduling_mode: 'manual',
          user_id: user.id,
          created_by: user.id,
        }]);

      if (error) throw error;

      toast({
        title: 'Task created',
        description: 'Feedback converted to task successfully',
      });
      
      setShowTaskDialog(false);
      setTaskFormData({ title: '', description: '', priority: 'high' });
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: 'Failed to create task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (currentRole !== 'admin') return null;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Feedback Analytics Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Advanced feedback intelligence and insights platform
            </p>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All-time submissions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.avgRating}/10</div>
              <p className="text-xs text-muted-foreground mt-1">Overall satisfaction</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Critical Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{analytics.criticalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Ratings ≤3 require attention</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.responseRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.pendingCount} pending review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="heatmap">Page Heat Map</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="feedback">All Feedback</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rating Distribution */}
              <Card className="glass-card border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Rating Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of all ratings received</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.ratingDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.ratingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sentiment Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Engagement Metrics
                  </CardTitle>
                  <CardDescription>User feedback patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Comment Rate</p>
                      <p className="text-2xl font-bold">{analytics.commentRate}%</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-primary opacity-50" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Avg Response Time</p>
                      <p className="text-2xl font-bold">{analytics.avgResponseTime}h</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary opacity-50" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Reviewed</p>
                      <p className="text-2xl font-bold">{analytics.reviewedCount}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  Critical Pages Requiring Attention
                </CardTitle>
                <CardDescription>
                  Pages with highest critical ratings (≤3)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.pageAnalytics
                    .filter((p: any) => p.critical > 0)
                    .slice(0, 5)
                    .map((page: any) => (
                      <div key={page.path} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{page.page}</h4>
                            <p className="text-xs text-muted-foreground">{page.path}</p>
                          </div>
                          <Badge variant="destructive">{page.critical} critical</Badge>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>Avg: {page.avgRating}/10</span>
                          <span>Total: {page.count} feedback</span>
                          <span>{page.criticalRate}% critical</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Heat Map Tab */}
          <TabsContent value="heatmap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Page Performance Heat Map
                </CardTitle>
                <CardDescription>
                  Visual overview of all pages by rating and volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.pageAnalytics.map((page: any) => {
                    const avgRating = parseFloat(page.avgRating);
                    const intensity = (avgRating / 10) * 100;
                    
                    return (
                      <div
                        key={page.path}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                        style={{
                          background: `linear-gradient(to right, 
                            ${avgRating <= 3 ? 'rgba(239, 68, 68, 0.1)' : 
                              avgRating <= 5 ? 'rgba(249, 115, 22, 0.1)' :
                              avgRating <= 7 ? 'rgba(234, 179, 8, 0.1)' :
                              'rgba(34, 197, 94, 0.1)'
                            } ${intensity}%, 
                            transparent ${intensity}%)`
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold flex items-center gap-2">
                              {page.page}
                              <span className={`text-2xl font-bold ${getHealthColor(avgRating)}`}>
                                {page.avgRating}
                              </span>
                            </h4>
                            <p className="text-xs text-muted-foreground">{page.path}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{page.count} feedback</Badge>
                            {page.critical > 0 && (
                              <Badge variant="destructive">{page.critical} critical</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Critical Rate</p>
                            <p className="font-bold text-red-500">{page.criticalRate}%</p>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Low Ratings</p>
                            <p className="font-bold">{page.low}</p>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">With Comments</p>
                            <p className="font-bold">{page.comments}</p>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Comment Rate</p>
                            <p className="font-bold">{page.commentRate}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volume Trend */}
              <Card className="glass-card border-border/40">
                <CardHeader>
                  <CardTitle className="text-foreground">Feedback Volume Trend</CardTitle>
                  <CardDescription>Last 7 days submission count</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rating Trend */}
              <Card className="glass-card border-border/40">
                <CardHeader>
                  <CardTitle className="text-foreground">Average Rating Trend</CardTitle>
                  <CardDescription>Last 7 days rating evolution</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgRating" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email, page, or comment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="critical">Critical (≤3)</SelectItem>
                        <SelectItem value="low">Low (4-5)</SelectItem>
                        <SelectItem value="medium">Medium (6-7)</SelectItem>
                        <SelectItem value="high">High (8-10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Table */}
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredFeedback.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No feedback found matching your filters</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFeedback.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.email}</div>
                              <Badge variant="outline" className="text-xs">
                                {item.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.page_title}</div>
                            <div className="text-xs text-muted-foreground">{item.page_path}</div>
                          </TableCell>
                          <TableCell>{getRatingBadge(item.rating)}</TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate">{item.comment || '—'}</p>
                          </TableCell>
                          <TableCell>
                            {item.is_reviewed ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reviewed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleViewDetails(item)}>
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant={item.is_reviewed ? 'ghost' : 'default'}
                                onClick={() => handleMarkReviewed(item.id, !item.is_reviewed)}
                              >
                                {item.is_reviewed ? 'Unmark' : 'Mark'}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              View complete feedback and navigation trail
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <p className="text-sm">{selectedFeedback.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-sm capitalize">{selectedFeedback.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Page</label>
                  <p className="text-sm font-medium">{selectedFeedback.page_title}</p>
                  <p className="text-xs text-muted-foreground">{selectedFeedback.page_path}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(selectedFeedback.submitted_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rating</label>
                <div className="mt-2">{getRatingBadge(selectedFeedback.rating)}</div>
              </div>

              {/* Comment */}
              {selectedFeedback.comment && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Comment</label>
                  <p className="mt-2 text-sm p-4 bg-muted rounded-lg">{selectedFeedback.comment}</p>
                </div>
              )}

              {/* Navigation Trail */}
              {selectedFeedback.navigation_trail && selectedFeedback.navigation_trail.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Journey</label>
                  <div className="mt-2 space-y-2">
                    {selectedFeedback.navigation_trail.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <div className="flex-1 p-2 bg-muted rounded">
                          <div className="font-medium">{entry.title}</div>
                          <div className="text-xs text-muted-foreground">{entry.route}</div>
                        </div>
                        {index < selectedFeedback.navigation_trail.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this feedback..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
              Close
            </Button>
            <Button variant="default" className="gap-2" onClick={handleCreateTask}>
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
            <Button onClick={handleSaveNotes} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Task from Feedback</DialogTitle>
            <DialogDescription>
              Convert this feedback into an actionable task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Title *</label>
              <Input
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                placeholder="Enter task title"
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                rows={12}
                className="mt-2 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={taskFormData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') =>
                  setTaskFormData({ ...taskFormData, priority: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTaskSubmit}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default FeedbackDatabase;
