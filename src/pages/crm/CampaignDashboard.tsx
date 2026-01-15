import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  RefreshCw,
  Mail,
  Users,
  TrendingUp,
  Eye,
  MessageSquare,
  AlertCircle,
  Pause,
  Play,
  Archive,
  MoreHorizontal,
  Upload,
  BarChart3,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useCRMCampaigns } from '@/hooks/useCRMCampaigns';
import type { CRMCampaign } from '@/types/crm-enterprise';
import { format } from 'date-fns';
import { CSVImportDialog } from '@/components/crm/CSVImportDialog';
import { CreateCampaignDialog } from '@/components/crm/CreateCampaignDialog';
import { CampaignAutopilotDialog } from '@/components/crm/CampaignAutopilotDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function CampaignDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [autopilotDialogOpen, setAutopilotDialogOpen] = useState(false);

  const { campaigns, loading, refetch, updateCampaign } = useCRMCampaigns({});

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals
  const totalProspects = campaigns.reduce((sum, c) => sum + (c.total_prospects || 0), 0);
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.total_replies || 0), 0);
  const avgReplyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0';
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const handleStatusChange = async (campaign: CRMCampaign, newStatus: string) => {
    const success = await updateCampaign(campaign.id, { status: newStatus as any });
    if (success) {
      toast.success(`Campaign ${newStatus}`);
      refetch();
    }
  };

  const stats = [
    { label: 'Active Campaigns', value: activeCampaigns, icon: Mail, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { label: 'Total Prospects', value: totalProspects, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Emails Sent', value: totalSent, icon: MessageSquare, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { label: 'Reply Rate', value: `${avgReplyRate}%`, icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
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
              <h1 className="text-2xl font-bold">Campaigns</h1>
              <p className="text-sm text-muted-foreground">
                Manage your cold outreach campaigns
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-muted/20 border-border/30"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button
                onClick={() => setAutopilotDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Pilot
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
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

          {/* Campaign List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>All Campaigns</span>
                  <Badge variant="outline">{filteredCampaigns.length} campaigns</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredCampaigns.length > 0 ? (
                  <div className="space-y-4">
                    {filteredCampaigns.map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns found</p>
                    <Button className="mt-4" onClick={() => setImportDialogOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import from Instantly
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <CSVImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onSuccess={() => {
            refetch();
            setImportDialogOpen(false);
          }}
        />

        <CreateCampaignDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={refetch}
        />

        <CampaignAutopilotDialog
          open={autopilotDialogOpen}
          onOpenChange={setAutopilotDialogOpen}
          onSuccess={refetch}
        />
      </RoleGate>
    </AppLayout>
  );
}

interface CampaignCardProps {
  campaign: CRMCampaign;
  onStatusChange: (campaign: CRMCampaign, status: string) => void;
}

function CampaignCard({ campaign, onStatusChange }: CampaignCardProps) {
  const replyRate = campaign.total_sent > 0
    ? ((campaign.total_replies / campaign.total_sent) * 100).toFixed(1)
    : '0';
  const openRate = campaign.total_sent > 0
    ? ((campaign.total_opens / campaign.total_sent) * 100).toFixed(1)
    : '0';

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <motion.div
      className="p-4 rounded-lg bg-muted/10 border border-border/30 hover:border-primary/30 transition-all"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Campaign Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold truncate">{campaign.name}</h3>
            <Badge variant="outline" className={statusColors[campaign.status]}>
              {campaign.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {campaign.source}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground truncate mb-2">
              {campaign.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {campaign.total_prospects} prospects
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {campaign.total_sent} sent
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {campaign.start_date
                ? format(new Date(campaign.start_date), 'MMM d, yyyy')
                : 'Not started'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-1 text-lg font-bold">
              <Eye className="w-4 h-4 text-blue-500" />
              {openRate}%
            </div>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-lg font-bold">
              <MessageSquare className="w-4 h-4 text-green-500" />
              {replyRate}%
            </div>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
          </div>
          {campaign.total_bounces > 0 && (
            <div className="text-center">
              <div className="flex items-center gap-1 text-lg font-bold text-red-500">
                <AlertCircle className="w-4 h-4" />
                {campaign.total_bounces}
              </div>
              <p className="text-xs text-muted-foreground">Bounces</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {campaign.status === 'active' && (
              <DropdownMenuItem onClick={() => onStatusChange(campaign, 'paused')}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </DropdownMenuItem>
            )}
            {campaign.status === 'paused' && (
              <DropdownMenuItem onClick={() => onStatusChange(campaign, 'active')}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onStatusChange(campaign, 'archived')}
              className="text-muted-foreground"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Campaign Progress</span>
          <span className="font-medium">
            {campaign.total_sent} / {campaign.total_prospects} sent
          </span>
        </div>
        <Progress
          value={campaign.total_prospects > 0
            ? (campaign.total_sent / campaign.total_prospects) * 100
            : 0
          }
          className="h-1.5"
        />
      </div>
    </motion.div>
  );
}
