import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';

export function VoiceCommandButton() {
  const { t } = useTranslation('admin');
  const { isListening, transcript, isSupported, toggle } = useVoiceCommands();

  if (!isSupported) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className={cn(
                "relative rounded-full w-9 h-9 hover:bg-white/10 dark:hover:bg-white/5 transition-all",
                isListening && "text-primary"
              )}
              aria-label={isListening ? t('voiceCommandButton.stopVoiceCommands') : t('voiceCommandButton.startVoiceCommands')}
            >
              {isListening ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Mic className="h-4 w-4" />
                </motion.div>
              ) : (
                <MicOff className="h-4 w-4" />
              )}

              {/* Active indicator ring */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-md border-2 border-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isListening
              ? t('voiceCommandButton.listeningPrompt')
              : t('voiceCommandButton.voiceCommandsAdmin')}
          </TooltipContent>
        </Tooltip>

        {/* Floating transcript bubble */}
        <AnimatePresence>
          {isListening && transcript && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className={cn(
                "absolute top-full right-0 mt-2 z-50",
                "bg-card border border-border/50 rounded-lg shadow-lg",
                "px-3 py-2 min-w-[200px] max-w-[300px]"
              )}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="h-2 w-2 rounded-full bg-primary shrink-0"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
                <p className="text-sm text-foreground truncate">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}