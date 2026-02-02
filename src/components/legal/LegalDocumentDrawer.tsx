import { ReactNode, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Download, Check, FileText, Clock, List } from "lucide-react";

interface LegalDocumentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  lastUpdated: string;
  summary?: ReactNode;
  children: ReactNode;
  showAcceptButton?: boolean;
  onAccept?: () => void;
  acceptLabel?: string;
}

export function LegalDocumentDrawer({
  open,
  onOpenChange,
  title,
  lastUpdated,
  summary,
  children,
  showAcceptButton = false,
  onAccept,
  acceptLabel = "I've Read This",
}: LegalDocumentDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("full");

  const handleAccept = () => {
    onAccept?.();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-h-[90vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <DrawerTitle className="text-left">{title}</DrawerTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>Last updated: {lastUpdated}</span>
                </div>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </div>

          {summary && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="full" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Full Document
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          {summary ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="summary" className="mt-4 pb-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {summary}
                </div>
              </TabsContent>
              <TabsContent value="full" className="mt-4 pb-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {children}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none py-4">
              {children}
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t border-border/50 pt-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" className="flex-1" disabled>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {showAcceptButton ? (
              <Button onClick={handleAccept} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                {acceptLabel}
              </Button>
            ) : (
              <DrawerClose asChild>
                <Button variant="secondary" className="flex-1">
                  Close
                </Button>
              </DrawerClose>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
