import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from '@/lib/motion';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Inbox,
  ArrowRight,
  Zap,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Clock,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { useCRMProspects } from '@/hooks/useCRMProspects';
import { useCRMCampaigns } from '@/hooks/useCRMCampaigns';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { useCopyPerformance } from '@/hooks/useCopyPerformance';
import { Skeleton } from '@/components/ui/skeleton';
import { CRMActivityReminderBell } from '@/components/crm/CRMActivityReminderBell';
import { CRMRealtimeProvider } from '@/components/crm/CRMRealtimeProvider';

const STAGE_ORDER = ['new', 'contacted', 'interested', 'qualified', 'meeting_booked', 'proposal_sent', 'won'];
const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-cyan-500',
  interested: 'bg-amber-500',
  qualified: 'bg-emerald-500',
  meeting_booked: 'bg-violet-500',
  proposal_sent: 'bg-pink-500',
  won: 'bg-green-500',
};

export default function CRMDashboard() {
  const { prospects, loading: prospectsLoading } = useCRMProspects({ limit: 500 });
  const { campaigns, loading: campaignsLoading } = useCRMCampaigns({ limit: 100 });
  const { replies, loading: repliesLoading } = useCRMEmailReplies({ isActioned: false, limit: 100 });
  const { activities: overdueActivities, loading: activitiesLoading } = useCRMActivities({ overdue: true, limit: 5 });
  const { learnings, loading: learningsLoading } = useCopyPerformance();

  const loading = prospectsLoading || campaignsLoading || repliesLoading;

  // KPI calculations
  const totalProspects = prospects.length;
  const hotLeads = prospects.filter(p => p.reply_sentiment === 'hot').length;
  const meetingsBooked = prospects.filter(p => p.stage === 'meeting_booked').length;
  const unreadReplies = replies.filter(r => !r.is_read).length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.total_replied || 0), 0);
  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0';

  // Pipeline stage counts
  const stageCounts = STAGE_ORDER.map(stage => ({
    stage,
    count: prospects.filter(p => p.stage === stage).length,
    label: stage.replace(/_/g, ' '),
  }));
  const maxStageCount = Math.max(...stageCounts.map(s => s.count), 1);

  // Hot replies needing response
  const hotReplies = replies.filter(r => !r.is_read).slice(0, 4);

  const kpis = [
    { label: 'Total Prospects', value: totalProspects, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Hot Leads', value: hotLeads, icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Meetings Booked', value: meetingsBooked, icon: Calendar, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Unread Replies', value: unreadReplies, icon: Inbox, color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/crm/inbox' },
    { label: 'Active Campaigns', value: activeCampaigns, icon: Megaphone, color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/crm/campaigns' },
    { label: 'Reply Rate (7d)', value: `${replyRate}%`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <CRMRealtimeProvider>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Command Center
                </h1>
                <p className="text-muted-foreground mt-1">
                  Your CRM at a glance
                </p>
              </div>
              <CRMActivityReminderBell />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/crm/campaigns">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Campaigns
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/crm/inbox">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {unreadReplies > 0 && (
                    <Badge variant="destructive" className="mr-2 text-xs">{unreadReplies}</Badge>
                  )}
                  Inbox
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 hover:border-border/50 transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                        <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                      </div>
                      <div className="min-w-0">
                        {loading ? (
                          <Skeleton className="h-6 w-10" />
                        ) : (
                          <p className="text-xl font-bold">{kpi.value}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Priority Actions + Pipeline Mini-bars */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Priority Actions — 2/3 width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 space-y-4"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Priority Actions
              </h2>

              {/* Overdue activities */}
              {activitiesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : overdueActivities.length > 0 ? (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                      <Clock className="w-4 h-4" />
                      Overdue ({overdueActivities.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1.5">
                    {overdueActivities.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20 text-sm">
                        <span className="truncate">{a.subject}</span>
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">{a.activity_type}</Badge>
                      </div>
                    ))}
                    <Link to="/crm/focus" className="text-xs text-primary hover:underline flex items-center gap-1 pt-1">
                      View all in Focus View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="p-4 text-sm text-green-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    No overdue activities. You're on track.
                  </CardContent>
                </Card>
              )}

              {/* Hot replies */}
              {hotReplies.length > 0 && (
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-purple-500" />
                      Unread Replies ({unreadReplies})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1.5">
                    {hotReplies.map(r => (
                      <Link
                        key={r.id}
                        to="/crm/inbox"
                        className="flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{r.from_name || r.from_email}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.subject}</p>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs shrink-0">
                          {r.classification?.replace('_', ' ')}
                        </Badge>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Hot leads */}
              {prospects.filter(p => p.reply_sentiment === 'hot').length > 0 && (
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-red-500" />
                      Hot Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1.5">
                    {prospects
                      .filter(p => p.reply_sentiment === 'hot')
                      .slice(0, 4)
                      .map(p => (
                        <Link
                          key={p.id}
                          to={`/crm/prospects/${p.id}`}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors text-sm"
                        >
                          <div>
                            <p className="font-medium">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.company_name}</p>
                          </div>
                          <Badge variant="destructive" className="text-xs">Hot</Badge>
                        </Link>
                      ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Pipeline Mini-bars + Learnings — 1/3 width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {/* Pipeline Mini-bars */}
              <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                    </div>
                  ) : (
                    stageCounts.map(({ stage, count, label }) => (
                      <div key={stage} className="flex items-center gap-2 text-xs">
                        <span className="w-24 truncate capitalize text-muted-foreground">{label}</span>
                        <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STAGE_COLORS[stage] || 'bg-primary'} transition-all`}
                            style={{ width: `${(count / maxStageCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-medium">{count}</span>
                      </div>
                    ))
                  )}
                  <Link to="/crm/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1 pt-1">
                    Full pipeline <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>

              {/* Outreach Learnings */}
              <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Outreach Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {learningsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : learnings.length > 0 ? (
                    learnings.slice(0, 3).map(l => (
                      <div key={l.id} className="p-2 rounded-md bg-muted/20 text-xs">
                        <p className="font-medium text-foreground">{l.pattern}</p>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] h-4">{l.learning_type}</Badge>
                          {l.performance_lift && (
                            <span className="text-emerald-500">+{l.performance_lift}%</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No patterns detected yet. Insights appear after campaigns gather data.
                    </p>
                  )}
                  <Link to="/crm/analytics" className="text-xs text-primary hover:underline flex items-center gap-1 pt-1">
                    View analytics <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </CRMRealtimeProvider>
    </RoleGate>
  );
}
