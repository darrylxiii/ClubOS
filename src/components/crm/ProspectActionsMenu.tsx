import { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Trophy, 
  XCircle, 
  Building, 
  Calendar, 
  Mail, 
  Phone,
  Clock,
  Trash2,
  Edit,
  ArrowRight,
  Video,
} from 'lucide-react';
import { CloseWonDialog } from './CloseWonDialog';
import { CloseLostDialog } from './CloseLostDialog';
import { ConvertToPartnerDialog } from './ConvertToPartnerDialog';
import { SnoozeDialog } from './SnoozeDialog';
import { ActivityQuickAdd } from './ActivityQuickAdd';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import type { CRMProspect, ProspectStage } from '@/types/crm-enterprise';

interface ProspectActionsMenuProps {
  prospect: CRMProspect;
  onUpdateProspect: (id: string, updates: Partial<CRMProspect>) => Promise<boolean>;
  onDeleteProspect: (id: string) => Promise<boolean>;
  onConvertToPartner: (data: { companyName: string; notes: string }) => Promise<void>;
  onCreateActivity?: (prospectId: string) => void;
  onEdit?: () => void;
  trigger?: React.ReactNode;
}

const STAGES: { value: ProspectStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
];

export function ProspectActionsMenu({
  prospect,
  onUpdateProspect,
  onDeleteProspect,
  onConvertToPartner,
  onCreateActivity,
  onEdit,
  trigger,
}: ProspectActionsMenuProps) {
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [showActivityAdd, setShowActivityAdd] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);

  const handleCloseWon = async (data: { dealValue: number; reason: string; reasonCategory: string; notes: string }) => {
    await onUpdateProspect(prospect.id, {
      stage: 'closed_won',
      deal_value: data.dealValue,
      closed_reason: data.reason,
      closed_reason_category: data.reasonCategory,
      closed_at: new Date().toISOString(),
    });
  };

  const handleCloseLost = async (data: { 
    reason: string; 
    reasonCategory: string; 
    competitorName?: string; 
    notes: string;
    scheduleFollowUp: boolean;
    followUpDate?: string;
  }) => {
    await onUpdateProspect(prospect.id, {
      stage: 'closed_lost',
      closed_reason: data.reason,
      closed_reason_category: data.reasonCategory,
      competitor_name: data.competitorName,
      closed_at: new Date().toISOString(),
    });

    // If follow-up scheduled, create an activity
    if (data.scheduleFollowUp && data.followUpDate) {
      // Activity creation would be handled by a callback
    }
  };

  const handleSnooze = async (date: Date) => {
    await onUpdateProspect(prospect.id, {
      snoozed_until: date.toISOString(),
    });
  };

  const handleMoveStage = async (stage: ProspectStage) => {
    await onUpdateProspect(prospect.id, { stage });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Quick Actions */}
          <DropdownMenuItem onClick={() => setShowActivityAdd(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Add Activity
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowScheduleMeeting(true)}>
            <Video className="w-4 h-4 mr-2" />
            Schedule Meeting
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`mailto:${prospect.email}`)}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </DropdownMenuItem>
          {prospect.phone && (
            <DropdownMenuItem onClick={() => window.open(`tel:${prospect.phone}`)}>
              <Phone className="w-4 h-4 mr-2" />
              Call
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Move Stage */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRight className="w-4 h-4 mr-2" />
              Move to Stage
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {STAGES.map((stage) => (
                <DropdownMenuItem
                  key={stage.value}
                  onClick={() => handleMoveStage(stage.value)}
                  disabled={prospect.stage === stage.value}
                >
                  {stage.label}
                  {prospect.stage === stage.value && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuItem onClick={() => setShowSnoozeDialog(true)}>
            <Clock className="w-4 h-4 mr-2" />
            Snooze
          </DropdownMenuItem>
          
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Close Actions */}
          <DropdownMenuItem 
            onClick={() => setShowWonDialog(true)}
            className="text-emerald-500 focus:text-emerald-500"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Close as Won
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowLostDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Close as Lost
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowConvertDialog(true)}>
            <Building className="w-4 h-4 mr-2" />
            Convert to Partner
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onDeleteProspect(prospect.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <CloseWonDialog
        open={showWonDialog}
        onClose={() => setShowWonDialog(false)}
        prospect={prospect}
        onConfirm={handleCloseWon}
      />
      
      <CloseLostDialog
        open={showLostDialog}
        onClose={() => setShowLostDialog(false)}
        prospect={prospect}
        onConfirm={handleCloseLost}
      />
      
      <ConvertToPartnerDialog
        open={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        prospect={prospect}
        onConvert={onConvertToPartner}
      />
      
      <SnoozeDialog
        open={showSnoozeDialog}
        onClose={() => setShowSnoozeDialog(false)}
        onSnooze={handleSnooze}
      />

      {showActivityAdd && (
        <ActivityQuickAdd
          prospectId={prospect.id}
          prospectName={prospect.full_name}
          onSuccess={() => setShowActivityAdd(false)}
        />
      )}

      <ScheduleMeetingDialog
        open={showScheduleMeeting}
        onClose={() => setShowScheduleMeeting(false)}
        prospect={prospect}
      />
    </>
  );
}
