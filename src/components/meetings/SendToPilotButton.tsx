import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Rocket, Loader2, CheckCircle2 } from "lucide-react";

interface ActionItem {
  task: string;
  owner?: string;
  deadline?: string;
  priority?: string;
}

interface SendToPilotButtonProps {
  meetingId: string;
  recordingId?: string;
  actionItems: ActionItem[];
  meetingTitle?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SendToPilotButton({
  meetingId,
  recordingId,
  actionItems,
  meetingTitle,
  variant = "outline",
  size = "sm"
}: SendToPilotButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const toggleItem = (index: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === actionItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(actionItems.map((_, i) => i)));
    }
  };

  const handleSend = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one action item');
      return;
    }

    setSending(true);
    try {
      const itemsToSend = Array.from(selectedItems).map(i => actionItems[i]);

      const { data, error } = await supabase.functions.invoke('bridge-meeting-to-pilot', {
        body: {
          meeting_id: meetingId,
          recording_id: recordingId,
          action_items: itemsToSend
        }
      });

      if (error) throw error;

      toast.success(`${data.tasks_created} tasks added to Club Pilot`);
      setSent(true);
      setOpen(false);
    } catch (error) {
      console.error('Error sending to Pilot:', error);
      toast.error('Failed to send action items to Club Pilot');
    } finally {
      setSending(false);
    }
  };

  if (actionItems.length === 0) {
    return null;
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          {sent ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Sent to Pilot
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Send to Pilot
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Send Action Items to Club Pilot
          </DialogTitle>
          <DialogDescription>
            Select which action items to add as tasks in Club Pilot.
            {meetingTitle && (
              <span className="block mt-1">From: {meetingTitle}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">
              Action Items ({selectedItems.size}/{actionItems.length} selected)
            </Label>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedItems.size === actionItems.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <ScrollArea className="h-64 border rounded-md p-2">
            <div className="space-y-2">
              {actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedItems.has(idx) 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleItem(idx)}
                >
                  <Checkbox
                    checked={selectedItems.has(idx)}
                    onCheckedChange={() => toggleItem(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.task}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {item.owner && <span>{item.owner}</span>}
                      {item.deadline && <span>Due: {item.deadline}</span>}
                    </div>
                  </div>
                  {item.priority && (
                    <Badge variant={getPriorityColor(item.priority) as any} className="shrink-0">
                      {item.priority}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || selectedItems.size === 0}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send {selectedItems.size} {selectedItems.size === 1 ? 'Task' : 'Tasks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
