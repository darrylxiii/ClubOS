import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  Building,
  Calendar,
  Zap,
  ExternalLink,
  MapPin,
  Briefcase,
  DollarSign,
  UserPlus,
} from 'lucide-react';
import { PROSPECT_STAGES, type CRMProspect, type ProspectStage } from '@/types/crm-enterprise';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProspectDetailHeroProps {
  prospect: CRMProspect;
  onStageChange: (stage: string) => void;
  onConvertToPartner?: () => void;
}

export function ProspectDetailHero({ 
  prospect, 
  onStageChange,
  onConvertToPartner,
}: ProspectDetailHeroProps) {
  const stageConfig = PROSPECT_STAGES.find(s => s.value === prospect.stage);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Hot Lead';
    if (score >= 40) return 'Warm';
    return 'Cold';
  };

  const stageColors: Record<string, string> = {
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-card/90 via-card/70 to-card/50 backdrop-blur-xl rounded-2xl border border-border/30 p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Left: Avatar & Basic Info */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/crm/prospects">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>

          <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-xl shadow-primary/10">
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              {getInitials(prospect.full_name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold mb-1">{prospect.full_name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-3">
              {prospect.job_title && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {prospect.job_title}
                </span>
              )}
              {prospect.company_name && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {prospect.company_name}
                  </span>
                </>
              )}
              {prospect.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {prospect.location}
                  </span>
                </>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap items-center gap-3">
              <a 
                href={`mailto:${prospect.email}`}
                className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                {prospect.email}
              </a>
              {prospect.phone && (
                <a 
                  href={`tel:${prospect.phone}`}
                  className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {prospect.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Stage & Score */}
        <div className="flex-1 flex flex-wrap items-center gap-4 lg:justify-center">
          {/* Stage Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "px-4 py-2 text-sm font-medium",
              stageConfig && stageColors[stageConfig.color]
            )}
          >
            {stageConfig?.label || prospect.stage}
          </Badge>

          {/* Lead Score Gauge */}
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted/20"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${prospect.lead_score}, 100`}
                  className={getScoreColor(prospect.lead_score)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Zap className={cn("w-4 h-4", getScoreColor(prospect.lead_score))} />
                <span className="text-lg font-bold">{prospect.lead_score}</span>
              </div>
            </div>
            <span className={cn("text-xs font-medium mt-1", getScoreColor(prospect.lead_score))}>
              {getScoreLabel(prospect.lead_score)}
            </span>
          </div>

          {/* Deal Value */}
          {prospect.deal_value && (
            <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <DollarSign className="w-5 h-5 text-green-500 mb-1" />
              <span className="text-lg font-bold text-green-500">
                {prospect.deal_value.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground">Deal Value</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Actions */}
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${prospect.email}`}>
              <Mail className="w-4 h-4 mr-1" />
              Email
            </a>
          </Button>
          {prospect.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${prospect.phone}`}>
                <Phone className="w-4 h-4 mr-1" />
                Call
              </a>
            </Button>
          )}
          {prospect.linkedin_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-4 h-4 mr-1" />
                LinkedIn
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-1" />
            Schedule
          </Button>

          {/* Stage Selector */}
          <Select value={prospect.stage} onValueChange={onStageChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_STAGES.map(stage => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Convert to Partner */}
          {prospect.stage === 'closed_won' && onConvertToPartner && (
            <Button onClick={onConvertToPartner} className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-1" />
              Convert to Partner
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
