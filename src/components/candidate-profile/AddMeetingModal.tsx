/**
 * AddMeetingModal
 * 
 * 3-step modal for adding meetings/recordings to enrich candidate intelligence.
 * Step 1: Meeting details (type, date, title, job)
 * Step 2: Content input (transcript, video, audio)
 * Step 3: Review & submit
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import notify from '@/lib/notify';
import { useDropzone } from 'react-dropzone';
import {
  Video,
  Mic,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Brain,
  Loader2,
  Calendar,
} from 'lucide-react';

const MEETING_TYPES = [
  { value: 'screening', label: 'Screening' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'culture_fit', label: 'Culture Fit' },
  { value: 'final_round', label: 'Final Round' },
  { value: 'debrief', label: 'Debrief' },
  { value: 'client_presentation', label: 'Client Presentation' },
  { value: 'other', label: 'Other' },
] as const;

const ACCEPTED_VIDEO = { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] };
const ACCEPTED_AUDIO = { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'], 'audio/mp4': ['.m4a'], 'audio/webm': ['.webm'], 'audio/x-m4a': ['.m4a'] };
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface AddMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName?: string;
}

interface MeetingFormData {
  meetingType: string;
  meetingDate: string;
  title: string;
  jobId: string;
  participants: string;
  transcript: string;
  videoFile: File | null;
  audioFile: File | null;
}

export function AddMeetingModal({ open, onOpenChange, candidateId, candidateName }: AddMeetingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<MeetingFormData>({
    meetingType: '',
    meetingDate: new Date().toISOString().slice(0, 16),
    title: '',
    jobId: '',
    participants: '',
    transcript: '',
    videoFile: null,
    audioFile: null,
  });

  const hasContent = form.transcript.trim().length > 0 || form.videoFile !== null || form.audioFile !== null;
  const canProceedStep1 = form.meetingType && form.title.trim().length > 0;
  const canProceedStep2 = hasContent;

  const onVideoDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      const file = accepted[0];
      if (file.size > MAX_FILE_SIZE) {
        notify.error('File too large. Maximum size is 50MB.');
        return;
      }
      setForm(prev => ({ ...prev, videoFile: file }));
    }
  }, []);

  const onAudioDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      const file = accepted[0];
      if (file.size > MAX_FILE_SIZE) {
        notify.error('File too large. Maximum size is 50MB.');
        return;
      }
      setForm(prev => ({ ...prev, audioFile: file }));
    }
  }, []);

  const videoDropzone = useDropzone({ onDrop: onVideoDrop, accept: ACCEPTED_VIDEO, maxFiles: 1, multiple: false });
  const audioDropzone = useDropzone({ onDrop: onAudioDrop, accept: ACCEPTED_AUDIO, maxFiles: 1, multiple: false });

  const resetForm = () => {
    setForm({
      meetingType: '',
      meetingDate: new Date().toISOString().slice(0, 16),
      title: '',
      jobId: '',
      participants: '',
      transcript: '',
      videoFile: null,
      audioFile: null,
    });
    setStep(1);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !candidateId) return;
    setIsSubmitting(true);

    try {
      // 1. Upload file to storage if provided
      let storagePath: string | null = null;
      let mimeType: string | null = null;
      let fileSizeBytes: number | null = null;
      const fileToUpload = form.videoFile || form.audioFile;

      if (fileToUpload) {
        const timestamp = Date.now();
        const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `candidates/${candidateId}/meetings/${timestamp}_${safeName}`;
        mimeType = fileToUpload.type;
        fileSizeBytes = fileToUpload.size;

        notify.loading('Uploading file...', { id: 'meeting-upload' });

        const { error: uploadError } = await supabase.storage
          .from('meeting-recordings')
          .upload(storagePath, fileToUpload, { contentType: fileToUpload.type });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        notify.dismiss('meeting-upload');
      }

      // 2. Call the edge function
      notify.loading('Processing meeting...', { id: 'meeting-process' });

      const payload = {
        candidateId,
        title: form.title,
        meetingType: form.meetingType,
        meetingDate: form.meetingDate,
        jobId: form.jobId || null,
        participants: form.participants || null,
        transcript: form.transcript.trim() || null,
        storagePath,
        mimeType,
        fileSizeBytes,
      };

      const { data, error } = await supabase.functions.invoke('process-manual-meeting', {
        body: payload,
      });

      notify.dismiss('meeting-process');

      if (error) throw error;

      notify.success('Meeting submitted for analysis. Intelligence will update shortly.');
      handleClose();
    } catch (err: unknown) {
      notify.dismiss('meeting-upload');
      notify.dismiss('meeting-process');
      const msg = err instanceof Error ? err.message : 'Failed to submit meeting';
      notify.error(msg);
      console.error('[AddMeetingModal] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Add Meeting{candidateName ? ` — ${candidateName}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-px w-8 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {step === 1 ? 'Details' : step === 2 ? 'Content' : 'Review'}
          </span>
        </div>

        {/* Step 1: Meeting Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Type *</Label>
              <Select value={form.meetingType} onValueChange={(v) => setForm(p => ({ ...p, meetingType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((mt) => (
                    <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Initial screening call with Barbara"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.meetingDate}
                onChange={(e) => setForm(p => ({ ...p, meetingDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Participants (optional)</Label>
              <Input
                placeholder="e.g. John, Sarah, Hiring Manager"
                value={form.participants}
                onChange={(e) => setForm(p => ({ ...p, participants: e.target.value }))}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Content Input */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Provide at least one: transcript, video, or audio.</p>

            {/* Transcript */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label>Paste Transcript</Label>
                {form.transcript.trim().length > 0 && <Check className="h-4 w-4 text-green-500" />}
              </div>
              <Textarea
                placeholder="Paste meeting transcript here..."
                className="min-h-[120px] text-sm font-mono"
                value={form.transcript}
                onChange={(e) => setForm(p => ({ ...p, transcript: e.target.value }))}
              />
            </div>

            {/* Video upload */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <Label>Video Recording</Label>
                {form.videoFile && <Check className="h-4 w-4 text-green-500" />}
              </div>
              {form.videoFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4" />
                    <span className="truncate max-w-[300px]">{form.videoFile.name}</span>
                    <span className="text-muted-foreground">({formatFileSize(form.videoFile.size)})</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setForm(p => ({ ...p, videoFile: null }))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  {...videoDropzone.getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    videoDropzone.isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...videoDropzone.getInputProps()} />
                  <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Drop MP4, WebM, or MOV (max 50MB)</p>
                </div>
              )}
            </div>

            {/* Audio upload */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <Label>Audio Recording</Label>
                {form.audioFile && <Check className="h-4 w-4 text-green-500" />}
              </div>
              {form.audioFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Mic className="h-4 w-4" />
                    <span className="truncate max-w-[300px]">{form.audioFile.name}</span>
                    <span className="text-muted-foreground">({formatFileSize(form.audioFile.size)})</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setForm(p => ({ ...p, audioFile: null }))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  {...audioDropzone.getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    audioDropzone.isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...audioDropzone.getInputProps()} />
                  <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Drop MP3, WAV, M4A, or WebM (max 50MB)</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <h4 className="text-sm font-medium">Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{form.meetingType.replace('_', ' ')}</span>
                <span className="text-muted-foreground">Title</span>
                <span>{form.title}</span>
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(form.meetingDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                {form.participants && (
                  <>
                    <span className="text-muted-foreground">Participants</span>
                    <span>{form.participants}</span>
                  </>
                )}
              </div>

              <div className="pt-2 border-t space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Content provided:</p>
                <div className="flex flex-wrap gap-2">
                  {form.transcript.trim().length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <FileText className="h-3 w-3" /> Transcript ({form.transcript.length.toLocaleString()} chars)
                    </Badge>
                  )}
                  {form.videoFile && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Video className="h-3 w-3" /> Video ({formatFileSize(form.videoFile.size)})
                    </Badge>
                  )}
                  {form.audioFile && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Mic className="h-3 w-3" /> Audio ({formatFileSize(form.audioFile.size)})
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {form.transcript.trim().length > 0 && !form.videoFile && !form.audioFile
                    ? 'Transcript will be analyzed directly by AI.'
                    : form.transcript.trim().length > 0
                    ? 'File will be stored. Provided transcript will be used (skipping transcription).'
                    : 'File will be transcribed (Whisper) then analyzed by AI.'}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">Powered by QUIN</p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...
                  </>
                ) : (
                  <>Submit for Analysis</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
