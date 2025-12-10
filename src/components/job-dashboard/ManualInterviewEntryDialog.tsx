import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, Video, MapPin, User } from "lucide-react";

interface ManualInterviewEntryDialogProps {
  jobId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface Candidate {
  application_id: string;
  candidate_name: string;
}

export function ManualInterviewEntryDialog({ jobId, onSuccess, onClose }: ManualInterviewEntryDialogProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCandidates, setFetchingCandidates] = useState(true);
  
  const [selectedApplication, setSelectedApplication] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [interviewType, setInterviewType] = useState<string>("video");
  const [location, setLocation] = useState<string>("");
  const [duration, setDuration] = useState<string>("60");

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        // Fetch active applications for this job (not rejected/hired)
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id,
            candidate_full_name,
            candidate_profiles (
              full_name
            )
          `)
          .eq('job_id', jobId)
          .not('status', 'in', '("rejected","hired")');
        
        if (!error && data) {
          const mapped: Candidate[] = data.map((app: any) => ({
            application_id: app.id,
            candidate_name: app.candidate_profiles?.full_name || app.candidate_full_name || 'Unknown Candidate'
          }));
          setCandidates(mapped);
        }
      } catch (err) {
        console.error('Error fetching candidates:', err);
      } finally {
        setFetchingCandidates(false);
      }
    };

    fetchCandidates();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedApplication || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const scheduledStart = new Date(`${scheduledDate}T${scheduledTime}`);
      const scheduledEnd = new Date(scheduledStart.getTime() + parseInt(duration) * 60000);
      
      const { error } = await supabase
        .from('interviews')
        .insert({
          application_id: selectedApplication,
          job_id: jobId,
          created_by: user.id,
          stage_index: 0, // Default to first stage
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          interview_type: interviewType,
          location: location || null,
          status: 'scheduled'
        });
      
      if (error) throw error;
      
      toast.success("Interview scheduled successfully");
      onSuccess();
    } catch (err) {
      console.error('Error scheduling interview:', err);
      toast.error("Failed to schedule interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Candidate Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Candidate
        </Label>
        {fetchingCandidates ? (
          <div className="h-10 bg-muted/30 rounded animate-pulse" />
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active candidates for this job</p>
        ) : (
          <Select value={selectedApplication} onValueChange={setSelectedApplication}>
            <SelectTrigger>
              <SelectValue placeholder="Select a candidate" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.application_id} value={candidate.application_id}>
                  {candidate.candidate_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date
          </Label>
          <Input 
            type="date" 
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time
          </Label>
          <Input 
            type="time" 
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Interview Type */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Video className="w-4 h-4" />
          Interview Type
        </Label>
        <Select value={interviewType} onValueChange={setInterviewType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video Call</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="in-person">In-Person</SelectItem>
            <SelectItem value="panel">Panel Interview</SelectItem>
            <SelectItem value="technical">Technical Interview</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>Duration</Label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="90">1.5 hours</SelectItem>
            <SelectItem value="120">2 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location (for in-person) */}
      {interviewType === 'in-person' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input 
            placeholder="Office address or meeting room"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || candidates.length === 0}>
          {loading ? "Scheduling..." : "Schedule Interview"}
        </Button>
      </div>
    </form>
  );
}
