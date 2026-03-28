import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, TrendingUp } from "lucide-react";
import { StrategistCompanyTab } from "./StrategistCompanyTab";
import { StrategistCandidateTab } from "./StrategistCandidateTab";
import { StrategistWorkloadTab } from "./StrategistWorkloadTab";
import { useTranslation } from 'react-i18next';

interface StrategistManagementModalProps {
  trigger?: React.ReactNode;
  defaultTab?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StrategistManagementModal({ trigger, defaultTab = "companies", open: controlledOpen, onOpenChange }: StrategistManagementModalProps) {
  const { t } = useTranslation('admin');
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              {t('strategistManagementModal.manageStrategists')}
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            {t('strategistManagementModal.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t('strategistManagementModal.companies')}
            </TabsTrigger>
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="h-4 w-4" />
              {t('strategistManagementModal.candidates')}
            </TabsTrigger>
            <TabsTrigger value="workload" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="companies" className="m-0"><StrategistCompanyTab /></TabsContent>
            <TabsContent value="candidates" className="m-0"><StrategistCandidateTab /></TabsContent>
            <TabsContent value="workload" className="m-0"><StrategistWorkloadTab /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
