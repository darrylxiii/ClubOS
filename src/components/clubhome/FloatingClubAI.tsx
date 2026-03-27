import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { useTranslation } from "react-i18next";

export function FloatingClubAI() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed z-50 flex items-center justify-center",
          "h-14 w-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground",
          "hover:shadow-xl hover:scale-105 active:scale-95 transition-all",
          "bottom-20 right-4 md:bottom-6 md:right-6"
        )}
        aria-label={open ? t('clubAI.close', 'Close Club AI') : t('clubAI.open', 'Open Club AI')}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 rounded-2xl border border-border/30 bg-card/95 shadow-2xl overflow-hidden",
              "bottom-36 right-4 md:bottom-24 md:right-6",
              "w-[calc(100vw-2rem)] max-w-[400px]"
            )}
          >
            <ClubAIHomeChatWidget />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
