import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Megaphone, Send, Loader2 } from "lucide-react";

interface BreakoutRoomBroadcastProps {
  isHost: boolean;
  lastMessage?: string | null;
  onBroadcast: (message: string) => Promise<void>;
  onRecallAll: () => Promise<void>;
}

export function BreakoutRoomBroadcast({
  isHost,
  lastMessage,
  onBroadcast,
  onRecallAll
}: BreakoutRoomBroadcastProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recalling, setRecalling] = useState(false);
  const [open, setOpen] = useState(false);

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      await onBroadcast(message);
      setMessage('');
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  const handleRecall = async () => {
    setRecalling(true);
    try {
      await onRecallAll();
    } finally {
      setRecalling(false);
    }
  };

  if (!isHost) {
    // Participant view - show broadcast message if any
    if (!lastMessage) return null;

    return (
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Megaphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Message from Host</p>
            <p className="text-sm mt-1">{lastMessage}</p>
          </div>
        </div>
      </Card>
    );
  }

  // Host view - broadcast controls
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Host Controls
        </h4>
      </div>

      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Broadcast Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Broadcast to All Rooms</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={e => e.key === 'Enter' && handleBroadcast()}
              />
              <p className="text-sm text-muted-foreground">
                This message will be sent to all participants in breakout rooms.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBroadcast} disabled={!message.trim() || sending}>
                {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleRecall}
          disabled={recalling}
        >
          {recalling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Recall All
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        "Recall All" will bring all participants back to the main room.
      </p>
    </Card>
  );
}
