import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface PipelineStage {
  order: number;
  name: string;
  [key: string]: unknown;
}

interface BulkStageMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  selectedCount: number;
  onConfirm: (toStage: number) => Promise<void>;
  isProcessing?: boolean;
}

export function BulkStageMoveDialog({
  open,
  onOpenChange,
  stages,
  selectedCount,
  onConfirm,
  isProcessing = false,
}: BulkStageMoveDialogProps) {
  const { t } = useTranslation('jobDashboard');
  const [selectedStage, setSelectedStage] = useState<string>("");

  const handleConfirm = async () => {
    if (!selectedStage) return;
    await onConfirm(Number(selectedStage));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setSelectedStage("");
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {t('bulk.moveTitle', 'Move Candidates')}
          </DialogTitle>
          <DialogDescription>
            {t('bulk.moveDesc', 'Select a stage to move {{count}} candidate(s) to.', { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">
            {t('bulk.targetStage', 'Target stage')}
          </Label>
          <RadioGroup
            value={selectedStage}
            onValueChange={setSelectedStage}
            className="space-y-2"
          >
            {stages.map((stage) => (
              <label
                key={stage.order}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border border-border/30 cursor-pointer transition-colors",
                  "hover:bg-card/60 hover:border-border/60",
                  selectedStage === String(stage.order) && "bg-primary/5 border-primary/30",
                )}
              >
                <RadioGroupItem value={String(stage.order)} />
                <span className="text-sm font-medium">{stage.name}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            {t('actions.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedStage || isProcessing}
          >
            {isProcessing
              ? t('actions.processing', 'Processing...')
              : t('bulk.moveConfirm', 'Move {{count}} candidate(s)', { count: selectedCount })
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
