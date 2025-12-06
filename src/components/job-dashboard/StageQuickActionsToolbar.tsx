import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Calendar, FileText, MessageSquare, UserCheck, Download, MoreHorizontal, Zap, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface StageQuickActionsToolbarProps {
  stageName: string;
  stageIndex: number;
  candidateCount: number;
  onBulkEmail?: () => void;
  onBulkSchedule?: () => void;
  onBulkAssessment?: () => void;
  onExportStage?: () => void;
}

export const StageQuickActionsToolbar = memo(({
  stageName,
  stageIndex,
  candidateCount,
  onBulkEmail,
  onBulkSchedule,
  onBulkAssessment,
  onExportStage
}: StageQuickActionsToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      icon: Mail,
      label: 'Bulk Email',
      description: `Email all ${candidateCount} candidates`,
      onClick: onBulkEmail || (() => toast.info('Bulk email coming soon')),
      color: 'text-primary'
    },
    {
      icon: Calendar,
      label: 'Schedule All',
      description: 'Send scheduling links',
      onClick: onBulkSchedule || (() => toast.info('Bulk scheduling coming soon')),
      color: 'text-accent'
    },
    {
      icon: FileText,
      label: 'Send Assessment',
      description: 'Assign assessment to all',
      onClick: onBulkAssessment || (() => toast.info('Bulk assessment coming soon')),
      color: 'text-success'
    },
    {
      icon: Download,
      label: 'Export',
      description: 'Export stage data',
      onClick: onExportStage || (() => toast.info('Export coming soon')),
      color: 'text-muted-foreground'
    }
  ];

  if (candidateCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="relative"
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => setIsExpanded(false)}
    >
      <TooltipProvider>
        <div className="flex items-center gap-2">
          {/* Stage Badge */}
          <Badge 
            variant="outline" 
            className="bg-background/80 backdrop-blur-sm border-border/50 gap-1.5 px-2.5 py-1 cursor-pointer hover:bg-background transition-colors"
          >
            <Users className="w-3 h-3" />
            <span className="font-semibold">{candidateCount}</span>
            <span className="text-muted-foreground">in {stageName}</span>
          </Badge>

          {/* Quick Actions */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 'auto' }}
                exit={{ opacity: 0, x: -10, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                {actions.map((action, index) => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-lg bg-background/60 backdrop-blur-sm hover:bg-background border border-border/30 hover:border-border/60 ${action.color}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                          }}
                        >
                          <action.icon className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div>
                        <p className="font-semibold">{action.label}</p>
                        <p className="text-muted-foreground">{action.description}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TooltipProvider>
    </motion.div>
  );
});

StageQuickActionsToolbar.displayName = 'StageQuickActionsToolbar';
