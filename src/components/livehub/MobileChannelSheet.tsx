import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChannelList from './ChannelList';
import { UserStatusSelector } from './UserStatusSelector';

interface MobileChannelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChannelId: string | null;
  selectedConversationId: string | null;
  onChannelSelect: (channelId: string, channelType: string, shouldAutoJoin?: boolean) => void;
  onConversationSelect: (conversationId: string) => void;
}

const MobileChannelSheet = ({
  open,
  onOpenChange,
  selectedChannelId,
  selectedConversationId,
  onChannelSelect,
  onConversationSelect,
}: MobileChannelSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle>The Quantum Club</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <ChannelList
            selectedChannelId={selectedChannelId}
            selectedConversationId={selectedConversationId}
            onChannelSelect={onChannelSelect}
            onConversationSelect={onConversationSelect}
          />
        </ScrollArea>

        {/* User footer with status */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <UserStatusSelector />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileChannelSheet;
