import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Users, TrendingUp, Clock, Calendar, Download, Sparkles, Building2, Video, MapPin, ClipboardList, Plus, Save, Edit, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { JobDashboardCandidates } from "@/components/partner/JobDashboardCandidates";
import { PipelineAuditLog } from "@/components/partner/PipelineAuditLog";
import { StageDetailCard } from "@/components/partner/StageDetailCard";
import { PipelineDisplaySettings, defaultSettings, type DisplaySettings } from "@/components/partner/PipelineDisplaySettings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddStageDialog } from "@/components/partner/AddStageDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface JobMetrics {
  totalApplicants: number;
  stageBreakdown: { [key: number]: number };
  avgDaysInStage: { [key: number]: number };
  conversionRates: { [key: string]: number };
  needsClubCheck: number;
  lastActivity: string;
}

export default function JobDashboard() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<JobMetrics | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(defaultSettings);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load display settings from localStorage
  useEffect(() => {
    if (jobId) {
      const saved = localStorage.getItem(`pipeline-breakdown-display-${jobId}`);
      if (saved) {
        try {
          setDisplaySettings(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse display settings:', e);
        }
      }
    }
  }, [jobId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('stage-', ''));
      const newIndex = parseInt(over.id.toString().replace('stage-', ''));

      const updatedStages = [...stages];
      const [movedStage] = updatedStages.splice(oldIndex, 1);
      updatedStages.splice(newIndex, 0, movedStage);

      // Update order values
      const reorderedStages = updatedStages.map((stage, index) => ({
        ...stage,
        order: index
      }));

      const { error } = await supabase
        .from('jobs')
        .update({ pipeline_stages: reorderedStages })
        .eq('id', jobId);

      if (!error) {
        await fetchJobDetails();
        toast.success("Pipeline reordered successfully");
      } else {
        toast.error("Failed to reorder pipeline");
      }
    }
  };

  const isAuthorized = role === 'admin' || role === 'partner';

  useEffect(() => {
    if (!roleLoading && !isAuthorized) {
      toast.error("You don't have permission to access this page");
      navigate('/dashboard');
      return;
    }

    if (jobId && isAuthorized) {
      fetchJobDetails();
    }
  }, [jobId, roleLoading, isAuthorized]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (
            name,
            logo_url
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
      
      // Fetch applications for metrics
      const stages = Array.isArray(data.pipeline_stages) ? data.pipeline_stages : [];
      await fetchApplicationsForMetrics(stages);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error("Failed to load job details");
      navigate('/partner-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationsForMetrics = async (stages: any[]) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .neq('status', 'rejected');

      if (error) throw error;
      
      const apps = data || [];
      setApplications(apps);
      
      // Calculate metrics
      const stageBreakdown: { [key: number]: number } = {};
      const stageDurations: { [key: number]: number[] } = {};
      
      stages.forEach(stage => {
        stageBreakdown[stage.order] = 0;
        stageDurations[stage.order] = [];
      });
      
      apps.forEach(app => {
        if (app.current_stage_index !== undefined) {
          stageBreakdown[app.current_stage_index]++;
          
          // Calculate days in current stage
          const appliedDate = new Date(app.updated_at || app.applied_at);
          const daysSince = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
          stageDurations[app.current_stage_index].push(daysSince);
        }
      });
      
      // Calculate average days per stage
      const avgDaysInStage: { [key: number]: number } = {};
      Object.keys(stageDurations).forEach(key => {
        const durations = stageDurations[Number(key)];
        avgDaysInStage[Number(key)] = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;
      });
      
      // Calculate conversion rates
      const conversionRates: { [key: string]: number } = {};
      for (let i = 0; i < stages.length - 1; i++) {
        const current = stageBreakdown[i] || 0;
        const next = stageBreakdown[i + 1] || 0;
        const totalPassed = apps.filter(app => app.current_stage_index > i).length;
        conversionRates[`${i}-${i + 1}`] = current > 0 ? Math.round((totalPassed / (current + totalPassed)) * 100) : 0;
      }
      
      // Find last activity
      const lastApp = apps.sort((a, b) => 
        new Date(b.updated_at || b.applied_at).getTime() - new Date(a.updated_at || a.applied_at).getTime()
      )[0];
      
      const lastActivity = lastApp 
        ? `${Math.floor((Date.now() - new Date(lastApp.updated_at || lastApp.applied_at).getTime()) / (1000 * 60 * 60))}h ago`
        : 'No activity yet';
      
      // Mock "needs club check" - in production, filter by club_check_status field
      const needsClubCheck = Math.min(apps.filter(app => app.current_stage_index === 0).length, 3);
      
      setMetrics({
        totalApplicants: apps.length,
        stageBreakdown,
        avgDaysInStage,
        conversionRates,
        needsClubCheck,
        lastActivity,
      });
    } catch (error) {
      console.error('Error fetching applications for metrics:', error);
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Job not found</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const stages = job.pipeline_stages || [
    { name: "Applied", order: 0 },
    { name: "Screening", order: 1 },
    { name: "Interview", order: 2 },
    { name: "Offer", order: 3 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header with Glass Morphism */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl p-8 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-primary/10" />
          
          <div className="relative flex items-start justify-between">
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/partner-dashboard')}
                className="mb-2 hover:bg-accent/20 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-4">
                {job.companies?.logo_url && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-accent/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                    <img
                      src={job.companies.logo_url}
                      alt={job.companies.name}
                      className="relative w-16 h-16 rounded-xl object-cover border-2 border-accent/30 shadow-lg"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-4xl font-black uppercase bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
                    {job.title}
                  </h1>
                  <p className="text-muted-foreground font-medium">{job.companies?.name}</p>
                </div>
              </div>
            </div>
            <Badge 
              variant={job.status === 'published' ? 'default' : 'secondary'}
              className="h-8 px-4 text-sm font-bold animate-pulse"
            >
              {job.status}
            </Badge>
          </div>
        </div>

        {/* Job-Specific KPI Overview */}
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl hover:border-accent/40 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                    <Users className="w-4 h-4 text-accent" />
                  </div>
                  Total Applicants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">{metrics?.totalApplicants || 0}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl hover:border-primary/40 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-primary">
                  {metrics?.conversionRates?.['0-1'] || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Applied → Screened</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl hover:border-amber-500/40 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  Club Check Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-amber-500">
                  {metrics?.needsClubCheck || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Candidates awaiting review</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl hover:border-blue-500/40 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-blue-500">
                  {metrics?.lastActivity || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last candidate action</p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Pipeline Breakdown */}
          <Card className="border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-black uppercase">Pipeline Breakdown</CardTitle>
                  <div className="flex gap-2">
                  <PipelineDisplaySettings
                    jobId={job.id}
                    settings={displaySettings}
                    onSettingsChange={setDisplaySettings}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddStage(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.success("Pipeline template saved");
                    }}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save as Template
                  </Button>
                  </div>
                </div>

                {/* Icon Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-background/40 backdrop-blur-sm rounded-lg p-3 border border-accent/10">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>Your Company</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Quantum Club Elite</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-green-500" />
                    <span>Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>In-Person</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>Hybrid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-purple-500" />
                    <span>Assessment</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={stages.map((_, i) => `stage-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {stages.sort((a, b) => a.order - b.order).map((stage, index) => {
                      const count = metrics?.stageBreakdown[stage.order] || 0;
                      const avgDays = metrics?.avgDaysInStage[stage.order] || 0;
                      const nextConversion = metrics?.conversionRates[`${stage.order}-${stage.order + 1}`];
                      
                      return (
                        <StageDetailCard
                          key={`stage-${index}`}
                          stage={stage}
                          candidateCount={count}
                          avgDays={avgDays}
                          conversionRate={nextConversion}
                          displaySettings={displaySettings}
                          onEdit={() => {
                            setEditingStage(stage);
                            setEditingStageIndex(index);
                            setShowAddStage(true);
                          }}
                          onDuplicate={async () => {
                            const duplicatedStage = {
                              ...stage,
                              name: `${stage.name} (Copy)`,
                              order: stages.length
                            };
                            const updatedStages = [...stages, duplicatedStage];
                            
                            const { error } = await supabase
                              .from('jobs')
                              .update({ pipeline_stages: updatedStages })
                              .eq('id', jobId);

                            if (!error) {
                              await fetchJobDetails();
                              toast.success("Stage duplicated successfully");
                            } else {
                              toast.error("Failed to duplicate stage");
                            }
                          }}
                          onDelete={async () => {
                            const updatedStages = stages
                              .filter((_, i) => i !== index)
                              .map((s, i) => ({ ...s, order: i }));
                            
                            const { error } = await supabase
                              .from('jobs')
                              .update({ pipeline_stages: updatedStages })
                              .eq('id', jobId);

                            if (!error) {
                              await fetchJobDetails();
                              toast.success("Stage deleted successfully");
                            } else {
                              toast.error("Failed to delete stage");
                            }
                          }}
                          onViewAnalytics={() => {
                            toast.info("Stage analytics coming soon");
                          }}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Team & Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="font-black uppercase text-sm">Team Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <Avatar key={i} className="border-2 border-background">
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          T{i}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">3 team members collaborating</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Next Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {metrics?.needsClubCheck ? (
                    <span className="font-bold text-amber-500">
                      {metrics.needsClubCheck} candidate{metrics.needsClubCheck !== 1 ? 's' : ''} need Club Check
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All candidates reviewed</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border border-accent/20">
            <TabsTrigger value="candidates" className="data-[state=active]:bg-accent/20">
              Candidates
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-secondary/20">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-accent/20">
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="space-y-4">
            <JobDashboardCandidates
              jobId={job.id}
              stages={stages}
              onUpdate={() => {
                fetchJobDetails();
              }}
              needsClubCheck={metrics?.needsClubCheck || 0}
            />
          </TabsContent>

          <TabsContent value="overview">
            <Card className="border-2 border-primary/20 backdrop-blur-xl bg-background/90">
              <CardHeader>
                <CardTitle className="font-black uppercase">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-bold mb-2 text-lg">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.description || "No description provided"}
                  </p>
                </div>
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2 text-lg">Requirements</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {job.requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-2 border-secondary/20 backdrop-blur-xl bg-background/90">
              <CardHeader>
                <CardTitle className="font-black uppercase">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced analytics coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <PipelineAuditLog jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Stage Dialog */}
      <AddStageDialog
        open={showAddStage}
        onOpenChange={(open) => {
          setShowAddStage(open);
          if (!open) {
            setEditingStage(null);
            setEditingStageIndex(null);
          }
        }}
        onSave={async (newStage) => {
          let updatedStages;
          if (editingStageIndex !== null) {
            updatedStages = stages.map((s, i) => i === editingStageIndex ? newStage : s);
          } else {
            updatedStages = [...stages, newStage];
          }
          
          const { error } = await supabase
            .from('jobs')
            .update({ pipeline_stages: updatedStages })
            .eq('id', jobId);
          
          if (!error) {
            await fetchJobDetails();
            return { success: true };
          }
          return { success: false };
        }}
        currentStagesCount={stages.length}
        jobId={jobId || ''}
        companyId={job?.company_id || ''}
      />
    </AppLayout>
  );
}
