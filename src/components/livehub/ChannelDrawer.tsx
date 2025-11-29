import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import ChannelList from './ChannelList';

interface ChannelDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChannelId: string | null;
  selectedConversationId: string | null;
  onChannelSelect: (channelId: string, channelType: string, shouldAutoJoin?: boolean) => void;
  onConversationSelect: (conversationId: string) => void;
}

const ChannelDrawer = ({
  open,
  onOpenChange,
  selectedChannelId,
  selectedConversationId,
  onChannelSelect,
  onConversationSelect,
}: ChannelDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Channels & Messages</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto pb-4">
          <ChannelList
            selectedChannelId={selectedChannelId}
            selectedConversationId={selectedConversationId}
            onChannelSelect={onChannelSelect}
            onConversationSelect={onConversationSelect}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ChannelDrawer;
