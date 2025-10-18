import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface MeetingDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingCode: string;
  meetingUrl: string;
}

export function MeetingDetailsPanel({
  open,
  onOpenChange,
  meetingCode,
  meetingUrl,
}: MeetingDetailsPanelProps) {
  const copyMeetingInfo = () => {
    const info = `Meeting Link: ${meetingUrl}\nMeeting Code: ${meetingCode}`;
    navigator.clipboard.writeText(info);
    toast.success('Meeting info copied to clipboard');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Meeting Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Joining Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Joining Info</h3>
            
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm break-all">{meetingUrl}</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Meeting Code:</span>
                <code className="font-mono bg-muted px-2 py-1 rounded">{meetingCode}</code>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={copyMeetingInfo}
            >
              <Copy className="h-4 w-4" />
              Copy meeting info
            </Button>
          </div>

          {/* Phone Numbers Section */}
          <div className="space-y-3">
            <Button variant="link" className="p-0 h-auto gap-2 text-primary">
              <Phone className="h-4 w-4" />
              More phone numbers
            </Button>
          </div>

          {/* Calendar Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Calendar attachments are shown here
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
