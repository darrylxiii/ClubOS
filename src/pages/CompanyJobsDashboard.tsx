import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";

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
import { useRole } from "@/contexts/RoleContext";
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
import { JobCard } from "@/components/partner/JobCard";
import { MobileJobCard } from "@/components/partner/MobileJobCard";
import { JobCardSkeleton } from "@/components/LoadingSkeletons";
import { EmptyState } from "@/components/EmptyState";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { t } = useTranslation('jobs');
  const navigate = useNavigate();
  const { companyId, currentRole: role } = useRole();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("jobs");
  const [companyName, setCompanyName] = useState("");
  const isMobile = useIsMobile();
  
  // Pipeline Settings
  const [pipelineSettings, setPipelineSettings] = useState<PipelineSettings>({
    default_stages: [
      { name: t('text.companyjobsdashboard.applied', 'Applied'), order: 0 },
      { name: t('text.companyjobsdashboard.screening', 'Screening'), order: 1 },
      { name: t('text.companyjobsdashboard.interview', 'Interview'), order: 2 },
      { name: t('text.companyjobsdashboard.finalReview', 'Final Review'), order: 3 },
      { name: t('text.companyjobsdashboard.offer', 'Offer'), order: 4 },
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
        .maybeSingle();

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
      toast.error(t('text.companyjobsdashboard.failedToLoadJobs', 'Failed to load jobs'));
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
      toast.success(t('text.companyjobsdashboard.settingsSavedSuccessfully', 'Settings saved successfully'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('text.companyjobsdashboard.failedToSaveSettings', 'Failed to save settings'));
    }
  };

  const updateJobPipeline = async (jobId: string, stages: any) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ pipeline_stages: stages as any })
        .eq('id', jobId);

      if (error) throw error;
      toast.success(t('text.companyjobsdashboard.pipelineUpdated', 'Pipeline updated'));
      fetchJobs();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error(t('text.companyjobsdashboard.failedToUpdatePipeline', 'Failed to update pipeline'));
    }
  };

  if (!companyId && role !== 'admin') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-card/30 backdrop-blur border-border/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>{t('text.companyjobsdashboard.youNeedToBeAssociatedWith', 'You need to be associated with a company to access this dashboard.')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">
              {companyName || 'Your Company'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('companyJobsDashboard.desc')}</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5 h-9 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('text.companyjobsdashboard.newJob', 'New Job')}</span>
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-full sm:max-w-md h-auto min-h-[44px] bg-card/30 backdrop-blur-sm border border-border/20">
            <TabsTrigger value="jobs" className="text-xs sm:text-sm">
              <Briefcase className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('text.companyjobsdashboard.jobs', 'Jobs')}</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs sm:text-sm">
              <Target className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('text.companyjobsdashboard.pipeline', 'Pipeline')}</span>
            </TabsTrigger>
            <TabsTrigger value="role-settings" className="text-xs sm:text-sm">
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('text.companyjobsdashboard.settings', 'Settings')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </div>
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title={t('text.companyjobsdashboard.noJobsYet', 'No jobs yet')}
                description={t('text.companyjobsdashboard.createYourFirstJobToStart', 'Create your first job to start hiring top talent')}
                action={{
                  label: t('text.companyjobsdashboard.createJob', 'Create Job'),
                  onClick: () => setCreateDialogOpen(true),
                }}
              />
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) =>
                  isMobile ? (
                    <MobileJobCard key={job.id} job={job} />
                  ) : (
                    <JobCard
                      key={job.id}
                      job={job}
                      onViewDashboard={(jobId) => navigate(`/jobs/${jobId}/dashboard`)}
                      onEditPipeline={(jobId) => {
                        setSelectedJobForSettings(jobId);
                        setSelectedTab("pipeline");
                      }}
                    />
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* Pipeline Settings Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('text.companyjobsdashboard.defaultPipelineConfiguration', 'Default Pipeline Configuration')}</CardTitle>
                <CardDescription>{t('text.companyjobsdashboard.setUpYourCompanysDefaultHiring', 'Set up your company\'s default hiring pipeline stages and rules')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Stages */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">{t('text.companyjobsdashboard.defaultStages', 'Default Stages')}</Label>
                  <p className="text-sm text-muted-foreground">{t('companyJobsDashboard.desc2')}</p>
                  <div className="space-y-2">
                    {pipelineSettings.default_stages.map((stage, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 border rounded-lg">
                        <span className="font-medium shrink-0">{index + 1}.</span>
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
                          className="flex-1 w-full"
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Label className="text-sm shrink-0">{t('text.companyjobsdashboard.slaHours', 'SLA (hours):')}</Label>
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
                  <Label className="text-base font-semibold">{t('text.companyjobsdashboard.notificationPreferences', 'Notification Preferences')}</Label>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{t('companyJobsDashboard.desc3')}</p>
                        <p className="text-sm text-muted-foreground">{t('companyJobsDashboard.desc4')}</p>
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{t('companyJobsDashboard.desc5')}</p>
                        <p className="text-sm text-muted-foreground">{t('companyJobsDashboard.desc6')}</p>
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{t('companyJobsDashboard.desc7')}</p>
                        <p className="text-sm text-muted-foreground">{t('companyJobsDashboard.desc8')}</p>
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
                  <CardTitle>{t('text.companyjobsdashboard.jobspecificPipeline', 'Job-Specific Pipeline')}</CardTitle>
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
                <CardTitle>{t('text.companyjobsdashboard.rolespecificConfigurations', 'Role-Specific Configurations')}</CardTitle>
                <CardDescription>{t('text.companyjobsdashboard.customizeSettingsForIndividualJobRoles', 'Customize settings for individual job roles')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Selection */}
                <div className="space-y-2">
                  <Label>{t('text.companyjobsdashboard.selectJob', 'Select Job')}</Label>
                  <Select
                    value={selectedJobForSettings}
                    onValueChange={setSelectedJobForSettings}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('text.companyjobsdashboard.chooseAJobToConfigure', 'Choose a job to configure')} />
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
                      <Label className="text-base font-semibold">{t('text.companyjobsdashboard.evaluationWeights', 'Evaluation Weights')}</Label>
                      <p className="text-sm text-muted-foreground">{t('companyJobsDashboard.desc9')}</p>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>{t('text.companyjobsdashboard.technicalSkills', 'Technical Skills')}</Label>
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
                            <Label>{t('text.companyjobsdashboard.culturalFit', 'Cultural Fit')}</Label>
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
                            <Label>{t('text.companyjobsdashboard.communication', 'Communication')}</Label>
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
                      <Label className="text-base font-semibold">{t('text.companyjobsdashboard.customScreeningQuestions', 'Custom Screening Questions')}</Label>
                      <Textarea
                        placeholder={t('text.companyjobsdashboard.addCustomQuestionsForThisRole', 'Add custom questions for this role (one per line)')}
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
  );
};

export default CompanyJobsDashboard;
