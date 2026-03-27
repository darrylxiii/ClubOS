import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import MemberList from './MemberList';

interface MobileMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onlineMembers: any[];
  channelType: string;
  channelId: string | null;
}

const MobileMemberSheet = ({
  open,
  onOpenChange,
  onlineMembers,
  channelType,
  channelId,
}: MobileMemberSheetProps) => {
  const { t } = useTranslation('meetings');
  const onlineCount = onlineMembers.length;
  const offlineCount = 0; // Will be enhanced later

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle>{t('livehub.membersCount', { count: onlineCount })}</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <MemberList
            onlineMembers={onlineMembers}
            channelType={channelType}
            channelId={channelId}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMemberSheet;
