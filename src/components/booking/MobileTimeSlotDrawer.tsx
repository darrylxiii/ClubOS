import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartSlotBadge } from "./SmartSlotRecommendation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface TimeSlot {
  start: string;
  end: string;
}

interface MobileTimeSlotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  recommendations: Set<string>;
  formatSlot: (slot: TimeSlot) => { primary: string; secondary?: string };
  dateLabel: string;
}

/**
 * Bottom-sheet drawer for time slot selection on mobile.
 * Touch-optimized with 48px min tap targets.
 */
export function MobileTimeSlotDrawer({
  open,
  onOpenChange,
  slots,
  selectedSlot,
  onSelect,
  recommendations,
  formatSlot,
  dateLabel,
}: MobileTimeSlotDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            {dateLabel}
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6 space-y-2">
          {slots.map((slot, i) => {
            const { primary, secondary } = formatSlot(slot);
            const isSelected = selectedSlot?.start === slot.start;
            return (
              <Button
                key={i}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "w-full justify-start text-left min-h-[48px]",
                  secondary ? "h-auto py-3" : "",
                  isSelected
                    ? "ring-2 ring-primary bg-primary text-primary-foreground"
                    : "border-border/60"
                )}
                onClick={() => {
                  onSelect(slot);
                  onOpenChange(false);
                }}
              >
                <Clock className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="flex flex-col items-start flex-1">
                  <span className="text-base">{primary}</span>
                  {secondary && (
                    <span
                      className={cn(
                        "text-xs",
                        isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {secondary}
                    </span>
                  )}
                </div>
                <SmartSlotBadge isRecommended={recommendations.has(slot.start)} />
              </Button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
