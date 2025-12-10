import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  Mail, 
  Zap, 
  Calendar,
  GripVertical,
  ExternalLink
} from 'lucide-react';
import type { CRMProspect } from '@/types/crm-enterprise';
import { formatDistanceToNow } from 'date-fns';

interface ProspectCardProps {
  prospect: CRMProspect;
  isDragging?: boolean;
}

const sentimentColors: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400 border-red-500/30',
  warm: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  negative: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const sentimentEmojis: Record<string, string> = {
  hot: '🔥',
  warm: '☀️',
  neutral: '😐',
  cold: '❄️',
  negative: '👎',
  objection: '🤔',
  referral: '👋',
};

export function ProspectCard({ prospect, isDragging }: ProspectCardProps) {
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl",
        "border border-border/30 rounded-lg p-3",
        "hover:border-primary/50 hover:shadow-lg transition-all",
        dragging && "opacity-50 scale-105 shadow-2xl rotate-2"
      )}
      whileHover={{ scale: dragging ? 1 : 1.02 }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="pl-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <Link 
              to={`/crm/prospects/${prospect.id}`}
              className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1 group/link"
            >
              {prospect.full_name}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </Link>
            {prospect.job_title && (
              <p className="text-xs text-muted-foreground truncate">{prospect.job_title}</p>
            )}
          </div>
          {prospect.reply_sentiment && (
            <Badge 
              variant="outline" 
              className={cn("text-xs shrink-0", sentimentColors[prospect.reply_sentiment])}
            >
              {sentimentEmojis[prospect.reply_sentiment]} {prospect.reply_sentiment}
            </Badge>
          )}
        </div>

        {/* Company */}
        {prospect.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Building className="w-3 h-3" />
            <span className="truncate">{prospect.company_name}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          {/* Lead Score */}
          <div className="flex items-center gap-1">
            <Zap className={cn(
              "w-3 h-3",
              prospect.lead_score >= 70 ? "text-green-500" :
              prospect.lead_score >= 40 ? "text-yellow-500" : "text-gray-400"
            )} />
            <span className="font-medium">{prospect.lead_score}</span>
          </div>

          {/* Emails */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span>{prospect.emails_sent || 0} sent</span>
          </div>

          {/* Last Activity */}
          {prospect.last_activity_at && (
            <div className="flex items-center gap-1 text-muted-foreground ml-auto">
              <Calendar className="w-3 h-3" />
              <span className="text-[10px]">
                {formatDistanceToNow(new Date(prospect.last_activity_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
