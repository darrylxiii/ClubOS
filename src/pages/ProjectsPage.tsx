import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Plus, Rocket, TrendingUp } from "lucide-react";
import { ProjectList } from "@/components/projects/ProjectList";
import { FreelancerDashboard } from "@/components/projects/FreelancerDashboard";
import { ClientDashboard } from "@/components/projects/ClientDashboard";
import { useNavigate } from "react-router-dom";

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("browse");

  // Check if user is open to freelance work
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("open_to_freelance_work, freelance_availability_status, freelance_categories")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isFreelancer = profile?.open_to_freelance_work === true;
  const isAvailable = profile?.freelance_availability_status === 'available';
  const isPartnerOrAdmin = false; // Will be determined from user metadata

  if (loadingProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Club Projects
              </h1>
              <p className="text-muted-foreground text-lg">
                Premium freelance marketplace powered by Club AI
              </p>
            </div>

            <div className="flex gap-3">
              {!isFreelancer && (
                <Button 
                  onClick={() => navigate("/settings?tab=freelance")}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  Enable Freelance Mode
                </Button>
              )}
              
              {isPartnerOrAdmin && (
                <Button 
                  onClick={() => navigate("/projects/new")}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Post Project
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">247</p>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Match Score</p>
                  <p className="text-2xl font-bold">87%</p>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Rocket className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time to Hire</p>
                  <p className="text-2xl font-bold">&lt;24h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="browse">Browse Projects</TabsTrigger>
            {isFreelancer && <TabsTrigger value="dashboard">My Dashboard</TabsTrigger>}
            {isPartnerOrAdmin && <TabsTrigger value="client">Client View</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <ProjectList userRole="user" isFreelancer={isFreelancer} />
          </TabsContent>

          {isFreelancer && (
            <TabsContent value="dashboard" className="space-y-6">
              <FreelancerDashboard userId={user?.id} />
            </TabsContent>
          )}

          {isPartnerOrAdmin && (
            <TabsContent value="client" className="space-y-6">
              <ClientDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
