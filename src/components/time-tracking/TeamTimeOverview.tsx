import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTimeTracking, TimeEntryData } from "@/hooks/useTimeTracking";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Users, Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMemberStats {
  userId: string;
  name: string;
  avatar: string | null;
  thisWeekHours: number;
  thisMonthHours: number;
  totalBillable: number;
  entries: TimeEntryData[];
}

export function TeamTimeOverview() {
  const { myEntries, isLoading } = useTimeTracking();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Helper to convert duration_seconds to hours
  const getHours = (entry: TimeEntryData): number => {
    return (entry.duration_seconds || 0) / 3600;
  };

  // Group entries by user (for now using myEntries as team data)
  const teamMembers: TeamMemberStats[] = Object.values(
    myEntries.reduce((acc, entry) => {
      const userId = entry.user_id || 'unknown';
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          name: entry.user?.full_name || 'Unknown User',
          avatar: entry.user?.avatar_url || null,
          thisWeekHours: 0,
          thisMonthHours: 0,
          totalBillable: 0,
          entries: [],
        };
      }

      const entryDate = new Date(entry.start_time);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const hours = getHours(entry);

      if (entryDate >= weekStart && entryDate <= weekEnd) {
        acc[userId].thisWeekHours += hours;
      }
      if (entryDate >= monthStart) {
        acc[userId].thisMonthHours += hours;
      }
      if (entry.is_billable) {
        acc[userId].totalBillable += hours;
      }
      acc[userId].entries.push(entry);

      return acc;
    }, {} as Record<string, TeamMemberStats>)
  );

  // Filter by search
  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by this week's hours (descending)
  const sortedMembers = [...filteredMembers].sort((a, b) => b.thisWeekHours - a.thisWeekHours);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Team Overview</h2>
          <p className="text-sm text-muted-foreground">
            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} tracked
          </p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Team Members Grid */}
      {sortedMembers.length === 0 ? (
        <Card className="p-12 text-center border border-border/50">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No team members found
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Team time entries will appear here'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedMembers.map((member) => (
            <TeamMemberCard
              key={member.userId}
              member={member}
              isSelected={selectedMember === member.userId}
              onClick={() => setSelectedMember(
                selectedMember === member.userId ? null : member.userId
              )}
            />
          ))}
        </div>
      )}

      {/* Selected Member Details */}
      {selectedMember && (
        <MemberDetailPanel
          member={sortedMembers.find(m => m.userId === selectedMember)!}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}

interface TeamMemberCardProps {
  member: TeamMemberStats;
  isSelected: boolean;
  onClick: () => void;
}

function TeamMemberCard({ member, isSelected, onClick }: TeamMemberCardProps) {
  const initials = member.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card 
      className={cn(
        "p-4 border cursor-pointer transition-all hover:shadow-md",
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-border/50 hover:border-border"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{member.name}</h3>
          
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{member.thisWeekHours.toFixed(1)}h</span>
              <span className="text-muted-foreground text-xs">this week</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
              {member.totalBillable.toFixed(1)}h billable
            </Badge>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-foreground">
            {member.thisMonthHours.toFixed(0)}h
          </div>
          <div className="text-xs text-muted-foreground">this month</div>
        </div>
      </div>
    </Card>
  );
}

interface MemberDetailPanelProps {
  member: TeamMemberStats;
  onClose: () => void;
}

function MemberDetailPanel({ member, onClose }: MemberDetailPanelProps) {
  const recentEntries = member.entries.slice(0, 10);

  // Helper to convert duration_seconds to hours
  const getHours = (entry: TimeEntryData): number => {
    return (entry.duration_seconds || 0) / 3600;
  };

  return (
    <Card className="p-6 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatar || undefined} />
            <AvatarFallback>
              {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
            <p className="text-sm text-muted-foreground">
              {member.entries.length} time entries
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">This Week</div>
          <div className="text-xl font-bold">{member.thisWeekHours.toFixed(1)}h</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">This Month</div>
          <div className="text-xl font-bold">{member.thisMonthHours.toFixed(1)}h</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Billable</div>
          <div className="text-xl font-bold">{member.totalBillable.toFixed(1)}h</div>
        </div>
      </div>

      <h4 className="text-sm font-medium text-foreground mb-3">Recent Entries</h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {recentEntries.map((entry) => (
          <div 
            key={entry.id}
            className="flex items-center justify-between p-2 rounded bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {format(new Date(entry.start_time), 'MMM d')}
              </span>
              <span className="text-sm text-foreground truncate max-w-[200px]">
                {entry.description || 'No description'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{getHours(entry).toFixed(1)}h</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
