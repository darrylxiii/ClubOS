import * as React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMobileDetection } from "@/hooks/useMobileDetection";

interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Adaptive component that renders a Drawer on mobile and Dialog on desktop
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: MobileSheetProps) {
  const isMobile = useMobileDetection();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          {(title || description) && (
            <DrawerHeader>
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
