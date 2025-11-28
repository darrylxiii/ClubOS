import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Member {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'away' | 'offline';
}

interface MemberListProps {
  onlineMembers: Member[];
}

const MemberList = ({ onlineMembers }: MemberListProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="w-60 bg-card border-l border-border flex flex-col">
      <div className="h-12 px-4 flex items-center border-b border-border">
        <h3 className="font-semibold text-sm">Members — {onlineMembers.length}</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {onlineMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {member.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
              </div>
              <span className="text-sm truncate">{member.full_name}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MemberList;
