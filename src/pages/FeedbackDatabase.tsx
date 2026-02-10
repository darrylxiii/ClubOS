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
import { useToast } from '@/lib/notify';
import { useRole } from '@/contexts/RoleContext';
import { formatDistanceToNow, subDays, startOfDay, format } from 'date-fns';
import { SectionLoader } from '@/components/ui/unified-loader';
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
import { useRecharts } from '@/hooks/useRecharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateUnifiedTaskDialog } from '@/components/unified-tasks/CreateUnifiedTaskDialog';
import { ErrorLogsTab } from '@/components/feedback/ErrorLogsTab';

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
  resolution_status: 'pending' | 'acknowledged' | 'in_progress' | 'fixed' | 'wont_fix';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_message: string | null;
  resolution_conversation_id: string | null;
  resolver?: {
    full_name: string;
  };
}

const COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#eab308',
  poor: '#f97316',
  critical: '#ef4444',
};

const FeedbackDatabase = () => {
  const { recharts, isLoading: chartsLoading } = useRecharts();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [reviewedFilter, setReviewedFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [resolutionDialog, setResolutionDialog] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<'acknowledged' | 'in_progress' | 'fixed' | 'wont_fix'>('fixed');
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskInitialData, setTaskInitialData] = useState<{
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
      
      // Fetch resolver profiles separately if needed
      const feedbackWithResolvers = await Promise.all(
        (data || []).map(async (item) => {
          if (item.resolved_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', item.resolved_by)
              .single();
            
            return { ...item, resolver: profile || undefined } as Feedback;
          }
          return item as Feedback;
        })
      );
      
      setFeedback(feedbackWithResolvers);
      setFilteredFeedback(feedbackWithResolvers);
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
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((f) => f.resolution_status === statusFilter);
    }

    setFilteredFeedback(filtered);
  }, [searchTerm, ratingFilter, reviewedFilter, dateRange, feedback, statusFilter]);

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
Feedback Issue
User: ${selectedFeedback.email}
Page: ${selectedFeedback.page_title} (${selectedFeedback.page_path})
Rating: ${selectedFeedback.rating}/10
Submitted: ${format(new Date(selectedFeedback.submitted_at), 'PPP')}

User Comment:
${selectedFeedback.comment || 'No comment provided'}

Admin Notes:
${adminNotes || 'No admin notes yet'}

Navigation Trail:
${selectedFeedback.navigation_trail?.map((t: any, i: number) => `${i + 1}. ${t.title} (${t.route})`).join('\n') || 'No trail data'}
    `.trim();

    setTaskInitialData({
      title: `Fix: ${selectedFeedback.page_title} - Rating ${selectedFeedback.rating}/10 - ${selectedFeedback.email}`,
      description,
      priority: selectedFeedback.rating <= 3 ? 'high' : selectedFeedback.rating <= 5 ? 'medium' : 'low',
    });
    
    setShowTaskDialog(true);
  };

  const handleTaskCreated = () => {
    toast({
      title: 'Task created',
      description: 'Feedback converted to task successfully',
    });
    setShowTaskDialog(false);
  };

  const getResolutionStatusBadge = (status: string) => {
    const variants: Record<string, {variant: any, label: string, icon?: any}> = {
      pending: { variant: 'secondary', label: 'Pending' },
      acknowledged: { variant: 'default', label: 'Acknowledged' },
      in_progress: { variant: 'default', label: 'In Progress' },
      fixed: { variant: 'default', label: 'Fixed' },
      wont_fix: { variant: 'destructive', label: "Won't Fix" }
    };
    
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={status === 'fixed' ? 'bg-green-500' : ''}>
        {config.label}
      </Badge>
    );
  };

  const handleResolve = async () => {
    if (!selectedFeedback || !resolutionMessage.trim()) {
      toast({ 
        title: 'Message required', 
        description: 'Please provide a response message', 
        variant: 'destructive' 
      });
      return;
    }

    setSendingResponse(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-feedback-response', {
        body: {
          feedback_id: selectedFeedback.id,
          resolution_status: resolutionStatus,
          resolution_message: resolutionMessage,
          resolved_by: user.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Feedback resolved',
        description: `Response sent to ${selectedFeedback.email}. Conversation created.`
      });
      
      setResolutionDialog(false);
      setResolutionMessage('');
      setSelectedFeedback(null);
      loadFeedback();
    } catch (error: any) {
      console.error('Error resolving feedback:', error);
      toast({
        title: 'Failed to resolve',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSendingResponse(false);
    }
  };

  // Render charts with lazy loading
  const renderCharts = () => {
    if (chartsLoading || !recharts) {
      return (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Feedback Trend (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }

    const { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } = recharts;

    return (
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feedback Trend (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="avgRating" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.ratingDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name.split(' ')[0]}: ${value}` : ''}
                >
                  {analytics.ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Feedback Analytics
            </h1>
            <p className="text-muted-foreground text-sm">
              Monitor user satisfaction and track improvements
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="feedback">All Feedback</TabsTrigger>
            <TabsTrigger value="pages">Page Analytics</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{analytics.total}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Avg Rating</span>
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${getHealthColor(parseFloat(analytics.avgRating))}`}>
                    {analytics.avgRating}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">Critical</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-red-500">{analytics.criticalCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{analytics.pendingCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Response Rate</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{analytics.responseRate}%</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs text-muted-foreground">Comment Rate</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{analytics.commentRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {renderCharts()}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search email, page, or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="critical">Critical (1-3)</SelectItem>
                  <SelectItem value="low">Low (4-5)</SelectItem>
                  <SelectItem value="medium">Medium (6-7)</SelectItem>
                  <SelectItem value="high">High (8-10)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="wont_fix">Won't Fix</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No feedback found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFeedback.slice(0, 50).map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(item)}>
                        <TableCell className="text-xs">
                          {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[150px]">{item.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.role}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">{item.page_title}</TableCell>
                        <TableCell>{getRatingBadge(item.rating)}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_reviewed ? 'default' : 'secondary'}>
                            {item.is_reviewed ? 'Reviewed' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getResolutionStatusBadge(item.resolution_status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(item); }}>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="pages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
                <CardDescription>Feedback metrics by page</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Feedback Count</TableHead>
                      <TableHead>Avg Rating</TableHead>
                      <TableHead>Critical Rate</TableHead>
                      <TableHead>Comment Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.pageAnalytics.slice(0, 20).map((page: any) => (
                      <TableRow key={page.path}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{page.page}</p>
                            <p className="text-xs text-muted-foreground">{page.path}</p>
                          </div>
                        </TableCell>
                        <TableCell>{page.count}</TableCell>
                        <TableCell>
                          <span className={getHealthColor(parseFloat(page.avgRating))}>{page.avgRating}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={parseInt(page.criticalRate) > 20 ? 'destructive' : 'secondary'}>
                            {page.criticalRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>{page.commentRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="errors">
            <ErrorLogsTab />
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Feedback Details</DialogTitle>
              <DialogDescription>
                {selectedFeedback?.email} • {selectedFeedback?.page_title}
              </DialogDescription>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    {getRatingBadge(selectedFeedback.rating)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    {getResolutionStatusBadge(selectedFeedback.resolution_status)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm">{format(new Date(selectedFeedback.submitted_at), 'PPP pp')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="text-sm capitalize">{selectedFeedback.role}</p>
                  </div>
                </div>

                {selectedFeedback.comment && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">User Comment</p>
                    <Card className="p-3">
                      <p className="text-sm">{selectedFeedback.comment}</p>
                    </Card>
                  </div>
                )}

                {selectedFeedback.navigation_trail && selectedFeedback.navigation_trail.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Navigation Trail</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFeedback.navigation_trail.map((trail: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {trail.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFeedback.resolved_at && (
                  <div className="bg-green-500/10 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                    <p className="text-sm">{selectedFeedback.resolution_message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Resolved by {selectedFeedback.resolver?.full_name} on {format(new Date(selectedFeedback.resolved_at), 'PPP')}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                  <Textarea
                    placeholder="Add notes about this feedback..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCreateTask} className="gap-1">
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
              {selectedFeedback && selectedFeedback.resolution_status === 'pending' && (
                <Button variant="outline" onClick={() => setResolutionDialog(true)}>
                  Resolve & Respond
                </Button>
              )}
              <Button onClick={handleSaveNotes} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolution Dialog */}
        <Dialog open={resolutionDialog} onOpenChange={setResolutionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Feedback</DialogTitle>
              <DialogDescription>
                Send a response to {selectedFeedback?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm mb-2">Resolution Status</p>
                <Select value={resolutionStatus} onValueChange={(v: any) => setResolutionStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="wont_fix">Won't Fix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm mb-2">Response Message</p>
                <Textarea
                  placeholder="Write your response to the user..."
                  value={resolutionMessage}
                  onChange={(e) => setResolutionMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolutionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={sendingResponse}>
                {sendingResponse ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Task Dialog */}
        <CreateUnifiedTaskDialog
          objectiveId={null}
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          initialTitle={taskInitialData.title}
          initialDescription={taskInitialData.description}
          initialPriority={taskInitialData.priority}
          onTaskCreated={handleTaskCreated}
        >
          <span />
        </CreateUnifiedTaskDialog>
      </div>
    </div>
  );
};

export default FeedbackDatabase;
