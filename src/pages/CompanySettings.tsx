import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Trash2 } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Company {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  industry: string | null;
  company_size: string | null;
  headquarters_location: string | null;
  placement_fee_percentage: number | null;
}

interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface CompanyBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
}

export default function CompanySettings() {
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [branding, setBranding] = useState<CompanyBranding>({
    primary_color: "#3B82F6",
    secondary_color: "#1E293B",
    accent_color: "#F59E0B",
    font_heading: "Inter",
    font_body: "Inter"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    location: "",
    feePercentage: "20"
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadCompanyData = async () => {
    setLoading(true);
    
    // Get user's company
    const { data: memberData, error: memberError } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user?.id)
      .eq("is_active", true)
      .single();

    if (memberError || !memberData) {
      setLoading(false);
      return;
    }

    // Load company details
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", memberData.company_id)
      .single();

    if (companyData) {
      setCompany(companyData);
      setCompanyForm({
        name: companyData.name,
        description: companyData.description || "",
        website: companyData.website_url || "",
        industry: companyData.industry || "",
        size: companyData.company_size || "",
        location: companyData.headquarters_location || "",
        feePercentage: companyData.placement_fee_percentage?.toString() || "20"
      });
    }

    // Load company members
    const { data: membersData } = await supabase
      .from("company_members")
      .select(`
        *,
        profiles (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("company_id", memberData.company_id)
      .eq("is_active", true);

    if (membersData) {
      setMembers(membersData as any);
    }

    // Load branding
    const { data: brandingData } = await supabase
      .from("company_branding")
      .select("*")
      .eq("company_id", memberData.company_id)
      .single();

    if (brandingData) {
      setBranding({
        primary_color: brandingData.primary_color || "#3B82F6",
        secondary_color: brandingData.secondary_color || "#1E293B",
        accent_color: brandingData.accent_color || "#F59E0B",
        font_heading: brandingData.font_heading || "Inter",
        font_body: brandingData.font_body || "Inter"
      });
    }

    setLoading(false);
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    
    setSaving(true);
    const feePercentage = parseFloat(companyForm.feePercentage);
    
    if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
      toast.error("Fee percentage must be between 0 and 100");
      setSaving(false);
      return;
    }
    
    const { error } = await supabase
      .from("companies")
      .update({
        name: companyForm.name,
        description: companyForm.description,
        website_url: companyForm.website,
        industry: companyForm.industry,
        company_size: companyForm.size,
        headquarters_location: companyForm.location,
        placement_fee_percentage: feePercentage
      })
      .eq("id", company.id);

    if (error) {
      toast.error("Failed to save company settings");
    } else {
      toast.success("Company settings saved");
      loadCompanyData();
    }
    setSaving(false);
  };

  const handleSaveBranding = async () => {
    if (!company) return;

    setSaving(true);
    const { error } = await supabase
      .from("company_branding")
      .upsert({
        company_id: company.id,
        ...branding
      });

    if (error) {
      toast.error("Failed to save branding");
    } else {
      toast.success("Branding saved");
    }
    setSaving(false);
  };

  const handleInviteMember = async () => {
    if (!company || !inviteEmail) return;

    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail)
      .single();

    if (userError || !userData) {
      toast.error("User not found. They need to create an account first.");
      return;
    }

    // Add to company_members
    const { error } = await supabase
      .from("company_members")
      .insert({
        company_id: company.id,
        user_id: userData.id,
        role: inviteRole,
        is_active: true
      });

    if (error) {
      toast.error("Failed to invite member");
    } else {
      toast.success("Member invited successfully");
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      loadCompanyData();
    }
  };

  const openRemoveMemberDialog = (memberId: string) => {
    setMemberToRemove(memberId);
    setRemoveMemberDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    const { error } = await supabase
      .from("company_members")
      .update({ is_active: false })
      .eq("id", memberToRemove);

    if (error) {
      logger.error('Remove member error:', error);
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
      loadCompanyData();
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("company_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated");
      loadCompanyData();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You are not associated with any company</p>
              <p className="text-sm text-muted-foreground mt-2">Contact an admin to be added to a company</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Company Settings</h1>
          <p className="text-muted-foreground">Manage your company profile and team</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Website</Label>
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    placeholder="Technology, Finance, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Company Size</Label>
                  <Select
                    value={companyForm.size}
                    onValueChange={(value) => setCompanyForm({ ...companyForm, size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501+">501+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={companyForm.location}
                    onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div>
                <Label>Placement Fee Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={companyForm.feePercentage}
                  onChange={(e) => setCompanyForm({ ...companyForm, feePercentage: e.target.value })}
                  placeholder="20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of candidate's annual salary charged as placement fee (used for revenue calculations)
                </p>
              </div>

              <Button onClick={handleSaveCompany} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your company team</CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Add a new member to your company
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="member@company.com"
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInviteMember}>
                        Send Invite
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profiles.full_name?.charAt(0) || member.profiles.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateMemberRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      {member.user_id !== user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openRemoveMemberDialog(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Customize your company's brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={branding.accent_color}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={branding.accent_color}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Heading Font</Label>
                  <Input
                    value={branding.font_heading}
                    onChange={(e) => setBranding({ ...branding, font_heading: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Body Font</Label>
                  <Input
                    value={branding.font_body}
                    onChange={(e) => setBranding({ ...branding, font_body: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-6 border rounded-lg" style={{
                backgroundColor: branding.primary_color + '10',
                borderColor: branding.primary_color
              }}>
                <h3 className="text-xl font-bold mb-2" style={{ 
                  fontFamily: branding.font_heading,
                  color: branding.primary_color 
                }}>
                  Preview
                </h3>
                <p style={{ 
                  fontFamily: branding.font_body,
                  color: branding.secondary_color 
                }}>
                  This is how your branding will look across the platform
                </p>
                <Button 
                  className="mt-4" 
                  style={{ backgroundColor: branding.accent_color }}
                >
                  Accent Button
                </Button>
              </div>

              <Button onClick={handleSaveBranding} disabled={saving}>
                {saving ? "Saving..." : "Save Branding"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the company? They will lose access to all company resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AppLayout>
  );
}
