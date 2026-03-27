import { usePagePresence } from "@/hooks/usePagePresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';

const MAX_VISIBLE = 5;

export function PagePresenceAvatars() {
  const { t } = useTranslation('common');
  const { viewers } = usePagePresence();

  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, MAX_VISIBLE);
  const overflow = viewers.length - MAX_VISIBLE;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5">
        <AnimatePresence mode="popLayout">
          <div className="flex -space-x-2">
            {visible.map((viewer) => (
              <Tooltip key={viewer.user_id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Avatar className={cn(
                      "h-7 w-7 border-2 border-background ring-2 ring-emerald-500/40",
                      "cursor-default"
                    )}>
                      <AvatarImage src={viewer.user_avatar || undefined} alt={viewer.user_name} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        {(viewer.user_name || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">{viewer.user_name}</p>
                  <p className="text-muted-foreground">
                    {viewer.is_editing ? t('presence.editing', 'Editing this page') : t('presence.viewing', 'Viewing this page')}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}

            {overflow > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        +{overflow}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {viewers.slice(MAX_VISIBLE).map(v => v.user_name).join(", ")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </AnimatePresence>

        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {t('presence.othersHere', '{{count}} others here', { count: viewers.length })}
        </span>
      </div>
    </TooltipProvider>
  );
}
