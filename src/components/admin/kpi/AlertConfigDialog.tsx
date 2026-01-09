import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

export interface AlertThreshold {
  kpiId: string;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
}

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: UnifiedKPI | null;
  currentThreshold?: AlertThreshold;
  onSave: (threshold: AlertThreshold) => void;
}

export function AlertConfigDialog({
  open,
  onOpenChange,
  kpi,
  currentThreshold,
  onSave,
}: AlertConfigDialogProps) {
  const [warningValue, setWarningValue] = useState('');
  const [criticalValue, setCriticalValue] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (kpi && currentThreshold) {
      setWarningValue(currentThreshold.warningThreshold.toString());
      setCriticalValue(currentThreshold.criticalThreshold.toString());
      setEnabled(currentThreshold.enabled);
    } else if (kpi) {
      // Set defaults based on KPI target
      const target = kpi.targetValue || kpi.value;
      if (kpi.lowerIsBetter) {
        setWarningValue((target * 1.1).toFixed(1));
        setCriticalValue((target * 1.25).toFixed(1));
      } else {
        setWarningValue((target * 0.9).toFixed(1));
        setCriticalValue((target * 0.75).toFixed(1));
      }
      setEnabled(true);
    }
  }, [kpi, currentThreshold]);

  const handleSave = () => {
    if (!kpi) return;
    
    onSave({
      kpiId: kpi.id,
      warningThreshold: parseFloat(warningValue) || 0,
      criticalThreshold: parseFloat(criticalValue) || 0,
      enabled,
    });
    onOpenChange(false);
  };

  if (!kpi) return null;

  const formatLabel = () => {
    switch (kpi?.format) {
      case 'percent':
        return '%';
      case 'currency':
        return '€';
      case 'hours':
        return 'hours';
      case 'days':
        return 'days';
      case 'minutes':
        return 'min';
      case 'ms':
        return 'ms';
      case 'number':
        return '';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            Configure Alert: {kpi.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alert Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive alerts when thresholds are crossed
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Current Value Display */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Value</span>
              <Badge variant="outline" className="font-mono">
                {(typeof kpi?.value === 'number' ? kpi.value : 0).toFixed(1)} {formatLabel()}
              </Badge>
            </div>
            {kpi?.targetValue != null && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Target</span>
                <Badge variant="outline" className="font-mono">
                  {(typeof kpi.targetValue === 'number' ? kpi.targetValue : 0).toFixed(1)} {formatLabel()}
                </Badge>
              </div>
            )}
          </div>

          {/* Threshold Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warning" className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Warning Threshold
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="warning"
                  type="number"
                  step="0.1"
                  value={warningValue}
                  onChange={(e) => setWarningValue(e.target.value)}
                  disabled={!enabled}
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground w-12">{formatLabel()}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.lowerIsBetter 
                  ? 'Alert when value exceeds this threshold'
                  : 'Alert when value drops below this threshold'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="critical" className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Critical Threshold
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="critical"
                  type="number"
                  step="0.1"
                  value={criticalValue}
                  onChange={(e) => setCriticalValue(e.target.value)}
                  disabled={!enabled}
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground w-12">{formatLabel()}</span>
              </div>
            </div>
          </div>

          {!enabled && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <BellOff className="h-4 w-4" />
              Alerts are disabled for this KPI
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Thresholds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
