import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandablePipelineStage, PipelineStageData } from "@/components/ExpandablePipelineStage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Building2, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Application {
  id: string;
  job_id: string;
  company_name: string;
  position: string;
  current_stage_index: number;
  stages: PipelineStageData[];
  status: string;
  applied_at: string;
}

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("applied_at", { ascending: false });

      if (error) throw error;

      setApplications((data || []).map(app => ({
        ...app,
        stages: (app.stages as unknown as PipelineStageData[]) || []
      })));
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const activeApplications = applications.filter(app => app.status === "active");
  const archivedApplications = applications.filter(app => app.status !== "active");

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-subtle px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              My Applications
            </h1>
            <p className="text-muted-foreground">
              Track your application progress and prepare for each stage
            </p>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active">Active ({activeApplications.length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({archivedApplications.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6 mt-6">
              {activeApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No active applications yet. Start applying to jobs to see them here!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))
              )}
            </TabsContent>

            <TabsContent value="archived" className="space-y-6 mt-6">
              {archivedApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No archived applications</p>
                  </CardContent>
                </Card>
              ) : (
                archivedApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  return (
    <Card className="border-accent/20 bg-gradient-card shadow-glow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              {application.company_name}
            </CardTitle>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {application.position}
              </div>
              <div className="text-xs">
                Applied {new Date(application.applied_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pipeline Stages */}
        <div>
          <h3 className="text-lg font-bold mb-4">Application Pipeline</h3>
          <div className="flex items-start w-full overflow-x-auto pb-4">
            {application.stages.map((stage: PipelineStageData, index: number) => (
              <ExpandablePipelineStage
                key={stage.id}
                stage={{
                  ...stage,
                  status:
                    index < application.current_stage_index
                      ? "completed"
                      : index === application.current_stage_index
                      ? "current"
                      : "upcoming",
                }}
                isLast={index === application.stages.length - 1}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
