import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Mail, Shield, Trash2 } from "lucide-react";
import { TeamInviteWidget } from "./TeamInviteWidget";

interface TeamManagementProps {
  companyId: string;
  canManage: boolean;
}

export const TeamManagement = ({ companyId, canManage }: TeamManagementProps) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetchMembers();
    fetchCompanyName();
  }, [companyId]);

  const fetchCompanyName = async () => {
    const { data } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
    if (data) setCompanyName(data.name);
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          *,
          profiles:user_id (full_name, email, avatar_url)
        `)
        .eq('company_id', companyId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success("Team member removed");
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Failed to remove team member");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'recruiter': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Invite Widget - Integrated */}
      {canManage && (
        <TeamInviteWidget
          companyId={companyId}
          companyName={companyName}
          canInvite={true}
        />
      )}

      {/* Team Members Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase">Team Members</h2>
      </div>

      {members.filter(m => m.is_active).length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">No team members yet</h3>
            <p className="text-sm text-muted-foreground">
              Invite team members to collaborate on job postings
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {members
            .filter(m => m.is_active)
            .map((member) => (
              <Card key={member.id} className="border-2 border-foreground">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-black">
                        {member.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase">
                          {member.profiles?.full_name || 'Unknown'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {member.profiles?.email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        <Shield className="w-3 h-3 mr-1" />
                        {member.role}
                      </Badge>
                      {canManage && member.role !== 'owner' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
};
