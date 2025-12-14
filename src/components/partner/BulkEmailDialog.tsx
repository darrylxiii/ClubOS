import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { bulkActionsService } from '@/services/bulkActionsService';

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateIds: string[];
  candidateCount: number;
  jobTitle?: string;
}

const EMAIL_TEMPLATES = [
  {
    id: 'interview_invite',
    name: 'Interview Invitation',
    subject: 'Interview Invitation - {{jobTitle}}',
    template: `Dear {{name}},

We are pleased to invite you for an interview for the {{jobTitle}} position.

Please let us know your availability for the coming week.

Best regards,
The Quantum Club`
  },
  {
    id: 'status_update',
    name: 'Application Status Update',
    subject: 'Update on Your Application - {{jobTitle}}',
    template: `Dear {{name}},

Thank you for your continued interest in the {{jobTitle}} position.

We wanted to update you on the status of your application. Our team is currently reviewing all candidates and we expect to make a decision soon.

Best regards,
The Quantum Club`
  },
  {
    id: 'custom',
    name: 'Custom Email',
    subject: '',
    template: ''
  }
];

export function BulkEmailDialog({ 
  open, 
  onOpenChange, 
  candidateIds, 
  candidateCount,
  jobTitle = 'Open Position'
}: BulkEmailDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('interview_invite');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [emailBody, setEmailBody] = useState(EMAIL_TEMPLATES[0].template);
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject.replace('{{jobTitle}}', jobTitle));
      setEmailBody(template.template.replace(/\{\{jobTitle\}\}/g, jobTitle));
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !emailBody.trim()) {
      toast.error('Please fill in both subject and email body');
      return;
    }

    setSending(true);
    try {
      const result = await bulkActionsService.sendBulkEmails(
        candidateIds,
        emailBody,
        subject
      );

      if (result.success) {
        toast.success(`Successfully sent emails to ${result.processed} candidates`);
        onOpenChange(false);
      } else {
        toast.error(`Failed to send ${result.failed} emails. ${result.processed} sent successfully.`);
      }
    } catch (error) {
      toast.error('Failed to send bulk emails');
      console.error('Bulk email error:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send Bulk Email
          </DialogTitle>
          <DialogDescription>
            Send an email to all selected candidates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients Info */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sending to</span>
            <Badge variant="secondary">{candidateCount} candidates</Badge>
            {jobTitle && (
              <>
                <span className="text-sm text-muted-foreground">for</span>
                <Badge variant="outline">{jobTitle}</Badge>
              </>
            )}
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Email Template</Label>
            <div className="flex gap-2 flex-wrap">
              {EMAIL_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTemplateChange(template.id)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Email Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Write your email here..."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{name}}"} to personalize with candidate's name
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {candidateCount} Candidates
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
