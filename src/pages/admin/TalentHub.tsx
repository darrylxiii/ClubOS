import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Sparkles, FolderOpen, FileText, Target, Link2, TrendingUp, Archive } from "lucide-react";
import {
  TalentPoolContent,
  AllCandidatesContent,
  AllApplicationsContent,
  TalentListsContent,
  TargetCompaniesContent,
  MergeDashboardContent,
  RejectionsContent,
  ArchivedCandidatesContent,
} from "@/components/admin/talent/TalentHubContent";

export default function TalentHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pool";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin", "strategist"]}>
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Talent Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Unified talent management - candidates, applications, and matching
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="pool" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Talent Pool
              </TabsTrigger>
              <TabsTrigger value="lists" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Lists
              </TabsTrigger>
              <TabsTrigger value="candidates" className="gap-2">
                <Users className="h-4 w-4" />
                Candidates
              </TabsTrigger>
              <TabsTrigger value="applications" className="gap-2">
                <FileText className="h-4 w-4" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="targets" className="gap-2">
                <Target className="h-4 w-4" />
                Target Companies
              </TabsTrigger>
              <TabsTrigger value="merge" className="gap-2">
                <Link2 className="h-4 w-4" />
                Merge
              </TabsTrigger>
              <TabsTrigger value="rejections" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Rejections
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-2">
                <Archive className="h-4 w-4" />
                Archived
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pool">
              <TalentPoolContent />
            </TabsContent>

            <TabsContent value="lists">
              <TalentListsContent />
            </TabsContent>

            <TabsContent value="candidates">
              <AllCandidatesContent />
            </TabsContent>

            <TabsContent value="applications">
              <AllApplicationsContent />
            </TabsContent>

            <TabsContent value="targets">
              <TargetCompaniesContent />
            </TabsContent>

            <TabsContent value="merge">
              <MergeDashboardContent />
            </TabsContent>

            <TabsContent value="rejections">
              <RejectionsContent />
            </TabsContent>

            <TabsContent value="archived">
              <ArchivedCandidatesContent />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
