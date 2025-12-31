/**
 * Recording Consent Modal
 * Displays before recording starts to get explicit consent from participants
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Video, Mic, Shield, FileText, AlertCircle } from 'lucide-react';

interface RecordingConsentModalProps {
  open: boolean;
  onConsent: (options: ConsentOptions) => void;
  onDecline: () => void;
  meetingTitle?: string;
  isHost?: boolean;
}

export interface ConsentOptions {
  allowVideoRecording: boolean;
  allowAudioRecording: boolean;
  allowTranscription: boolean;
  allowAIAnalysis: boolean;
  consentTimestamp: string;
}

export function RecordingConsentModal({
  open,
  onConsent,
  onDecline,
  meetingTitle,
  isHost = false
}: RecordingConsentModalProps) {
  const [options, setOptions] = useState({
    allowVideoRecording: true,
    allowAudioRecording: true,
    allowTranscription: true,
    allowAIAnalysis: true
  });

  const handleConsent = () => {
    onConsent({
      ...options,
      consentTimestamp: new Date().toISOString()
    });
  };

  const allDisabled = !options.allowVideoRecording && !options.allowAudioRecording;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center"
          >
            <Video className="h-8 w-8 text-rose-500" />
          </motion.div>
          <DialogTitle className="text-center text-xl">
            Recording Consent Required
          </DialogTitle>
          <DialogDescription className="text-center">
            {isHost ? (
              <>This meeting will be recorded for quality and training purposes.</>
            ) : (
              <>The host has enabled recording for this meeting.</>
            )}
            {meetingTitle && (
              <span className="block mt-1 font-medium text-foreground">
                "{meetingTitle}"
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Recording Options */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <Checkbox
                id="video"
                checked={options.allowVideoRecording}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, allowVideoRecording: checked as boolean }))
                }
              />
              <div className="flex-1">
                <label htmlFor="video" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  Video Recording
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your video feed will be included in the recording
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <Checkbox
                id="audio"
                checked={options.allowAudioRecording}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, allowAudioRecording: checked as boolean }))
                }
              />
              <div className="flex-1">
                <label htmlFor="audio" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  Audio Recording
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your voice will be captured for transcription
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <Checkbox
                id="transcription"
                checked={options.allowTranscription}
                disabled={!options.allowAudioRecording}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, allowTranscription: checked as boolean }))
                }
              />
              <div className="flex-1">
                <label htmlFor="transcription" className="flex items-center gap-2 font-medium cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Automatic Transcription
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Speech-to-text conversion of the meeting
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <Checkbox
                id="ai"
                checked={options.allowAIAnalysis}
                disabled={!options.allowAudioRecording && !options.allowVideoRecording}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, allowAIAnalysis: checked as boolean }))
                }
              />
              <div className="flex-1">
                <label htmlFor="ai" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  AI Analysis & Insights
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate summaries, action items, and meeting intelligence
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your data is encrypted and stored securely. Recordings are only accessible to 
                meeting participants and authorized personnel. You can request deletion at any time 
                per GDPR/privacy requirements.
              </p>
            </div>
          </div>

          {/* Warning if all options disabled */}
          <AnimatePresence>
            {allDisabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    You've opted out of all recording. You can still participate in the meeting, 
                    but no recording of your participation will be saved.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onDecline}
            className="flex-1"
          >
            Leave Meeting
          </Button>
          <Button 
            onClick={handleConsent}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
          >
            {allDisabled ? 'Join Without Recording' : 'I Consent to Recording'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
