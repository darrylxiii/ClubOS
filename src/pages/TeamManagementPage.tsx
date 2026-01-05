import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Settings, Mail, Percent, Crown, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function TeamManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [inviteMemberDialogOpen, setInviteMemberDialogOpen] = useState(false);

  const { data: myTeams, isLoading } = useQuery({
    queryKey: ["my-teams", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("freelancer_teams")
        .select(`
          *,
          members:freelancer_team_members(
            *,
            member:profiles!freelancer_team_members_member_id_fkey(id, full_name, avatar_url, email)
          )
        `)
        .eq("owner_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: memberOf } = useQuery({
    queryKey: ["teams-member-of", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("freelancer_team_members")
        .select(`
          *,
          team:freelancer_teams(*)
        `)
        .eq("member_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createTeamMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("freelancer_teams")
        .insert({
          name,
          description,
          owner_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Add owner as team member
      await supabase.from("freelancer_team_members").insert({
        team_id: data.id,
        member_id: user?.id,
        role: "owner",
        revenue_share_percentage: 100,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-teams"] });
      toast.success("Team created successfully");
      setCreateTeamDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to create team", { description: error.message });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your agency and team members</p>
        </div>
        <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Team</DialogTitle>
              <DialogDescription>Set up an agency or collaborative team</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createTeamMutation.mutate({
                  name: formData.get("name") as string,
                  description: formData.get("description") as string,
                });
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input name="name" placeholder="Acme Digital Agency" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" placeholder="What does your team specialize in?" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateTeamDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTeamMutation.isPending}>
                  {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Teams */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Teams I Own
        </h2>

        {myTeams && myTeams.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {myTeams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{team.name}</CardTitle>
                        <CardDescription>{team.members?.length || 1} members</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {team.description && (
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Team Members</p>
                    <div className="space-y-2">
                      {team.members?.map((membership: any) => (
                        <div key={membership.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={membership.member?.avatar_url} />
                              <AvatarFallback>
                                {membership.member?.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{membership.member?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{membership.member?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(membership.role)}
                            <Badge variant="outline" className="capitalize">{membership.role}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Percent className="h-3 w-3" />
                              {membership.revenue_share_percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full" onClick={() => setInviteMemberDialogOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No teams yet</p>
              <p className="text-muted-foreground mb-4">Create a team to collaborate with other freelancers</p>
              <Button onClick={() => setCreateTeamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Team
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Teams I'm a Member Of */}
      {memberOf && memberOf.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams I'm In
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {memberOf.filter((m) => m.team?.owner_id !== user?.id).map((membership) => (
              <Card key={membership.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{membership.team?.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleIcon(membership.role)}
                        <Badge variant="outline" className="capitalize">{membership.role}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Revenue Share</span>
                    <span className="font-medium">{membership.revenue_share_percentage}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteMemberDialogOpen} onOpenChange={setInviteMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="colleague@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="member">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Revenue Share (%)</Label>
              <Input type="number" min="0" max="100" defaultValue="80" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteMemberDialogOpen(false)}>Cancel</Button>
            <Button>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
