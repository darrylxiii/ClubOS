import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Clock, MessageSquare, AlertTriangle, 
  CheckCircle, XCircle, Mail, Building2, Briefcase, Users, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CompanyRelationship } from '@/hooks/useCompanyRelationships';
import { useNavigate } from 'react-router-dom';

interface CompanyRelationshipCardProps {
  relationship: CompanyRelationship;
  onSendMessage?: (channel: 'whatsapp' | 'email') => void;
}

const riskConfig = {
  low: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Healthy', icon: CheckCircle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Needs Attention', icon: AlertTriangle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'At Risk', icon: AlertTriangle },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical', icon: XCircle }
};

export function CompanyRelationshipCard({ relationship, onSendMessage }: CompanyRelationshipCardProps) {
  const navigate = useNavigate();
  const risk = riskConfig[relationship.risk_level] || riskConfig.medium;
  const RiskIcon = risk.icon;
  const engagementPercent = Math.min(100, Math.max(0, (relationship.engagement_score || 0) * 10));
  const responseRate = Math.round((relationship.response_rate || 0) * 100);
  const avgSentiment = relationship.avg_sentiment || 0;

  const initials = relationship.company_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={relationship.logo_url || undefined} alt={relationship.company_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {relationship.company_name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => navigate(`/companies/${relationship.company_id}`)}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {relationship.active_jobs} active jobs
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {relationship.total_placements} placements
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className={cn(risk.bg, risk.color, "border-0")}>
              <RiskIcon className="h-3 w-3 mr-1" />
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
              <p className="text-xs text-muted-foreground">Emails</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1">
                {avgSentiment > 0.2 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : avgSentiment < -0.2 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className={cn(
                  "text-lg font-bold",
                  avgSentiment > 0.2 && "text-green-500",
                  avgSentiment < -0.2 && "text-red-500"
                )}>
                  {avgSentiment !== 0 ? `${Math.round(avgSentiment * 100)}%` : '—'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Sentiment</p>
            </div>
          </div>

          {/* Sentiment Breakdown */}
          {relationship.sentiment_breakdown && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Breakdown:</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                +{relationship.sentiment_breakdown.positive || 0}
              </Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                {relationship.sentiment_breakdown.neutral || 0}
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                -{relationship.sentiment_breakdown.negative || 0}
              </Badge>
            </div>
          )}

          {/* Email Health Score */}
          {relationship.email_health_score !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email Health</span>
              <Badge variant={
                relationship.email_health_score >= 80 ? 'default' :
                relationship.email_health_score >= 60 ? 'secondary' :
                'destructive'
              }>
                {relationship.email_health_score}/100
              </Badge>
            </div>
          )}

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
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/companies/${relationship.company_id}`)}
            >
              View Company
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
