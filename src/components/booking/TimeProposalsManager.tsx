import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, setHours, setMinutes, addDays } from "date-fns";
import { Clock, Check, X, RefreshCw, Loader2 } from "lucide-react";

interface TimeProposal {
  id: string;
  booking_id: string;
  proposed_by_email: string;
  proposed_by_name: string | null;
  proposed_by_type: 'booker' | 'guest';
  proposed_start: string;
  proposed_end: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  booking?: {
    guest_name: string;
    booking_links?: {
      title: string;
      duration_minutes: number;
    };
  };
}

interface TimeProposalsManagerProps {
  proposals: TimeProposal[];
  onUpdate: () => void;
}

export function TimeProposalsManager({ proposals, onUpdate }: TimeProposalsManagerProps) {
  const [responding, setResponding] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [counterDate, setCounterDate] = useState<Date | undefined>(undefined);
  const [counterTime, setCounterTime] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<TimeProposal | null>(null);

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const pastProposals = proposals.filter(p => p.status !== 'pending');

  // Generate time slots
  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute > 0) break;
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      timeSlots.push(`${h}:${m}`);
    }
  }

  const handleResponse = async (proposalId: string, action: 'accept' | 'decline') => {
    setResponding(proposalId);
    try {
      const { error } = await supabase.functions.invoke('handle-time-proposal', {
        body: {
          proposalId,
          action,
          responseMessage: responseMessage.trim() || undefined,
        },
      });

      if (error) throw error;

      toast.success(action === 'accept' ? 'Proposal accepted! Meeting rescheduled.' : 'Proposal declined.');
      setResponseMessage("");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} proposal`);
    } finally {
      setResponding(null);
    }
  };

  const handleCounter = async () => {
    if (!selectedProposal || !counterDate || !counterTime) {
      toast.error("Please select a date and time");
      return;
    }

    const [hours, minutes] = counterTime.split(':').map(Number);
    const counterStart = setMinutes(setHours(counterDate, hours), minutes);
    const durationMinutes = selectedProposal.booking?.booking_links?.duration_minutes || 30;
    const counterEnd = new Date(counterStart.getTime() + durationMinutes * 60 * 1000);

    setResponding(selectedProposal.id);
    try {
      const { error } = await supabase.functions.invoke('handle-time-proposal', {
        body: {
          proposalId: selectedProposal.id,
          action: 'counter',
          responseMessage: responseMessage.trim() || undefined,
          counterStart: counterStart.toISOString(),
          counterEnd: counterEnd.toISOString(),
        },
      });

      if (error) throw error;

      toast.success('Counter-proposal sent!');
      setCounterDialogOpen(false);
      setCounterDate(undefined);
      setCounterTime("");
      setResponseMessage("");
      setSelectedProposal(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send counter-proposal');
    } finally {
      setResponding(null);
    }
  };

  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><Check className="w-3 h-3 mr-1" /> Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Declined</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {pendingProposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Time Proposals ({pendingProposals.length})
            </CardTitle>
            <CardDescription>
              Guests have requested alternative meeting times
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingProposals.map((proposal) => (
              <div key={proposal.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {proposal.proposed_by_name || proposal.proposed_by_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {proposal.proposed_by_type === 'guest' ? 'Additional Guest' : 'Booker'}
                    </p>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>

                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium">Proposed Time:</p>
                  <p className="text-sm">
                    {format(new Date(proposal.proposed_start), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(proposal.proposed_start), "h:mm a")} – 
                    {format(new Date(proposal.proposed_end), "h:mm a")}
                  </p>
                </div>

                {proposal.message && (
                  <div className="text-sm">
                    <p className="font-medium">Message:</p>
                    <p className="text-muted-foreground">{proposal.message}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="Optional response message..."
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleResponse(proposal.id, 'accept')}
                      disabled={responding === proposal.id}
                      className="flex-1"
                    >
                      {responding === proposal.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResponse(proposal.id, 'decline')}
                      disabled={responding === proposal.id}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setCounterDialogOpen(true);
                      }}
                      disabled={responding === proposal.id}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Counter
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pastProposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Past Proposals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pastProposals.slice(0, 5).map((proposal) => (
              <div key={proposal.id} className="flex items-center justify-between p-2 text-sm">
                <div>
                  <span className="font-medium">{proposal.proposed_by_email}</span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(proposal.proposed_start), "MMM d, h:mm a")}
                  </span>
                </div>
                {getStatusBadge(proposal.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Counter-Proposal Dialog */}
      <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Counter-Propose Time</DialogTitle>
            <DialogDescription>
              Suggest an alternative time to {selectedProposal?.proposed_by_name || selectedProposal?.proposed_by_email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={counterDate}
                onSelect={setCounterDate}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Time</Label>
              <Select value={counterTime} onValueChange={setCounterTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Explain why this time works better..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCounter} disabled={responding !== null || !counterDate || !counterTime}>
              {responding !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Counter-Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
