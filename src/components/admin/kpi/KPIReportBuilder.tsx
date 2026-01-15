import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  FileText, 
  Calendar,
  Mail,
  MessageSquare,
  Save,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedKPI, KPIDomain } from '@/hooks/useUnifiedKPIs';

interface KPIReportBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allKPIs: UnifiedKPI[];
}

type ReportFormat = 'pdf' | 'csv' | 'html';
type DeliveryChannel = 'email' | 'slack';
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

interface ReportConfig {
  name: string;
  description: string;
  selectedKPIs: string[];
  format: ReportFormat;
  deliveryChannel: DeliveryChannel;
  recipients: string[];
  schedule: {
    frequency: ScheduleFrequency;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:MM format
  };
  includeCharts: boolean;
  includeAIInsights: boolean;
}

const DOMAIN_LABELS: Record<KPIDomain, string> = {
  operations: 'Operations',
  website: 'Website',
  sales: 'Sales',
  platform: 'Platform',
  intelligence: 'Intelligence',
  growth: 'Growth',
  costs: 'Costs'
};

export function KPIReportBuilder({
  open,
  onOpenChange,
  allKPIs
}: KPIReportBuilderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  
  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    selectedKPIs: [],
    format: 'pdf',
    deliveryChannel: 'email',
    recipients: [],
    schedule: {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      time: '09:00'
    },
    includeCharts: true,
    includeAIInsights: true
  });

  // Group KPIs by domain
  const kpisByDomain = useMemo(() => {
    const grouped: Record<KPIDomain, UnifiedKPI[]> = {
      operations: [],
      website: [],
      sales: [],
      platform: [],
      intelligence: [],
      growth: [],
      costs: []
    };
    
    allKPIs.forEach(kpi => {
      if (grouped[kpi.domain]) {
        grouped[kpi.domain].push(kpi);
      }
    });
    
    return grouped;
  }, [allKPIs]);

  const toggleKPI = (kpiId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedKPIs: prev.selectedKPIs.includes(kpiId)
        ? prev.selectedKPIs.filter(id => id !== kpiId)
        : [...prev.selectedKPIs, kpiId]
    }));
  };

  const selectAllInDomain = (domain: KPIDomain) => {
    const domainKPIIds = kpisByDomain[domain].map(k => k.id);
    const allSelected = domainKPIIds.every(id => config.selectedKPIs.includes(id));
    
    setConfig(prev => ({
      ...prev,
      selectedKPIs: allSelected
        ? prev.selectedKPIs.filter(id => !domainKPIIds.includes(id))
        : [...new Set([...prev.selectedKPIs, ...domainKPIIds])]
    }));
  };

  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      setConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const handleSave = async () => {
    if (!config.name) {
      toast.error('Please enter a report name');
      return;
    }
    if (config.selectedKPIs.length === 0) {
      toast.error('Please select at least one KPI');
      return;
    }
    if (config.recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save to kpi_report_templates
      const { error: templateError } = await supabase
        .from('kpi_report_templates')
        .insert({
          name: config.name,
          description: config.description,
          template_config: {
            selectedKPIs: config.selectedKPIs,
            format: config.format,
            includeCharts: config.includeCharts,
            includeAIInsights: config.includeAIInsights
          },
          created_by: user.id
        });

      if (templateError) throw templateError;

      toast.success('Report template saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save report:', error);
      toast.error('Failed to save report configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Build Automated Report
          </DialogTitle>
          <DialogDescription>
            Create a custom KPI report with scheduled delivery
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Weekly Executive Summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Key metrics for leadership review"
                  />
                </div>
              </div>

              <Separator />

              {/* KPI Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select KPIs</Label>
                  <Badge variant="outline">{config.selectedKPIs.length} selected</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(kpisByDomain) as KPIDomain[]).map(domain => {
                    const domainKPIs = kpisByDomain[domain];
                    if (domainKPIs.length === 0) return null;
                    
                    const allSelected = domainKPIs.every(k => config.selectedKPIs.includes(k.id));
                    const someSelected = domainKPIs.some(k => config.selectedKPIs.includes(k.id));
                    
                    return (
                      <Card key={domain} className="border-border/50">
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">{DOMAIN_LABELS[domain]}</CardTitle>
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => selectAllInDomain(domain)}
                              className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="py-2 px-4 max-h-40 overflow-y-auto">
                          {domainKPIs.slice(0, 8).map(kpi => (
                            <div key={kpi.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={kpi.id}
                                checked={config.selectedKPIs.includes(kpi.id)}
                                onCheckedChange={() => toggleKPI(kpi.id)}
                              />
                              <Label htmlFor={kpi.id} className="text-xs cursor-pointer truncate">
                                {kpi.displayName}
                              </Label>
                            </div>
                          ))}
                          {domainKPIs.length > 8 && (
                            <p className="text-xs text-muted-foreground pt-1">
                              +{domainKPIs.length - 8} more
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Format & Delivery */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Format</Label>
                  <Select 
                    value={config.format} 
                    onValueChange={(v) => setConfig(prev => ({ ...prev, format: v as ReportFormat }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                      <SelectItem value="html">HTML Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Delivery Channel</Label>
                  <Select 
                    value={config.deliveryChannel} 
                    onValueChange={(v) => setConfig(prev => ({ ...prev, deliveryChannel: v as DeliveryChannel }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                      <SelectItem value="slack">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Slack
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder={config.deliveryChannel === 'email' ? 'email@example.com' : '#channel-name'}
                    onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <Button variant="outline" onClick={addRecipient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {config.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.recipients.map(recipient => (
                      <Badge key={recipient} variant="secondary" className="gap-1">
                        {recipient}
                        <button onClick={() => removeRecipient(recipient)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Frequency</Label>
                    <Select 
                      value={config.schedule.frequency} 
                      onValueChange={(v) => setConfig(prev => ({ 
                        ...prev, 
                        schedule: { ...prev.schedule, frequency: v as ScheduleFrequency } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {config.schedule.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Day of Week</Label>
                      <Select 
                        value={config.schedule.dayOfWeek?.toString()} 
                        onValueChange={(v) => setConfig(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, dayOfWeek: parseInt(v) } 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {config.schedule.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Day of Month</Label>
                      <Select 
                        value={config.schedule.dayOfMonth?.toString()} 
                        onValueChange={(v) => setConfig(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, dayOfMonth: parseInt(v) } 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 5, 10, 15, 20, 25].map(day => (
                            <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Time (CET)</Label>
                    <Select 
                      value={config.schedule.time} 
                      onValueChange={(v) => setConfig(prev => ({ 
                        ...prev, 
                        schedule: { ...prev.schedule, time: v } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="07:00">07:00</SelectItem>
                        <SelectItem value="08:00">08:00</SelectItem>
                        <SelectItem value="09:00">09:00</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="17:00">17:00</SelectItem>
                        <SelectItem value="18:00">18:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <Label>Options</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeCharts"
                      checked={config.includeCharts}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: !!checked }))}
                    />
                    <Label htmlFor="includeCharts" className="cursor-pointer">
                      Include trend charts and visualizations
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeAI"
                      checked={config.includeAIInsights}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeAIInsights: !!checked }))}
                    />
                    <Label htmlFor="includeAI" className="cursor-pointer">
                      Include QUIN AI insights and recommendations
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Schedule Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
