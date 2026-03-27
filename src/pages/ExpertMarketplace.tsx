import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { GraduationCap, Users, Award, Plus, Search, BookOpen, CheckCircle2 } from "lucide-react";
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
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ['expert-marketplace-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  const user = userData ?? null;

  const { data: experts = [], isLoading: expertsLoading } = useQuery({
    queryKey: ['expert-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select(`*, profiles (full_name, avatar_url, email)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExpertProfile[];
    },
    enabled: !!user,
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['expert-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`*, courses (title)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Module[];
    },
    enabled: !!user,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['expert-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_experts")
        .select(`*, modules (id, title, description, course_id, courses (title)), expert_profiles (*, profiles (full_name, avatar_url, email))`)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ModuleExpert[];
    },
    enabled: !!user,
  });

  const loading = expertsLoading || modulesLoading || assignmentsLoading;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['expert-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['expert-modules'] });
    queryClient.invalidateQueries({ queryKey: ['expert-assignments'] });
  };

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
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "",
    expertise_areas: "",
    hourly_rate: "",
    years_experience: "",
    availability: "available"
  });

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
      toast.error(t('text.expertmarketplace.failedToCreateExpertProfile', 'Failed to create expert profile'));
      return;
    }

    toast.success(t('text.expertmarketplace.expertProfileCreated', 'Expert profile created'));
    setProfileDialogOpen(false);
    resetProfileForm();
    invalidateAll();
  };

  const handleAssignExpert = async () => {
    if (!selectedModule || !selectedExpert) {
      toast.error(t('text.expertmarketplace.pleaseSelectBothModuleAndExpert', 'Please select both module and expert'));
      return;
    }

    const { error } = await supabase
      .from("module_experts")
      .insert({
        module_id: selectedModule,
        expert_id: selectedExpert
      });

    if (error) {
      toast.error(t('text.expertmarketplace.failedToAssignExpert', 'Failed to assign expert'));
      return;
    }

    toast.success(t('text.expertmarketplace.expertAssignedToModule', 'Expert assigned to module'));
    setAssignDialogOpen(false);
    setSelectedModule("");
    setSelectedExpert("");
    invalidateAll();
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
      toast.error(t('text.expertmarketplace.failedToUnassignExpert', 'Failed to unassign expert'));
      return;
    }

    toast.success(t('text.expertmarketplace.expertUnassigned', 'Expert unassigned'));
    setUnassignDialogOpen(false);
    invalidateAll();
  };

  const handleBookSession = async () => {
    if (!bookingExpert || !bookingForm.scheduled_at) {
      toast.error(t('text.expertmarketplace.pleaseSelectADateAndTime', 'Please select a date and time'));
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
      toast.error(t('text.expertmarketplace.failedToBookSession', 'Failed to book session'));
      return;
    }

    toast.success(t('text.expertmarketplace.sessionBookedSuccessfully', 'Session booked successfully'));
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumb />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('expertMarketplace.text4')}</h1>
          <p className="text-muted-foreground">{t('expertMarketplace.text5')}</p>
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
                <DialogTitle>{t('expertMarketplace.text6')}</DialogTitle>
                <DialogDescription>{t('text.expertmarketplace.shareYourExpertiseAndHelpOthers', 'Share your expertise and help others learn')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('expertMarketplace.text7')}</Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder={t('expertMarketplace.text8')}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>{t('expertMarketplace.text9')}</Label>
                  <Input
                    value={profileForm.expertise_areas}
                    onChange={(e) => setProfileForm({ ...profileForm, expertise_areas: e.target.value })}
                    placeholder={t('expertMarketplace.text10')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{"Hourly Rate ($)"}</Label>
                    <Input
                      type="number"
                      value={profileForm.hourly_rate}
                      onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>{t('expertMarketplace.text11')}</Label>
                    <Input
                      type="number"
                      value={profileForm.years_experience}
                      onChange={(e) => setProfileForm({ ...profileForm, years_experience: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('expertMarketplace.text12')}</Label>
                  <Select
                    value={profileForm.availability}
                    onValueChange={(value) => setProfileForm({ ...profileForm, availability: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">{t('expertMarketplace.text13')}</SelectItem>
                      <SelectItem value="limited">{t('expertMarketplace.text14')}</SelectItem>
                      <SelectItem value="unavailable">{t('expertMarketplace.text15')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                  {t('text.expertmarketplace.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleCreateProfile}>{t('expertMarketplace.btn')}</Button>
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
                <DialogTitle>{t('expertMarketplace.text16')}</DialogTitle>
                <DialogDescription>{t('text.expertmarketplace.connectAnExpertWithALearning', 'Connect an expert with a learning module')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('expertMarketplace.text17')}</Label>
                  <Select value={selectedModule} onValueChange={setSelectedModule}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('expertMarketplace.text18')} />
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
                  <Label>{t('expertMarketplace.text19')}</Label>
                  <Select value={selectedExpert} onValueChange={setSelectedExpert}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('expertMarketplace.text20')} />
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
                  {t('text.expertmarketplace.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleAssignExpert}>{t('expertMarketplace.btn2')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="experts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="experts">{t('expertMarketplace.text21')}</TabsTrigger>
          <TabsTrigger value="modules">{t('expertMarketplace.text22')}</TabsTrigger>
          <TabsTrigger value="assignments">{t('expertMarketplace.text23')}</TabsTrigger>
        </TabsList>

        <TabsContent value="experts" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('expertMarketplace.text24')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExperts.map((expert) => (
              <Card key={expert.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={expert.profiles.avatar_url || ""} />
                      <AvatarFallback>{expert.profiles.full_name?.[0] || "E"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{expert.profiles.full_name || "Expert"}</CardTitle>
                      <CardDescription>
                        {expert.years_experience ? `${expert.years_experience} years exp.` : "Expert"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {expert.expertise_areas.map((area, i) => (
                        <Badge key={i} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                    {expert.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {expert.bio}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t mt-auto">
                    <div className="text-sm">
                      <span className="font-bold">${expert.hourly_rate}</span>/hr
                    </div>
                    <Button size="sm" onClick={() => openBookingDialog(expert)}>
                      {t('text.expertmarketplace.bookSession', 'Book Session')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {module.title}
                  </CardTitle>
                  <CardDescription>{module.courses?.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {module.description || "No description available"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{assignment.modules.title}</h3>
                      <Badge variant="outline">{assignment.modules.courses?.title}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('expertMarketplace.text25')}</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignment.expert_profiles.profiles.avatar_url || ""} />
                        <AvatarFallback>E</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {assignment.expert_profiles.profiles.full_name}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openUnassignDialog(assignment.id)}
                  >
                    {t('text.expertmarketplace.unassign', 'Unassign')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('expertMarketplace.text26')}</AlertDialogTitle>
            <AlertDialogDescription>{t('text.expertmarketplace.areYouSureYouWantTo', 'Are you sure you want to remove this expert from the module? This action cannot be undone.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToRemove(null)}>
              {t('text.expertmarketplace.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('text.expertmarketplace.remove', 'Remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Session with {bookingExpert?.profiles.full_name}</DialogTitle>
            <DialogDescription>{t('text.expertmarketplace.scheduleA1on1SessionToGet', 'Schedule a 1-on-1 session to get help with your learning')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('expertMarketplace.text27')}</Label>
              <Input
                type="datetime-local"
                value={bookingForm.scheduled_at}
                onChange={(e) => setBookingForm({ ...bookingForm, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('expertMarketplace.text28')}</Label>
              <Select
                value={bookingForm.duration_minutes}
                onValueChange={(value) => setBookingForm({ ...bookingForm, duration_minutes: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">{"30 minutes"}</SelectItem>
                  <SelectItem value="60">{"60 minutes"}</SelectItem>
                  <SelectItem value="90">{"90 minutes"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('expertMarketplace.text29')}</Label>
              <Select
                value={bookingForm.session_type}
                onValueChange={(value) => setBookingForm({ ...bookingForm, session_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentorship">{t('expertMarketplace.text30')}</SelectItem>
                  <SelectItem value="code_review">{t('expertMarketplace.text31')}</SelectItem>
                  <SelectItem value="career_advice">{t('expertMarketplace.text32')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('expertMarketplace.text33')}</Label>
              <Textarea
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder={t('expertMarketplace.text34')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>
              {t('text.expertmarketplace.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleBookSession}>{t('expertMarketplace.btn3')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}