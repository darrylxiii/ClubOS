import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Building, 
  Mail, 
  Zap, 
  Calendar,
  GripVertical,
  Phone,
  Linkedin,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';
import type { CRMProspect } from '@/types/crm-enterprise';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { RottingIndicator } from './RottingIndicator';
import { NextActivityBadge } from './NextActivityBadge';

interface EnhancedProspectCardProps {
  prospect: CRMProspect;
  isDragging?: boolean;
}

const sentimentColors: Record<string, string> = {
  hot: 'ring-2 ring-red-500/50 shadow-red-500/20 shadow-lg',
  warm: 'ring-1 ring-orange-500/30',
  neutral: '',
  cold: '',
  negative: '',
};

const sentimentBadgeColors: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400 border-red-500/30',
  warm: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  neutral: 'bg-muted/50 text-muted-foreground border-border/30',
  cold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  negative: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const sentimentEmojis: Record<string, string> = {
  hot: '🔥',
  warm: '☀️',
  neutral: '',
  cold: '❄️',
  negative: '👎',
};

export function EnhancedProspectCard({ prospect, isDragging }: EnhancedProspectCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: prospect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500 bg-green-500/20';
    if (score >= 40) return 'text-yellow-500 bg-yellow-500/20';
    return 'text-muted-foreground bg-muted/20';
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-gradient-to-br from-card/95 to-card/70 backdrop-blur-xl",
        "border border-border/40 rounded-xl p-3",
        "hover:border-primary/50 hover:shadow-xl transition-all duration-200",
        dragging && "opacity-50 scale-105 shadow-2xl rotate-1 z-50",
        prospect.reply_sentiment && sentimentColors[prospect.reply_sentiment]
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      whileHover={{ scale: dragging ? 1 : 1.02, y: -2 }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="pl-5">
        {/* Header with Avatar */}
        <div className="flex items-start gap-3 mb-2">
          <Avatar className="w-10 h-10 border-2 border-border/50">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {getInitials(prospect.full_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="min-w-0 flex-1">
            <Link 
              to={`/crm/prospects/${prospect.id}`}
              className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
            >
              {prospect.full_name}
            </Link>
            {prospect.job_title && (
              <p className="text-xs text-muted-foreground truncate">{prospect.job_title}</p>
            )}
          </div>

          {/* Lead Score Badge */}
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            getScoreColor(prospect.lead_score)
          )}>
            <Zap className="w-3 h-3" />
            {prospect.lead_score}
          </div>
        </div>

        {/* Company */}
        {prospect.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Building className="w-3 h-3 shrink-0" />
            <span className="truncate">{prospect.company_name}</span>
            {prospect.company_size && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                {prospect.company_size}
              </Badge>
            )}
          </div>
        )}

        {/* Deal Value & Sentiment */}
        <div className="flex items-center gap-2 mb-2">
          {prospect.deal_value && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
              <DollarSign className="w-3 h-3 mr-0.5" />
              {prospect.deal_value.toLocaleString()}
            </Badge>
          )}
          {prospect.reply_sentiment && prospect.reply_sentiment !== 'neutral' && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", sentimentBadgeColors[prospect.reply_sentiment])}
            >
              {sentimentEmojis[prospect.reply_sentiment]} {prospect.reply_sentiment}
            </Badge>
          )}
        </div>

        {/* Rotting Indicator */}
        <div className="flex items-center gap-2 mb-2">
          <RottingIndicator 
            lastContactedAt={prospect.last_activity_at}
            showLabel
          />
          <NextActivityBadge 
            nextActivityAt={(prospect as any).next_activity_at}
          />
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            <span>{prospect.emails_sent || 0}</span>
          </div>

          {prospect.last_activity_at && (
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">
                {formatDistanceToNow(new Date(prospect.last_activity_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : 10 }}
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-card via-card/95 to-card/80 rounded-xl",
            "flex items-center justify-center gap-2 p-2",
            !showActions && "pointer-events-none"
          )}
        >
          <Button size="sm" variant="outline" className="h-8" asChild>
            <a href={`mailto:${prospect.email}`}>
              <Mail className="w-3 h-3 mr-1" />
              Email
            </a>
          </Button>
          {prospect.phone && (
            <Button size="sm" variant="outline" className="h-8" asChild>
              <a href={`tel:${prospect.phone}`}>
                <Phone className="w-3 h-3 mr-1" />
                Call
              </a>
            </Button>
          )}
          {prospect.linkedin_url && (
            <Button size="sm" variant="outline" className="h-8" asChild>
              <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-3 h-3" />
              </a>
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
