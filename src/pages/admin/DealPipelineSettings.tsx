import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageMappingManager } from "@/components/admin/pipeline-settings/StageMappingManager";
import { DealStageEditor } from "@/components/admin/pipeline-settings/DealStageEditor";
import { Settings, GitBranch, Layers, Loader2 } from "lucide-react";

export default function DealPipelineSettings() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              Deal Pipeline Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure how job pipeline stages map to deal stages for revenue tracking
            </p>
          </div>

          <Tabs defaultValue="mappings" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="mappings" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Stage Mappings
              </TabsTrigger>
              <TabsTrigger value="stages" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Deal Stages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mappings">
              <StageMappingManager />
            </TabsContent>

            <TabsContent value="stages">
              <DealStageEditor />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
