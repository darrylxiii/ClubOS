import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface CompanyMember {
  id: string;
  role?: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface CompanyMembersStackProps {
  companyId: string;
  maxVisible?: number;
  showFull?: boolean;
}

export function CompanyMembersStack({ companyId, maxVisible = 3, showFull = false }: CompanyMembersStackProps) {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [companyId]);

  const loadMembers = async () => {
    try {
      // First get company members
      // Get all members if showFull, otherwise limit
      const query = supabase
        .from('company_members')
        .select('id, user_id, role')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (!showFull) {
        query.limit(maxVisible + 1);
      }
      
      const { data: membersData, error: membersError } = await query;

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Then get profile data
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const combinedData = membersData.map(member => ({
        id: member.id,
        role: member.role,
        profiles: profilesMap.get(member.user_id) || {
          full_name: 'Unknown User',
          avatar_url: null,
        }
      }));

      setMembers(combinedData as any);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No team members yet</p>
      </div>
    );
  }

  // Full grid view for team tab
  if (showFull) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {members.map((member: any) => (
          <Card key={member.id} className="glass backdrop-blur-lg hover-scale">
            <CardContent className="p-4 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-accent">
                <AvatarImage src={member.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-lg bg-gradient-accent text-white font-bold">
                  {member.profiles?.full_name 
                    ? member.profiles.full_name.substring(0, 2).toUpperCase() 
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-bold truncate">{member.profiles?.full_name || "Unknown"}</h4>
              {member.role && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {member.role}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Stacked avatar view for cards
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = members.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleMembers.map((member, index) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <Avatar 
                className="w-8 h-8 border-2 border-background ring-1 ring-border hover:z-10 transition-all cursor-pointer"
                style={{ zIndex: visibleMembers.length - index }}
              >
                <AvatarImage src={member.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">
                  {member.profiles?.full_name 
                    ? member.profiles.full_name.substring(0, 2).toUpperCase() 
                    : "?"}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{member.profiles?.full_name || "Unknown"}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-background bg-muted text-xs font-semibold cursor-pointer hover:bg-muted/80 transition-colors">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{remainingCount} more team {remainingCount === 1 ? 'member' : 'members'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
