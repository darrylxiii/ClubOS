import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Users, Clock, MessageSquare, Mail, Phone, Calendar, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Relationship {
  entity_id: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_avatar?: string;
  job_title?: string;
  pipeline_stage?: string;
  engagement_score?: number | null;
  response_rate?: number | null;
  avg_sentiment?: number | null;
  total_communications?: number | null;
  last_outbound_at?: string | null;
  days_since_contact?: number | null;
  preferred_channel?: string | null;
  risk_level?: string | null;
  recommended_action?: string | null;
}

interface PartnerRelationshipGridProps {
  relationships: Relationship[];
  onSendMessage: (candidateId: string, channel: 'whatsapp' | 'email' | 'phone') => void;
  onScheduleMeeting: (candidateId: string) => void;
  onViewProfile: (candidateId: string) => void;
}

const riskConfig = {
  low: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Healthy', icon: CheckCircle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Needs Attention', icon: AlertTriangle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'At Risk', icon: AlertTriangle },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical', icon: AlertTriangle }
};

export function PartnerRelationshipGrid({
  relationships,
  onSendMessage,
  onScheduleMeeting,
  onViewProfile
}: PartnerRelationshipGridProps) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk');

  const filtered = relationships
    .filter(r => {
      const matchesSearch = !search || 
        r.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.job_title?.toLowerCase().includes(search.toLowerCase());
      const matchesRisk = riskFilter === 'all' || r.risk_level === riskFilter;
      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (riskOrder[a.risk_level as keyof typeof riskOrder] || 2) - 
               (riskOrder[b.risk_level as keyof typeof riskOrder] || 2);
      }
      if (sortBy === 'engagement') {
        return (b.engagement_score || 0) - (a.engagement_score || 0);
      }
      if (sortBy === 'recent') {
        return (a.days_since_contact || 999) - (b.days_since_contact || 999);
      }
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Healthy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk">Risk Level</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="recent">Last Contact</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((relationship, index) => {
          const risk = riskConfig[relationship.risk_level as keyof typeof riskConfig] || riskConfig.medium;
          const RiskIcon = risk.icon;
          const engagementPercent = Math.min(100, Math.max(0, (relationship.engagement_score || 0) * 10));

          return (
            <motion.div
              key={relationship.entity_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                "overflow-hidden hover:shadow-lg transition-all cursor-pointer",
                risk.border,
                relationship.risk_level === 'critical' && "ring-2 ring-red-500/20"
              )}
                onClick={() => onViewProfile(relationship.entity_id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={relationship.candidate_avatar} />
                        <AvatarFallback>
                          {relationship.candidate_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {relationship.candidate_name || 'Unknown'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{relationship.job_title}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(risk.bg, risk.color, "border-0 text-xs")}>
                      <RiskIcon className="h-3 w-3 mr-1" />
                      {risk.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Engagement Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Engagement</span>
                      <span className="font-medium">{(relationship.engagement_score || 0).toFixed(1)}/10</span>
                    </div>
                    <Progress value={engagementPercent} className="h-1.5" />
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">{Math.round((relationship.response_rate || 0) * 100)}%</p>
                      <p className="text-[10px] text-muted-foreground">Response</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">{relationship.total_communications || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Messages</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="flex justify-center">
                        {(relationship.avg_sentiment || 0) > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (relationship.avg_sentiment || 0) < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <span className="text-sm font-bold">—</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Sentiment</p>
                    </div>
                  </div>

                  {/* Last Contact */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last contact
                    </span>
                    <span className={cn(
                      "font-medium",
                      (relationship.days_since_contact || 0) > 7 && "text-yellow-500",
                      (relationship.days_since_contact || 0) > 14 && "text-red-500"
                    )}>
                      {relationship.last_outbound_at
                        ? formatDistanceToNow(new Date(relationship.last_outbound_at), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>

                  {/* Pipeline Stage */}
                  {relationship.pipeline_stage && (
                    <Badge variant="secondary" className="w-full justify-center text-xs">
                      {relationship.pipeline_stage}
                    </Badge>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 pt-2 border-t" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => onSendMessage(relationship.entity_id, 'whatsapp')}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => onSendMessage(relationship.entity_id, 'email')}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSendMessage(relationship.entity_id, 'phone')}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScheduleMeeting(relationship.entity_id)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Meeting
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No candidates found</p>
          <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
