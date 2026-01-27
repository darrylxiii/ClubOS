import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, BarChart3 } from "lucide-react";
import { StrategistCompanyTab } from "./StrategistCompanyTab";
import { StrategistCandidateTab } from "./StrategistCandidateTab";
import { StrategistWorkloadTab } from "./StrategistWorkloadTab";

interface StrategistManagementModalProps {
  trigger?: React.ReactNode;
}

export function StrategistManagementModal({ trigger }: StrategistManagementModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Manage Strategists
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            Strategist Assignment Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="companies" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="h-4 w-4" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="workload" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Workload
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="companies" className="m-0">
              <StrategistCompanyTab />
            </TabsContent>

            <TabsContent value="candidates" className="m-0">
              <StrategistCandidateTab />
            </TabsContent>

            <TabsContent value="workload" className="m-0">
              <StrategistWorkloadTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
