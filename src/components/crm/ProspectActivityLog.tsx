import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, Mail, Phone, MessageSquare, Calendar, Tag, 
  User, Edit, ArrowRight, Filter, Download
} from 'lucide-react';
import { format } from 'date-fns';

interface ActivityEntry {
  id: string;
  type: 'email_sent' | 'email_opened' | 'email_clicked' | 'reply_received' | 
        'call_made' | 'meeting_scheduled' | 'stage_changed' | 'note_added' |
        'field_updated' | 'owner_changed';
  description: string;
  performedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  metadata?: Record<string, string>;
}

interface ProspectActivityLogProps {
  prospectId: string;
  prospectName?: string;
}

export function ProspectActivityLog({ prospectId, prospectName }: ProspectActivityLogProps) {
  const [activities] = useState<ActivityEntry[]>([
    {
      id: '1',
      type: 'email_opened',
      description: 'Opened email "Q4 Partnership Opportunity"',
      performedBy: { id: 'system', name: 'System' },
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: '2',
      type: 'stage_changed',
      description: 'Stage changed from Contacted to Interested',
      performedBy: { id: 'u1', name: 'Alex Thompson', avatar: '' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      metadata: { from: 'Contacted', to: 'Interested' },
    },
    {
      id: '3',
      type: 'note_added',
      description: 'Added note: "Interested in enterprise plan, schedule demo"',
      performedBy: { id: 'u1', name: 'Alex Thompson', avatar: '' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '4',
      type: 'email_sent',
      description: 'Sent email "Q4 Partnership Opportunity"',
      performedBy: { id: 'u2', name: 'Sarah Wilson', avatar: '' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '5',
      type: 'owner_changed',
      description: 'Owner changed from Sarah Wilson to Alex Thompson',
      performedBy: { id: 'u3', name: 'Admin', avatar: '' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      metadata: { from: 'Sarah Wilson', to: 'Alex Thompson' },
    },
    {
      id: '6',
      type: 'field_updated',
      description: 'Updated company size from "100-500" to "500-1000"',
      performedBy: { id: 'u2', name: 'Sarah Wilson', avatar: '' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      metadata: { field: 'company_size', from: '100-500', to: '500-1000' },
    },
  ]);

  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredActivities = activities.filter(a => 
    typeFilter === 'all' || a.type === typeFilter
  );

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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="email_sent">Emails Sent</SelectItem>
                <SelectItem value="email_opened">Emails Opened</SelectItem>
                <SelectItem value="stage_changed">Stage Changes</SelectItem>
                <SelectItem value="note_added">Notes</SelectItem>
                <SelectItem value="field_updated">Field Updates</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportActivities}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {filteredActivities.map((activity, index) => (
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
