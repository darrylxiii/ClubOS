import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import MemberList from './MemberList';

interface MemberDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onlineMembers: any[];
  channelType: string;
  channelId: string | null;
}

const MemberDrawer = ({
  open,
  onOpenChange,
  onlineMembers,
  channelType,
  channelId,
}: MemberDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Members</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto pb-4">
          <MemberList
            onlineMembers={onlineMembers}
            channelType={channelType}
            channelId={channelId}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MemberDrawer;
