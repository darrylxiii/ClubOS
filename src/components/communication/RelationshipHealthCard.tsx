import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, MessageSquare, AlertTriangle, CheckCircle, XCircle, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type RelationshipScore = Database['public']['Tables']['communication_relationship_scores']['Row'];

interface RelationshipHealthCardProps {
  relationship: RelationshipScore;
  entityName?: string;
  onViewDetails?: () => void;
  onSendMessage?: (channel: 'whatsapp' | 'email' | 'phone') => void;
  onGenerateInsights?: () => void;
}

const riskConfig = {
  low: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Healthy', icon: CheckCircle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Needs Attention', icon: AlertTriangle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'At Risk', icon: AlertTriangle },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical', icon: XCircle }
};

export function RelationshipHealthCard({
  relationship,
  entityName,
  onViewDetails,
  onSendMessage,
  onGenerateInsights
}: RelationshipHealthCardProps) {
  const risk = riskConfig[relationship.risk_level as keyof typeof riskConfig] || riskConfig.medium;
  const RiskIcon = risk.icon;
  const engagementPercent = Math.min(100, Math.max(0, (relationship.engagement_score || 0) * 10));
  const responseRate = Math.round((relationship.response_rate || 0) * 100);
  const avgSentiment = relationship.avg_sentiment || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-lg",
        risk.border,
        relationship.risk_level === 'critical' && "animate-pulse-slow"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", risk.bg)}>
                <RiskIcon className={cn("h-5 w-5", risk.color)} />
              </div>
              <div>
                <CardTitle className="text-base">
                  {entityName || `${relationship.entity_type} - ${relationship.entity_id.slice(0, 8)}`}
                </CardTitle>
                <p className="text-xs text-muted-foreground capitalize">
                  {relationship.entity_type}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn(risk.bg, risk.color, "border-0")}>
              {risk.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Engagement Score */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Engagement</span>
              <span className="font-medium">{relationship.engagement_score?.toFixed(1) || '0'}/10</span>
            </div>
            <Progress value={engagementPercent} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{responseRate}%</p>
              <p className="text-xs text-muted-foreground">Response Rate</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{relationship.total_communications || 0}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center">
                {avgSentiment > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : avgSentiment < 0 ? (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                ) : (
                  <span className="text-lg font-bold">—</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Sentiment</p>
            </div>
          </div>

          {/* Last Contact */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last contact</span>
            </div>
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

          {/* Preferred Channel */}
          {relationship.preferred_channel && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preferred channel</span>
              <Badge variant="secondary" className="capitalize">
                {relationship.preferred_channel}
              </Badge>
            </div>
          )}

          {/* Recommended Action */}
          {relationship.recommended_action && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1">Recommended Action</p>
              <p className="text-sm">{relationship.recommended_action}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {onSendMessage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onSendMessage('whatsapp')}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onSendMessage('email')}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              </>
            )}
            {onViewDetails && (
              <Button variant="ghost" size="sm" onClick={onViewDetails}>
                Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
