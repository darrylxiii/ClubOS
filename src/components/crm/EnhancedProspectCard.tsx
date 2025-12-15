import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  MoreHorizontal,
  Sparkles,
  Pencil,
  ListTodo,
  Eye,
} from 'lucide-react';
import type { CRMProspect } from '@/types/crm-enterprise';
import { formatDistanceToNow } from 'date-fns';
import { RottingIndicator } from './RottingIndicator';
import { NextActivityBadge } from './NextActivityBadge';
import { ProspectActionsMenu } from './ProspectActionsMenu';
import { CompanyEnrichButton } from './CompanyEnrichButton';
import { CreatePilotTaskButton } from './CreatePilotTaskButton';

interface EnhancedProspectCardProps {
  prospect: CRMProspect;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onEdit?: (prospect: CRMProspect) => void;
  onUpdateProspect?: (id: string, updates: Partial<CRMProspect>) => Promise<boolean>;
  onDeleteProspect?: (id: string) => Promise<boolean>;
  onConvertToPartner?: (data: { companyName: string; notes: string }) => Promise<void>;
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

export function EnhancedProspectCard({
  prospect,
  isDragging,
  isSelected = false,
  onSelect,
  onEdit,
  onUpdateProspect,
  onDeleteProspect,
  onConvertToPartner
}: EnhancedProspectCardProps) {
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
      {/* Drag Handle + Selection Checkbox */}
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(prospect.id, !!checked)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
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

          {/* Lead Score Badge & Actions */}
          <div className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              getScoreColor(prospect.lead_score)
            )}>
              <Zap className="w-3 h-3" />
              {prospect.lead_score}
            </div>

            {/* Win Probability Badge (ML) */}
            {(prospect as any).predicted_win_probability !== undefined && (
              <Tooltip>
                <TooltipTrigger>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                    (prospect as any).predicted_win_probability >= 70 ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                      (prospect as any).predicted_win_probability >= 40 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  )}>
                    <Sparkles className="w-3 h-3" />
                    {(prospect as any).predicted_win_probability}%
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Win Probability
                  <div className="text-[10px] text-muted-foreground">
                    Velocity Score: {(prospect as any).velocity_score || 0}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {onUpdateProspect && onDeleteProspect && onConvertToPartner && (
              <ProspectActionsMenu
                prospect={prospect}
                onUpdateProspect={onUpdateProspect}
                onDeleteProspect={onDeleteProspect}
                onConvertToPartner={onConvertToPartner}
                trigger={
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                }
              />
            )}
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
            {/* Company Enrich Button */}
            <CompanyEnrichButton
              prospect={prospect}
            />
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

        {/* Inline Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : 10 }}
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-card via-card/95 to-card/80 rounded-xl",
            "flex items-center justify-center gap-1.5 p-2",
            !showActions && "pointer-events-none"
          )}
        >
          {/* Email Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                <Link to={`/crm/inbox?email=${encodeURIComponent(prospect.email)}`}>
                  <Mail className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send Email</TooltipContent>
          </Tooltip>
          {/* View Prospect Details */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 ml-1" asChild>
                <Link to={`/crm/prospects/${prospect.id}`}>
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Details</TooltipContent>
          </Tooltip>

          {prospect.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                  <a href={`tel:${prospect.phone}`}>
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call</TooltipContent>
            </Tooltip>
          )}

          {prospect.linkedin_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                  <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View LinkedIn</TooltipContent>
            </Tooltip>
          )}

          {onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => onEdit(prospect)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          )}

          <CreatePilotTaskButton prospect={prospect} size="icon" variant="outline" />
        </motion.div>
      </div>
    </motion.div>
  );
}
