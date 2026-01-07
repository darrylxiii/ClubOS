import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, User, Briefcase, FileText, Timer } from "lucide-react";
import {
  FreelancerSetupContent,
  GigMarketplaceContent,
  MyProposalsContent,
  TimeTrackingContent,
} from "@/components/projects/ProjectsHubContent";

export default function ProjectsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["candidate", "partner", "admin"]}>
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="h-8 w-8" />
              Projects Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your freelance projects, proposals, and time tracking
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <Layers className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="setup" className="gap-2">
                <User className="h-4 w-4" />
                Freelancer Setup
              </TabsTrigger>
              <TabsTrigger value="gigs" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Gig Marketplace
              </TabsTrigger>
              <TabsTrigger value="proposals" className="gap-2">
                <FileText className="h-4 w-4" />
                My Proposals
              </TabsTrigger>
              <TabsTrigger value="time" className="gap-2">
                <Timer className="h-4 w-4" />
                Time Tracking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 border rounded-lg">
                  <h3 className="font-semibold">Active Projects</h3>
                  <p className="text-3xl font-bold mt-2">0</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="font-semibold">Pending Proposals</h3>
                  <p className="text-3xl font-bold mt-2">0</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="font-semibold">Hours This Week</h3>
                  <p className="text-3xl font-bold mt-2">0</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="font-semibold">Earnings</h3>
                  <p className="text-3xl font-bold mt-2">€0</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="setup">
              <FreelancerSetupContent />
            </TabsContent>

            <TabsContent value="gigs">
              <GigMarketplaceContent />
            </TabsContent>

            <TabsContent value="proposals">
              <MyProposalsContent />
            </TabsContent>

            <TabsContent value="time">
              <TimeTrackingContent />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
