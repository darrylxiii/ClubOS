/**
 * Keyboard Shortcuts Display Component
 * Shows available keyboard navigation hints
 */

import { useState, useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsProps {
  visible: boolean;
  onDismiss: () => void;
  currentStep: number;
  totalSteps: number;
}

export function KeyboardShortcuts({
  visible,
  onDismiss,
  currentStep,
  totalSteps,
}: KeyboardShortcutsProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  // Auto-hide after step 1
  useEffect(() => {
    if (currentStep > 1 && show) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, show, onDismiss]);

  if (!show || currentStep >= totalSteps - 1) return null;

  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-40",
        "transition-all duration-300 ease-out",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/95 backdrop-blur-sm border border-border/50 shadow-lg">
        <Keyboard className="w-4 h-4 text-muted-foreground" />
        
        <div className="flex items-center gap-2">
          <KeyHint keyName="Enter" action="Next" />
          {currentStep > 0 && (
            <KeyHint keyName="Esc" action="Back" />
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1"
          onClick={() => {
            setShow(false);
            onDismiss();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function KeyHint({ keyName, action }: { keyName: string; action: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Badge variant="outline" className="px-1.5 py-0 font-mono text-xs">
        {keyName}
      </Badge>
      <span className="text-muted-foreground">{action}</span>
    </div>
  );
}

/**
 * Floating keyboard hint that appears on first visit
 */
export function KeyboardHintToast({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check if user has seen the hint before
    const hasSeen = localStorage.getItem('funnel_keyboard_hint_seen');
    if (hasSeen) {
      setVisible(false);
      return;
    }

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      localStorage.setItem('funnel_keyboard_hint_seen', 'true');
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
        <Keyboard className="w-4 h-4 text-primary" />
        <span>
          Pro tip: Use <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to continue
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => {
            setVisible(false);
            localStorage.setItem('funnel_keyboard_hint_seen', 'true');
            onDismiss();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
