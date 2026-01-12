import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, FileText, ArrowRight, Download, UserPlus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { bulkActionsService } from "@/services/bulkActionsService";
import { toast } from "sonner";

type ActionType = 'email' | 'assessment' | 'stage' | 'export' | 'invite';

interface BulkActionsDialogProps {
  open: boolean;
  onClose: () => void;
  type: ActionType;
  selectedIds: string[];
  stages?: { id: string; title: string }[];
  onSuccess?: () => void;
}

const EMAIL_TEMPLATES = [
  { id: 'interview_invite', name: 'Interview Invitation' },
  { id: 'follow_up', name: 'Follow Up' },
  { id: 'status_update', name: 'Status Update' },
  { id: 'custom', name: 'Custom Message' },
];

const ASSESSMENT_TYPES = [
  { id: 'technical', name: 'Technical Assessment' },
  { id: 'personality', name: 'Personality Assessment' },
  { id: 'skills', name: 'Skills Test' },
  { id: 'case_study', name: 'Case Study' },
];

export function BulkActionsDialog({
  open,
  onClose,
  type,
  selectedIds,
  stages = [],
  onSuccess
}: BulkActionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [targetStage, setTargetStage] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  const getTitle = () => {
    switch (type) {
      case 'email': return 'Send Bulk Email';
      case 'assessment': return 'Schedule Assessments';
      case 'stage': return 'Move to Stage';
      case 'export': return 'Export Candidates';
      case 'invite': return 'Send Invitations';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'assessment': return <FileText className="h-5 w-5" />;
      case 'stage': return <ArrowRight className="h-5 w-5" />;
      case 'export': return <Download className="h-5 w-5" />;
      case 'invite': return <UserPlus className="h-5 w-5" />;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      let result;

      switch (type) {
        case 'email': {
          if (!template || !subject) {
            toast.error('Please fill in all required fields');
            return;
          }
          const emailContent = template === 'custom' ? customMessage : template;
          result = await bulkActionsService.sendBulkEmails(selectedIds, emailContent, subject);
          break;
        }

        case 'assessment':
          if (!assessmentType) {
            toast.error('Please select an assessment type');
            return;
          }
          result = await bulkActionsService.bulkScheduleAssessments(selectedIds, assessmentType, dueDate);
          break;

        case 'stage':
          if (!targetStage) {
            toast.error('Please select a target stage');
            return;
          }
          result = await bulkActionsService.bulkAdvanceStage(selectedIds, parseInt(targetStage));
          break;

        case 'export':
          result = await bulkActionsService.bulkExportCandidates(selectedIds, exportFormat);
          break;

        case 'invite':
          result = await bulkActionsService.bulkSendInvitations(selectedIds);
          break;
      }

      if (result?.success) {
        toast.success(`Successfully processed ${result.processed} items`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(`Failed to process: ${result?.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary" className="mt-2">
              {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === 'email' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="template">Email Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              {template === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter your custom message..."
                    rows={4}
                  />
                </div>
              )}
            </>
          )}

          {type === 'assessment' && (
            <>
              <div className="space-y-2">
                <Label>Assessment Type</Label>
                <Select value={assessmentType} onValueChange={setAssessmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {type === 'stage' && (
            <div className="space-y-2">
              <Label>Target Stage</Label>
              <Select value={targetStage} onValueChange={setTargetStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage, idx) => (
                    <SelectItem key={stage.id} value={idx.toString()}>
                      {stage.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'export' && (
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'pdf')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                  <SelectItem value="pdf">PDF (Document)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'invite' && (
            <p className="text-sm text-muted-foreground">
              Platform invitations will be sent to all {selectedIds.length} selected candidates.
              They will receive an email with a unique link to create their account.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === 'email' ? 'Send Emails' :
              type === 'assessment' ? 'Schedule' :
                type === 'stage' ? 'Move' :
                  type === 'export' ? 'Export' :
                    'Send Invitations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
