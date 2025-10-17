import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import {
  Briefcase,
  Settings,
  Plus,
  LayoutDashboard,
  Users,
  Clock,
  Target,
  TrendingUp,
  Edit,
  Save,
  AlertCircle,
} from "lucide-react";
import { CreateJobDialog } from "@/components/partner/CreateJobDialog";
import { PipelineCustomizer } from "@/components/partner/PipelineCustomizer";

interface Job {
  id: string;
  title: string;
  status: string;
  location: string;
  employment_type: string;
  created_at: string;
  pipeline_stages: any;
  company_id: string;
}

interface PipelineSettings {
  default_stages: any[];
  auto_advance_rules: any;
  sla_hours_per_stage: Record<string, number>;
  notification_preferences: {
    notify_on_apply: boolean;
    notify_on_stage_change: boolean;
    notify_on_rejection: boolean;
  };
}

interface RoleSettings {
  [roleId: string]: {
    custom_pipeline: any[] | null;
    custom_questions: any[];
    auto_rejection_criteria: any;
    scoring_weights: {
      technical: number;
      cultural_fit: number;
      communication: number;
    };
  };
}

const CompanyJobsDashboard = () => {
  const navigate = useNavigate();
  const { companyId, role } = useUserRole();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("jobs");
  const [companyName, setCompanyName] = useState("");
  
  // Pipeline Settings
  const [pipelineSettings, setPipelineSettings] = useState<PipelineSettings>({
    default_stages: [
      { name: "Applied", order: 0 },
      { name: "Screening", order: 1 },
      { name: "Interview", order: 2 },
      { name: "Final Review", order: 3 },
      { name: "Offer", order: 4 },
    ],
    auto_advance_rules: {},
    sla_hours_per_stage: {
      "Applied": 24,
      "Screening": 48,
      "Interview": 72,
      "Final Review": 48,
      "Offer": 24,
    },
    notification_preferences: {
      notify_on_apply: true,
      notify_on_stage_change: true,
      notify_on_rejection: true,
    },
  });

  // Role-specific settings
  const [roleSettings, setRoleSettings] = useState<RoleSettings>({});
  const [selectedJobForSettings, setSelectedJobForSettings] = useState<string>("");

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
      fetchJobs();
      fetchSettings();
    }
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompanyName(data?.name || '');
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      // Fetch company-wide settings from a settings table
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (settingsData && typeof settingsData.pipeline_settings === 'object' && settingsData.pipeline_settings !== null) {
        setPipelineSettings(settingsData.pipeline_settings as any as PipelineSettings);
      }

      if (settingsData && typeof settingsData.role_settings === 'object' && settingsData.role_settings !== null) {
        setRoleSettings(settingsData.role_settings as any as RoleSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          {
            company_id: companyId!,
            pipeline_settings: pipelineSettings as any,
            role_settings: roleSettings as any,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'company_id',
          }
        );

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const updateJobPipeline = async (jobId: string, stages: any) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ pipeline_stages: stages as any })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Pipeline updated');
      fetchJobs();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error('Failed to update pipeline');
    }
  };

  if (!companyId && role !== 'admin') {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You need to be associated with a company to access this dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-foreground pb-6">
          <div>
            <p className="text-caps text-muted-foreground">Company Jobs Dashboard</p>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              {companyName || 'Your Company'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your jobs and customize hiring pipeline
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create New Job
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="jobs">
              <Briefcase className="w-4 h-4 mr-2" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              <Target className="w-4 h-4 mr-2" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="role-settings">
              <Settings className="w-4 h-4 mr-2" />
              Role Settings
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No jobs yet</p>
                  <p className="text-muted-foreground mb-4">
                    Create your first job to start hiring
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {job.location} • {job.employment_type}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            job.status === 'published'
                              ? 'default'
                              : job.status === 'draft'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Created {new Date(job.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          {(Array.isArray(job.pipeline_stages) ? job.pipeline_stages.length : 0)} stages
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          onClick={() => navigate(`/jobs/${job.id}/dashboard`)}
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          View Dashboard
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedJobForSettings(job.id);
                            setSelectedTab("pipeline");
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Pipeline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pipeline Settings Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Pipeline Configuration</CardTitle>
                <CardDescription>
                  Set up your company's default hiring pipeline stages and rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Stages */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Default Stages</Label>
                  <p className="text-sm text-muted-foreground">
                    These stages will be used as the template for all new jobs
                  </p>
                  <div className="space-y-2">
                    {pipelineSettings.default_stages.map((stage, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                        <span className="font-medium">{index + 1}.</span>
                        <Input
                          value={stage.name}
                          onChange={(e) => {
                            const newStages = [...pipelineSettings.default_stages];
                            newStages[index].name = e.target.value;
                            setPipelineSettings({
                              ...pipelineSettings,
                              default_stages: newStages,
                            });
                          }}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">SLA (hours):</Label>
                          <Input
                            type="number"
                            value={pipelineSettings.sla_hours_per_stage[stage.name] || 24}
                            onChange={(e) => {
                              setPipelineSettings({
                                ...pipelineSettings,
                                sla_hours_per_stage: {
                                  ...pipelineSettings.sla_hours_per_stage,
                                  [stage.name]: parseInt(e.target.value) || 24,
                                },
                              });
                            }}
                            className="w-20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Notification Preferences</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">New Application</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when a candidate applies
                        </p>
                      </div>
                      <Switch
                        checked={pipelineSettings.notification_preferences.notify_on_apply}
                        onCheckedChange={(checked) =>
                          setPipelineSettings({
                            ...pipelineSettings,
                            notification_preferences: {
                              ...pipelineSettings.notification_preferences,
                              notify_on_apply: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Stage Changes</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when candidates move between stages
                        </p>
                      </div>
                      <Switch
                        checked={pipelineSettings.notification_preferences.notify_on_stage_change}
                        onCheckedChange={(checked) =>
                          setPipelineSettings({
                            ...pipelineSettings,
                            notification_preferences: {
                              ...pipelineSettings.notification_preferences,
                              notify_on_stage_change: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Rejections</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when candidates are rejected
                        </p>
                      </div>
                      <Switch
                        checked={pipelineSettings.notification_preferences.notify_on_rejection}
                        onCheckedChange={(checked) =>
                          setPipelineSettings({
                            ...pipelineSettings,
                            notification_preferences: {
                              ...pipelineSettings.notification_preferences,
                              notify_on_rejection: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={saveSettings} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Save Pipeline Settings
                </Button>
              </CardContent>
            </Card>

            {/* Job-Specific Pipeline Override */}
            {selectedJobForSettings && (
              <Card>
                <CardHeader>
                  <CardTitle>Job-Specific Pipeline</CardTitle>
                  <CardDescription>
                    Customize the pipeline for:{" "}
                    {jobs.find((j) => j.id === selectedJobForSettings)?.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PipelineCustomizer
                    jobId={selectedJobForSettings}
                    companyId={companyId!}
                    currentStages={
                      (jobs.find((j) => j.id === selectedJobForSettings)?.pipeline_stages || 
                        pipelineSettings.default_stages) as any[]
                    }
                    onUpdate={fetchJobs}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Role-Specific Settings Tab */}
          <TabsContent value="role-settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role-Specific Configurations</CardTitle>
                <CardDescription>
                  Customize settings for individual job roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Selection */}
                <div className="space-y-2">
                  <Label>Select Job</Label>
                  <Select
                    value={selectedJobForSettings}
                    onValueChange={setSelectedJobForSettings}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a job to configure" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedJobForSettings && (
                  <>
                    {/* Scoring Weights */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Evaluation Weights</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure how candidates are scored for this role
                      </p>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Technical Skills</Label>
                            <span className="text-sm text-muted-foreground">
                              {roleSettings[selectedJobForSettings]?.scoring_weights?.technical || 40}%
                            </span>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={roleSettings[selectedJobForSettings]?.scoring_weights?.technical || 40}
                            onChange={(e) => {
                              setRoleSettings({
                                ...roleSettings,
                                [selectedJobForSettings]: {
                                  ...roleSettings[selectedJobForSettings],
                                  scoring_weights: {
                                    ...roleSettings[selectedJobForSettings]?.scoring_weights,
                                    technical: parseInt(e.target.value),
                                  },
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Cultural Fit</Label>
                            <span className="text-sm text-muted-foreground">
                              {roleSettings[selectedJobForSettings]?.scoring_weights?.cultural_fit || 30}%
                            </span>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={roleSettings[selectedJobForSettings]?.scoring_weights?.cultural_fit || 30}
                            onChange={(e) => {
                              setRoleSettings({
                                ...roleSettings,
                                [selectedJobForSettings]: {
                                  ...roleSettings[selectedJobForSettings],
                                  scoring_weights: {
                                    ...roleSettings[selectedJobForSettings]?.scoring_weights,
                                    cultural_fit: parseInt(e.target.value),
                                  },
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Communication</Label>
                            <span className="text-sm text-muted-foreground">
                              {roleSettings[selectedJobForSettings]?.scoring_weights?.communication || 30}%
                            </span>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={roleSettings[selectedJobForSettings]?.scoring_weights?.communication || 30}
                            onChange={(e) => {
                              setRoleSettings({
                                ...roleSettings,
                                [selectedJobForSettings]: {
                                  ...roleSettings[selectedJobForSettings],
                                  scoring_weights: {
                                    ...roleSettings[selectedJobForSettings]?.scoring_weights,
                                    communication: parseInt(e.target.value),
                                  },
                                },
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Questions */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Custom Screening Questions</Label>
                      <Textarea
                        placeholder="Add custom questions for this role (one per line)"
                        rows={6}
                        value={
                          roleSettings[selectedJobForSettings]?.custom_questions?.join('\n') || ''
                        }
                        onChange={(e) => {
                          setRoleSettings({
                            ...roleSettings,
                            [selectedJobForSettings]: {
                              ...roleSettings[selectedJobForSettings],
                              custom_questions: e.target.value.split('\n').filter((q) => q.trim()),
                            },
                          });
                        }}
                      />
                    </div>

                    <Button onClick={saveSettings} size="lg">
                      <Save className="w-4 h-4 mr-2" />
                      Save Role Settings
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateJobDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          companyId={companyId}
          onJobCreated={fetchJobs}
        />
      </div>
    </AppLayout>
  );
};

export default CompanyJobsDashboard;
