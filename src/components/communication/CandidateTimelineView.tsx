import { useState } from 'react';
import { MessageSquare, Mail, Phone, Video, Users, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Communication {
  id: string;
  channel: string;
  direction: string;
  subject: string | null;
  content_preview: string | null;
  sentiment_score: number | null;
  original_timestamp: string;
}

interface Props {
  communications: Communication[];
  loading: boolean;
}

const channelConfig: Record<string, { icon: any; label: string; color: string }> = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-500' },
  email: { icon: Mail, label: 'Email', color: 'text-blue-500' },
  phone: { icon: Phone, label: 'Phone', color: 'text-orange-500' },
  meeting: { icon: Video, label: 'Meeting', color: 'text-purple-500' },
  in_person: { icon: Users, label: 'In Person', color: 'text-accent' }
};

export function CandidateTimelineView({ communications, loading }: Props) {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const filteredComms = communications.filter(c => {
    const matchesSearch = !search || 
      c.content_preview?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase());
    const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Communication History
          </CardTitle>
          <Badge variant="outline">{filteredComms.length} messages</Badge>
        </div>
        
        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredComms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No communications yet</p>
            <p className="text-sm">Your message history with TQC will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredComms.map((comm, index) => {
              const config = channelConfig[comm.channel] || channelConfig.email;
              const Icon = config.icon;
              const isInbound = comm.direction === 'inbound';
              
              return (
                <div
                  key={comm.id}
                  className={cn(
                    "flex gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50",
                    index !== filteredComms.length - 1 && "border-b border-border/30"
                  )}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isInbound ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    {index !== filteredComms.length - 1 && (
                      <div className="w-px h-full bg-border/50 my-1" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {isInbound ? 'Received' : 'Sent'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(comm.original_timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {comm.subject && (
                      <p className="font-medium text-sm text-foreground truncate">
                        {comm.subject}
                      </p>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comm.content_preview || 'No preview available'}
                    </p>
                    
                    {comm.sentiment_score !== null && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          comm.sentiment_score >= 0.6 ? "bg-green-500" :
                          comm.sentiment_score >= 0.4 ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className="text-xs text-muted-foreground">
                          {comm.sentiment_score >= 0.6 ? 'Positive' :
                           comm.sentiment_score >= 0.4 ? 'Neutral' : 'Needs attention'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
