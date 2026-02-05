import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, Mail, Phone, MessageSquare, Calendar, Tag, 
  User, Edit, ArrowRight, Filter, Download, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useProspectActivityLog, type ActivityEntryType } from '@/hooks/useProspectActivityLog';

interface ProspectActivityLogProps {
  prospectId: string;
  prospectName?: string;
}

export function ProspectActivityLog({ prospectId, prospectName }: ProspectActivityLogProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityEntryType | 'all'>('all');
  
  const { activities, loading, refetch } = useProspectActivityLog({
    prospectId,
    typeFilter,
    limit: 50,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email_sent':
      case 'email_opened':
      case 'email_clicked': return <Mail className="h-4 w-4" />;
      case 'reply_received': return <MessageSquare className="h-4 w-4" />;
      case 'call_made': return <Phone className="h-4 w-4" />;
      case 'meeting_scheduled': return <Calendar className="h-4 w-4" />;
      case 'stage_changed': return <Tag className="h-4 w-4" />;
      case 'note_added': return <Edit className="h-4 w-4" />;
      case 'field_updated': return <Edit className="h-4 w-4" />;
      case 'owner_changed': return <User className="h-4 w-4" />;
      case 'task_completed': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'email_sent': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'email_opened': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'email_clicked': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'reply_received': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'stage_changed': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'note_added': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'field_updated': return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30';
      case 'owner_changed': return 'bg-pink-500/20 text-pink-500 border-pink-500/30';
      case 'task_completed': return 'bg-green-500/20 text-green-500 border-green-500/30';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const exportActivities = () => {
    const csv = [
      ['Type', 'Description', 'Performed By', 'Timestamp'],
      ...activities.map(a => [
        a.type, a.description, a.performedBy.name, a.timestamp
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospect-activity-${prospectId}.csv`;
    a.click();
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Log
            {prospectName && (
              <span className="text-muted-foreground font-normal">• {prospectName}</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ActivityEntryType | 'all')}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="email_sent">Emails Sent</SelectItem>
                <SelectItem value="call_made">Calls Made</SelectItem>
                <SelectItem value="meeting_scheduled">Meetings</SelectItem>
                <SelectItem value="note_added">Notes</SelectItem>
                <SelectItem value="task_completed">Completed Tasks</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportActivities} disabled={activities.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="relative pl-12">
                  <Skeleton className="absolute left-2 top-2 w-6 h-6 rounded-full" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No activities recorded yet</p>
              <p className="text-sm mt-1">Activities will appear here as you interact with this prospect</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-12"
                  >
                    {/* Timeline icon */}
                    <div className={`absolute left-2 top-2 w-6 h-6 rounded-full border flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>

                    <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          {activity.metadata && activity.type === 'stage_changed' && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {activity.metadata.from}
                              </Badge>
                              <ArrowRight className="h-3 w-3" />
                              <Badge variant="outline" className="text-xs">
                                {activity.metadata.to}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={activity.performedBy.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {activity.performedBy.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {activity.performedBy.name}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
