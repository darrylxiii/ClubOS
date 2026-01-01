/**
 * Meeting Mode Indicator
 * Shows whether meeting is using P2P mesh or SFU infrastructure
 */

import { Users, Server, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MeetingModeIndicatorProps {
  mode: 'p2p' | 'sfu';
  participantCount: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'lost';
  className?: string;
}

export function MeetingModeIndicator({
  mode,
  participantCount,
  connectionQuality,
  className
}: MeetingModeIndicatorProps) {
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-emerald-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-amber-500';
      case 'lost': return 'text-destructive';
    }
  };

  const getQualityIcon = () => {
    if (connectionQuality === 'lost') {
      return <WifiOff className={cn("h-3 w-3", getQualityColor())} />;
    }
    return <Wifi className={cn("h-3 w-3", getQualityColor())} />;
  };

  const getModeInfo = () => {
    if (mode === 'sfu') {
      return {
        icon: Server,
        label: 'SFU',
        description: 'Using cloud infrastructure for optimal performance with many participants',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10'
      };
    }
    return {
      icon: Users,
      label: 'P2P',
      description: 'Direct peer-to-peer connections for low latency',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    };
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1.5 cursor-help",
              modeInfo.bgColor,
              className
            )}
          >
            <ModeIcon className={cn("h-3 w-3", modeInfo.color)} />
            <span className="text-xs font-medium">{modeInfo.label}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs">{participantCount}</span>
            {getQualityIcon()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ModeIcon className={cn("h-4 w-4", modeInfo.color)} />
              <span className="font-medium">
                {mode === 'sfu' ? 'Cloud Infrastructure (SFU)' : 'Peer-to-Peer Mesh'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {modeInfo.description}
            </p>
            <div className="flex items-center gap-2 pt-1 border-t text-xs">
              {getQualityIcon()}
              <span className="capitalize">{connectionQuality} connection</span>
            </div>
            {mode === 'sfu' && (
              <p className="text-xs text-muted-foreground">
                Automatically selected for meetings with 6+ participants
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
