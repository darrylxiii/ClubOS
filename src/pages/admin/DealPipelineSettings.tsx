import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageMappingManager } from "@/components/admin/pipeline-settings/StageMappingManager";
import { DealStageEditor } from "@/components/admin/pipeline-settings/DealStageEditor";
import { GitBranch, Layers } from "lucide-react";

export default function DealPipelineSettings() {
  return (
    <div className="space-y-6">
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
  );
}
