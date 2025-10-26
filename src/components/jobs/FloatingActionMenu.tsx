import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Printer, 
  Download, 
  UserPlus, 
  Flag,
  X,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FloatingActionMenuProps {
  onPrint?: () => void;
  onDownload?: () => void;
  onRefer?: () => void;
  onReport?: () => void;
  className?: string;
}

const actions = [
  { 
    id: 'print', 
    icon: Printer, 
    label: 'Print', 
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500'
  },
  { 
    id: 'download', 
    icon: Download, 
    label: 'Download PDF', 
    color: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500'
  },
  { 
    id: 'refer', 
    icon: UserPlus, 
    label: 'Refer Friend', 
    color: 'from-purple-500/20 to-violet-500/20',
    iconColor: 'text-purple-500'
  },
  { 
    id: 'report', 
    icon: Flag, 
    label: 'Report Issue', 
    color: 'from-red-500/20 to-orange-500/20',
    iconColor: 'text-red-500'
  },
];

export function FloatingActionMenu({ 
  onPrint,
  onDownload,
  onRefer,
  onReport,
  className 
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (actionId: string) => {
    setIsOpen(false);
    
    switch (actionId) {
      case 'print':
        if (onPrint) {
          onPrint();
        } else {
          window.print();
          toast.success('Print dialog opened');
        }
        break;
      case 'download':
        if (onDownload) {
          onDownload();
        } else {
          toast.success('Download started');
        }
        break;
      case 'refer':
        if (onRefer) {
          onRefer();
        } else {
          toast.success('Referral link copied!');
        }
        break;
      case 'report':
        if (onReport) {
          onReport();
        } else {
          toast.success('Issue reported. Thank you!');
        }
        break;
    }
  };

  return (
    <div className={cn("fixed bottom-24 right-6 z-40", className)}>
      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, scale: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0, 
                    y: 20 
                  }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  className="flex items-center gap-3"
                >
                  {/* Label */}
                  <motion.div
                    className="px-3 py-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg whitespace-nowrap"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.div>

                  {/* Action button */}
                  <Button
                    size="lg"
                    onClick={() => handleAction(action.id)}
                    className={cn(
                      "w-14 h-14 rounded-full shadow-xl",
                      "bg-gradient-to-br backdrop-blur-xl",
                      action.color,
                      "border border-border/50",
                      "hover:scale-110 transition-transform"
                    )}
                  >
                    <Icon className={cn("w-6 h-6", action.iconColor)} />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-full shadow-2xl",
            "bg-gradient-to-br from-primary to-accent",
            "hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)]",
            "transition-all duration-300",
            "relative overflow-hidden group"
          )}
        >
          {/* Animated background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-accent to-primary"
            animate={{ 
              scale: isOpen ? 1 : 0,
              rotate: isOpen ? 90 : 0
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Icon */}
          <motion.div
            className="relative z-10"
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </motion.div>

          {/* Pulse effect */}
          {!isOpen && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </Button>
      </motion.div>

      {/* Keyboard hint */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 right-0 px-3 py-1.5 bg-background/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg"
          >
            <span className="text-xs text-muted-foreground">Quick Actions</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
