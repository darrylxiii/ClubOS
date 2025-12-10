import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Mail, 
  Target, 
  TrendingUp, 
  Inbox, 
  ArrowRight,
  BarChart3,
  Zap,
  Calendar,
  MessageSquare,
  Focus,
  Keyboard
} from 'lucide-react';
import { useCRMProspects } from '@/hooks/useCRMProspects';
import { useCRMCampaigns } from '@/hooks/useCRMCampaigns';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { Skeleton } from '@/components/ui/skeleton';
import { CRMAnalyticsOverview } from '@/components/crm/CRMAnalyticsOverview';
import { useState } from 'react';

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { prospects, loading: prospectsLoading } = useCRMProspects({ limit: 100 });
  const { campaigns, loading: campaignsLoading } = useCRMCampaigns({ limit: 100 });
  const { replies, loading: repliesLoading } = useCRMEmailReplies({ isActioned: false, limit: 100 });

  const loading = prospectsLoading || campaignsLoading || repliesLoading;

  // Calculate stats
  const totalProspects = prospects.length;
  const hotLeads = prospects.filter(p => p.reply_sentiment === 'hot').length;
  const meetingsBooked = prospects.filter(p => p.stage === 'meeting_booked').length;
  const unreadReplies = replies.filter(r => !r.is_read).length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  
  // Calculate reply rate
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.total_replies || 0), 0);
  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0';

  const stats = [
    { 
      label: 'Total Prospects', 
      value: totalProspects, 
      icon: Users, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Hot Leads', 
      value: hotLeads, 
      icon: Zap, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    { 
      label: 'Meetings Booked', 
      value: meetingsBooked, 
      icon: Calendar, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Reply Rate', 
      value: `${replyRate}%`, 
      icon: TrendingUp, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
  ];

  const quickActions = [
    { 
      label: 'Focus View', 
      description: 'Your activities for today',
      icon: Focus, 
      path: '/crm/focus',
      color: 'from-primary/20 to-violet-500/20'
    },
    { 
      label: 'Prospect Pipeline', 
      description: 'Manage and move prospects through stages',
      icon: Target, 
      path: '/crm/prospects',
      color: 'from-blue-500/20 to-cyan-500/20'
    },
    { 
      label: 'Reply Inbox', 
      description: 'View and respond to email replies',
      icon: Inbox, 
      path: '/crm/inbox',
      badge: unreadReplies > 0 ? unreadReplies : undefined,
      color: 'from-purple-500/20 to-pink-500/20'
    },
    { 
      label: 'Campaigns', 
      description: 'Manage outreach campaigns',
      icon: Mail, 
      path: '/crm/campaigns',
      badge: activeCampaigns > 0 ? activeCampaigns : undefined,
      color: 'from-green-500/20 to-emerald-500/20'
    },
  ];

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                CRM Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your cold outreach and prospect pipeline
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/crm/campaigns">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Campaigns
                </Link>
              </Button>
              <Button asChild>
                <Link to="/crm/inbox">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {unreadReplies > 0 && (
                    <Badge variant="destructive" className="mr-2 text-xs">
                      {unreadReplies}
                    </Badge>
                  )}
                  Reply Inbox
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 hover:border-border/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <div>
                            {loading ? (
                              <Skeleton className="h-7 w-12" />
                            ) : (
                              <p className="text-2xl font-bold">{stat.value}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <Link to={action.path}>
                      <Card className={`bg-gradient-to-br ${action.color} backdrop-blur-xl border-border/30 hover:border-primary/50 hover:scale-[1.02] transition-all cursor-pointer group`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <action.icon className="w-8 h-8 text-primary" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{action.label}</h3>
                                  {action.badge && (
                                    <Badge variant="destructive" className="text-xs">
                                      {action.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{action.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Hot Leads */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-red-500" />
                        Recent Hot Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : prospects.filter(p => p.reply_sentiment === 'hot').slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {prospects
                            .filter(p => p.reply_sentiment === 'hot')
                            .slice(0, 5)
                            .map(prospect => (
                              <Link
                                key={prospect.id}
                                to={`/crm/prospects/${prospect.id}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                              >
                                <div>
                                  <p className="font-medium">{prospect.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{prospect.company_name}</p>
                                </div>
                                <Badge variant="destructive">🔥 Hot</Badge>
                              </Link>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No hot leads yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Unread Replies */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-purple-500" />
                        Unread Replies
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : replies.filter(r => !r.is_read).slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {replies
                            .filter(r => !r.is_read)
                            .slice(0, 5)
                            .map(reply => (
                              <Link
                                key={reply.id}
                                to="/crm/inbox"
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{reply.from_name || reply.from_email}</p>
                                  <p className="text-sm text-muted-foreground truncate">{reply.subject}</p>
                                </div>
                                <Badge variant="outline" className="ml-2 shrink-0">
                                  {reply.classification.replace('_', ' ')}
                                </Badge>
                              </Link>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No unread replies</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <CRMAnalyticsOverview />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
