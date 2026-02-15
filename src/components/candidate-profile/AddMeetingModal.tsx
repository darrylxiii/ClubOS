/**
 * AddMeetingModal
 *
 * Comprehensive single-page modal for adding past meetings / recordings
 * to a candidate profile. Captures all metadata needed for RAG and ML.
 *
 * NOT the same as CreateMeetingDialog (which schedules future meetings).
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import notify from '@/lib/notify';
import { useDropzone } from 'react-dropzone';
import {
  Video,
  Mic,
  FileText,
  Check,
  Upload,
  X,
  Brain,
  Loader2,
  ChevronDown,
  Tags,
  Shield,
  StickyNote,
  Users,
} from 'lucide-react';
import { ParticipantPicker, type Participant } from './ParticipantPicker';

// ── Constants ──────────────────────────────────────────────────────────

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

const DURATIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
  { value: '120', label: '120 min' },
] as const;

const ACCEPTED_VIDEO = { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] };
const ACCEPTED_AUDIO = { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'], 'audio/mp4': ['.m4a'], 'audio/webm': ['.webm'], 'audio/x-m4a': ['.m4a'] };
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ── Types ──────────────────────────────────────────────────────────────

interface AddMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName?: string;
  jobId?: string;
}

interface FormData {
  title: string;
  meetingType: string;
  meetingDate: string;
  duration: string;
  description: string;
  agenda: string;
  jobId: string;
  participants: Participant[];
  transcript: string;
  videoFile: File | null;
  audioFile: File | null;
  notes: string;
  tags: string;
  recordingConsent: boolean;
  isPrivate: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function AddMeetingModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobId: defaultJobId,
}: AddMeetingModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const initialParticipants: Participant[] = candidateName
    ? [{ id: 'candidate-auto', userId: undefined, name: candidateName, role: 'candidate' }]
    : [];

  const [form, setForm] = useState<FormData>({
    title: '',
    meetingType: '',
    meetingDate: new Date().toISOString().slice(0, 16),
    duration: '',
    description: '',
    agenda: '',
    jobId: defaultJobId || '',
    participants: initialParticipants,
    transcript: '',
    videoFile: null,
    audioFile: null,
    notes: '',
    tags: '',
    recordingConsent: false,
    isPrivate: false,
  });

  const hasContent = form.transcript.trim().length > 0 || form.videoFile !== null || form.audioFile !== null;
  const canSubmit = form.title.trim().length > 0 && form.meetingType && hasContent;

  // ── File drop handlers ─────────────────────────────────────────────

  const onVideoDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { notify.error('File too large. Maximum 50MB.'); return; }
    setForm(p => ({ ...p, videoFile: file }));
  }, []);

  const onAudioDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { notify.error('File too large. Maximum 50MB.'); return; }
    setForm(p => ({ ...p, audioFile: file }));
  }, []);

  const videoDropzone = useDropzone({ onDrop: onVideoDrop, accept: ACCEPTED_VIDEO, maxFiles: 1, multiple: false });
  const audioDropzone = useDropzone({ onDrop: onAudioDrop, accept: ACCEPTED_AUDIO, maxFiles: 1, multiple: false });

  // ── Helpers ────────────────────────────────────────────────────────

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(p => ({ ...p, [key]: value }));

  const formatFileSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const resetForm = () => {
    setForm({
      title: '',
      meetingType: '',
      meetingDate: new Date().toISOString().slice(0, 16),
      duration: '',
      description: '',
      agenda: '',
      jobId: defaultJobId || '',
      participants: initialParticipants,
      transcript: '',
      videoFile: null,
      audioFile: null,
      notes: '',
      tags: '',
      recordingConsent: false,
      isPrivate: false,
    });
    setContentOpen(true);
    setNotesOpen(false);
    setPrivacyOpen(false);
  };

  const handleClose = () => {
    if (!isSubmitting) { resetForm(); onOpenChange(false); }
  };

  // ── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user || !candidateId) return;
    setIsSubmitting(true);

    try {
      // 1. Upload file if provided
      let storagePath: string | null = null;
      let mimeType: string | null = null;
      let fileSizeBytes: number | null = null;
      const fileToUpload = form.videoFile || form.audioFile;

      if (fileToUpload) {
        const ts = Date.now();
        const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `candidates/${candidateId}/meetings/${ts}_${safeName}`;
        mimeType = fileToUpload.type;
        fileSizeBytes = fileToUpload.size;

        notify.loading('Uploading file...', { id: 'meeting-upload' });
        const { error: uploadError } = await supabase.storage
          .from('meeting-recordings')
          .upload(storagePath, fileToUpload, { contentType: fileToUpload.type });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        notify.dismiss('meeting-upload');
      }

      // 2. Build participant payload
      const participantsPayload = form.participants.map((p) => ({
        userId: p.userId || null,
        name: p.name,
        email: p.email || null,
        role: p.role,
        isGuest: p.isGuest || false,
      }));

      // 3. Call edge function
      notify.loading('Processing meeting...', { id: 'meeting-process' });

      const { error } = await supabase.functions.invoke('process-manual-meeting', {
        body: {
          candidateId,
          title: form.title,
          meetingType: form.meetingType,
          meetingDate: form.meetingDate,
          duration: form.duration ? parseInt(form.duration, 10) : null,
          description: form.description.trim() || null,
          agenda: form.agenda.trim() || null,
          jobId: form.jobId || null,
          participants: participantsPayload,
          transcript: form.transcript.trim() || null,
          storagePath,
          mimeType,
          fileSizeBytes,
          notes: form.notes.trim() || null,
          tags: form.tags.trim() || null,
          isPrivate: form.isPrivate,
          recordingConsent: form.recordingConsent,
        },
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

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Add Meeting{candidateName ? ` — ${candidateName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Section: Meeting Details ─────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Meeting Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input
                  placeholder="e.g. Screening call with Barbara"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meeting Type *</Label>
                <Select value={form.meetingType} onValueChange={(v) => set('meetingType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.meetingDate}
                  onChange={(e) => set('meetingDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select value={form.duration} onValueChange={(v) => set('duration', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Brief description of the meeting..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Agenda</Label>
              <Textarea
                placeholder="Meeting agenda or discussion topics..."
                value={form.agenda}
                onChange={(e) => set('agenda', e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
          </section>

          {/* ── Section: Participants ────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Participants
            </h3>
            <ParticipantPicker
              participants={form.participants}
              onChange={(p) => set('participants', p)}
            />
          </section>

          {/* ── Section: Content & Recordings (collapsible) ──────── */}
          <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Content & Recordings
                {hasContent && <Check className="h-3.5 w-3.5 text-primary" />}
              </h3>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${contentOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              <p className="text-xs text-muted-foreground">Provide at least one: transcript, video, or audio.</p>

              {/* Transcript */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">Paste Transcript</Label>
                  {form.transcript.trim().length > 0 && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <Textarea
                  placeholder="Paste meeting transcript here..."
                  className="min-h-[100px] text-xs font-mono"
                  value={form.transcript}
                  onChange={(e) => set('transcript', e.target.value)}
                />
              </div>

              {/* Video */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">Video Recording</Label>
                  {form.videoFile && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                {form.videoFile ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 text-xs">
                      <Video className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[280px]">{form.videoFile.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(form.videoFile.size)})</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set('videoFile', null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    {...videoDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                      videoDropzone.isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <input {...videoDropzone.getInputProps()} />
                    <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Drop MP4, WebM, or MOV (max 50MB)</p>
                  </div>
                )}
              </div>

              {/* Audio */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">Audio Recording</Label>
                  {form.audioFile && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                {form.audioFile ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 text-xs">
                      <Mic className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[280px]">{form.audioFile.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(form.audioFile.size)})</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => set('audioFile', null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    {...audioDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                      audioDropzone.isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <input {...audioDropzone.getInputProps()} />
                    <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Drop MP3, WAV, M4A, or WebM (max 50MB)</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Section: Notes & Tags (collapsible) ──────────────── */}
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Notes & Tags
                {(form.notes.trim() || form.tags.trim()) && <Check className="h-3.5 w-3.5 text-primary" />}
              </h3>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Strategist Notes</Label>
                <Textarea
                  placeholder="Your observations, impressions, or context..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Tags className="h-3 w-3" /> Tags
                </Label>
                <Input
                  placeholder="e.g. senior, frontend, strong-communicator"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Comma-separated. Used for search and clustering.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Section: Privacy (collapsible) ───────────────────── */}
          <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Privacy
              </h3>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${privacyOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="consent"
                  checked={form.recordingConsent}
                  onCheckedChange={(c) => set('recordingConsent', c === true)}
                />
                <Label htmlFor="consent" className="text-xs cursor-pointer">
                  All participants consented to being recorded
                </Label>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="private" className="text-xs">
                  Mark as private (not shareable in dossiers)
                </Label>
                <Switch
                  id="private"
                  checked={form.isPrivate}
                  onCheckedChange={(c) => set('isPrivate', c)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-[10px] text-muted-foreground">Powered by QUIN</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Processing...</>
              ) : (
                'Submit Meeting'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
