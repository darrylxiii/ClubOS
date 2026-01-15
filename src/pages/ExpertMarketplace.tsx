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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Users, Plus, Search, BookOpen, CheckCircle2 } from "lucide-react";
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

interface ExpertProfile {
  id: string;
  user_id: string;
  bio: string | null;
  expertise_areas: string[];
  hourly_rate: number | null;
  availability: string | null;
  years_experience: number | null;
  certification_urls: string[];
  is_verified: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  courses: {
    title: string;
  };
}

interface ModuleExpert {
  id: string;
  module_id: string;
  expert_id: string;
  assigned_at: string;
  modules: Module;
  expert_profiles: ExpertProfile;
}

export default function ExpertMarketplace() {
  const [user, setUser] = useState<any>(null);
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<ModuleExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("");
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [bookingExpert, setBookingExpert] = useState<ExpertProfile | null>(null);
  const [bookingForm, setBookingForm] = useState({
    scheduled_at: "",
    duration_minutes: "60",
    notes: "",
    session_type: "mentorship"
  });

  // Expert profile form
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "",
    expertise_areas: "",
    hourly_rate: "",
    years_experience: "",
    availability: "available"
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadExperts(),
      loadModules(),
      loadAssignments()
    ]);
    setLoading(false);
  };

  const loadExperts = async () => {
    const { data, error } = await supabase
      .from("expert_profiles")
      .select(`
        *,
        profiles (
          full_name,
          avatar_url,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load experts");
      return;
    }
    setExperts(data as any);
  };

  const loadModules = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select(`
        *,
        courses (
          title
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load modules");
      return;
    }
    setModules(data as any);
  };

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from("module_experts")
      .select(`
        *,
        modules (
          id,
          title,
          description,
          course_id,
          courses (
            title
          )
        ),
        expert_profiles (
          *,
          profiles (
            full_name,
            avatar_url,
            email
          )
        )
      `)
      .order("assigned_at", { ascending: false });

    if (error) {
      toast.error("Failed to load assignments");
      return;
    }
    setAssignments(data as any);
  };

  const handleCreateProfile = async () => {
    const expertise = profileForm.expertise_areas.split(',').map(s => s.trim()).filter(Boolean);

    const { error } = await supabase
      .from("expert_profiles")
      .insert({
        user_id: user?.id,
        bio: profileForm.bio,
        expertise_areas: expertise,
        hourly_rate: parseFloat(profileForm.hourly_rate) || null,
        years_experience: parseInt(profileForm.years_experience) || null,
        availability: profileForm.availability,
        is_verified: false
      });

    if (error) {
      toast.error("Failed to create expert profile");
      return;
    }

    toast.success("Expert profile created");
    setProfileDialogOpen(false);
    resetProfileForm();
    loadExperts();
  };

  const handleAssignExpert = async () => {
    if (!selectedModule || !selectedExpert) {
      toast.error("Please select both module and expert");
      return;
    }

    const { error } = await supabase
      .from("module_experts")
      .insert({
        module_id: selectedModule,
        expert_id: selectedExpert
      });

    if (error) {
      toast.error("Failed to assign expert");
      return;
    }

    toast.success("Expert assigned to module");
    setAssignDialogOpen(false);
    setSelectedModule("");
    setSelectedExpert("");
    loadAssignments();
  };

  const openUnassignDialog = (assignmentId: string) => {
    setAssignmentToRemove(assignmentId);
    setUnassignDialogOpen(true);
  };

  const handleUnassign = async () => {
    if (!assignmentToRemove) return;

    const { error } = await supabase
      .from("module_experts")
      .delete()
      .eq("id", assignmentToRemove);

    if (error) {
      logger.error('Unassign expert error:', error);
      toast.error("Failed to unassign expert");
      return;
    }

    toast.success("Expert unassigned");
    setUnassignDialogOpen(false);
    loadAssignments();
  };

  const handleBookSession = async () => {
    if (!bookingExpert || !bookingForm.scheduled_at) {
      toast.error("Please select a date and time");
      return;
    }

    const { error } = await supabase
      .from("expert_sessions")
      .insert({
        expert_id: bookingExpert.id,
        learner_id: user?.id,
        scheduled_at: new Date(bookingForm.scheduled_at).toISOString(),
        duration_minutes: parseInt(bookingForm.duration_minutes),
        session_type: bookingForm.session_type,
        notes: bookingForm.notes,
        status: "scheduled"
      });

    if (error) {
      toast.error("Failed to book session");
      return;
    }

    toast.success("Session booked successfully");
    setBookDialogOpen(false);
    setBookingExpert(null);
    setBookingForm({
      scheduled_at: "",
      duration_minutes: "60",
      notes: "",
      session_type: "mentorship"
    });
  };

  const openBookingDialog = (expert: ExpertProfile) => {
    setBookingExpert(expert);
    setBookDialogOpen(true);
  };

  const resetProfileForm = () => {
    setProfileForm({
      bio: "",
      expertise_areas: "",
      hourly_rate: "",
      years_experience: "",
      availability: "available"
    });
  };

  const filteredExperts = experts.filter(expert =>
    expert.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expert.expertise_areas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
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
            <h1 className="text-3xl font-bold">Expert Marketplace</h1>
            <p className="text-muted-foreground">Connect experts with learning modules</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Become an Expert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Expert Profile</DialogTitle>
                  <DialogDescription>
                    Share your expertise and help others learn
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Tell us about your expertise..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Expertise Areas (comma-separated)</Label>
                    <Input
                      value={profileForm.expertise_areas}
                      onChange={(e) => setProfileForm({ ...profileForm, expertise_areas: e.target.value })}
                      placeholder="React, Node.js, TypeScript"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Hourly Rate ($)</Label>
                      <Input
                        type="number"
                        value={profileForm.hourly_rate}
                        onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label>Years of Experience</Label>
                      <Input
                        type="number"
                        value={profileForm.years_experience}
                        onChange={(e) => setProfileForm({ ...profileForm, years_experience: e.target.value })}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Availability</Label>
                    <Select
                      value={profileForm.availability}
                      onValueChange={(value) => setProfileForm({ ...profileForm, availability: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited Availability</SelectItem>
                        <SelectItem value="unavailable">Currently Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProfile}>
                    Create Profile
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Expert
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Expert to Module</DialogTitle>
                  <DialogDescription>
                    Connect an expert with a learning module
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Module</Label>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.courses?.title} - {module.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Expert</Label>
                    <Select value={selectedExpert} onValueChange={setSelectedExpert}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expert" />
                      </SelectTrigger>
                      <SelectContent>
                        {experts.map((expert) => (
                          <SelectItem key={expert.id} value={expert.id}>
                            {expert.profiles.full_name || expert.profiles.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignExpert}>
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="experts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="experts">Experts</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="experts" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search experts by name or expertise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredExperts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No experts found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredExperts.map((expert) => (
                  <Card key={expert.id}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={expert.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {expert.profiles.full_name?.charAt(0) || expert.profiles.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {expert.profiles.full_name || "Anonymous Expert"}
                            </CardTitle>
                            {expert.is_verified && (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{expert.profiles.email}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {expert.bio && (
                        <p className="text-sm text-muted-foreground">{expert.bio}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {expert.expertise_areas.map((area, idx) => (
                          <Badge key={idx} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                        {expert.years_experience && (
                          <div>
                            <p className="text-muted-foreground">Experience</p>
                            <p className="font-medium">{expert.years_experience} years</p>
                          </div>
                        )}
                        {expert.hourly_rate && (
                          <div>
                            <p className="text-muted-foreground">Rate</p>
                            <p className="font-medium">${expert.hourly_rate}/hr</p>
                          </div>
                        )}
                        {expert.availability && (
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <Badge variant={expert.availability === 'available' ? 'default' : 'secondary'}>
                              {expert.availability}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <Button
                          className="w-full"
                          onClick={() => openBookingDialog(expert)}
                          disabled={expert.availability === 'unavailable'}
                        >
                          Book Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No modules available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {modules.map((module) => (
                  <Card key={module.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{module.title}</CardTitle>
                          <CardDescription>{module.courses?.title}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          {assignments.filter(a => a.module_id === module.id).length} Experts
                        </Badge>
                      </div>
                    </CardHeader>
                    {module.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No expert assignments yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar>
                            <AvatarImage src={assignment.expert_profiles.profiles.avatar_url || undefined} />
                            <AvatarFallback>
                              {assignment.expert_profiles.profiles.full_name?.charAt(0) || 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {assignment.expert_profiles.profiles.full_name || "Expert"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.modules.courses?.title} - {assignment.modules.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUnassignDialog(assignment.id)}
                        >
                          Unassign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unassign Expert</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this expert from the module? This will revoke their teaching access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssignmentToRemove(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnassign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Unassign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book a Session with {bookingExpert?.profiles.full_name}</DialogTitle>
              <DialogDescription>
                Schedule a 1-on-1 session with this expert
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Date & Time</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={bookingForm.scheduled_at}
                  onChange={(e) => setBookingForm({ ...bookingForm, scheduled_at: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (mins)</Label>
                  <Select
                    value={bookingForm.duration_minutes}
                    onValueChange={(val) => setBookingForm({ ...bookingForm, duration_minutes: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_type">Session Type</Label>
                  <Select
                    value={bookingForm.session_type}
                    onValueChange={(val) => setBookingForm({ ...bookingForm, session_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentorship">Mentorship</SelectItem>
                      <SelectItem value="career_coaching">Career Coaching</SelectItem>
                      <SelectItem value="technical_review">Technical Review</SelectItem>
                      <SelectItem value="mock_interview">Mock Interview</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes/Topic</Label>
                <Textarea
                  id="notes"
                  placeholder="What would you like to discuss?"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setBookDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBookSession}>
                Confirm Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
