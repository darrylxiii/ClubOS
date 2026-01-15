import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  Download, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import type { UnifiedKPI, DomainHealth } from '@/hooks/useUnifiedKPIs';

interface BoardReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allKPIs: UnifiedKPI[];
  domainHealth: DomainHealth[];
  overallHealth: number;
}

type ReportPeriod = 'weekly' | 'monthly' | 'quarterly';

interface ReportSection {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export function BoardReportGenerator({
  open,
  onOpenChange,
  allKPIs,
  domainHealth,
  overallHealth
}: BoardReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'overview', label: 'Executive Overview', description: 'Overall health score and key metrics', checked: true },
    { id: 'vitals', label: 'Company Vitals', description: 'Top 5 strategic KPIs', checked: true },
    { id: 'domains', label: 'Domain Performance', description: 'Health by business domain', checked: true },
    { id: 'critical', label: 'Critical Items', description: 'Issues requiring immediate attention', checked: true },
    { id: 'trends', label: 'Trend Analysis', description: 'Week-over-week or month-over-month changes', checked: true },
    { id: 'recommendations', label: 'AI Recommendations', description: 'QUIN-generated insights and actions', checked: false },
  ]);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, checked: !s.checked } : s
    ));
  };

  const generateAISummary = useCallback(async () => {
    // Generate a basic summary based on the data
    const criticalCount = allKPIs.filter(k => k.status === 'critical').length;
    const warningCount = allKPIs.filter(k => k.status === 'warning').length;
    const onTargetCount = allKPIs.filter(k => k.status === 'success').length;
    
    const topPerformers = allKPIs
      .filter(k => k.status === 'success' && k.trendDirection === 'up')
      .slice(0, 3)
      .map(k => k.displayName);
    
    const needsAttention = allKPIs
      .filter(k => k.status === 'critical')
      .slice(0, 3)
      .map(k => k.displayName);

    const summary = `Platform health stands at ${overallHealth.toFixed(0)}% with ${onTargetCount} KPIs on target, ${warningCount} warnings, and ${criticalCount} critical items requiring attention.

${topPerformers.length > 0 ? `Top performers this period: ${topPerformers.join(', ')}.` : ''}

${needsAttention.length > 0 ? `Areas requiring immediate focus: ${needsAttention.join(', ')}.` : 'No critical issues to report.'}

Overall trajectory is ${overallHealth >= 75 ? 'positive' : overallHealth >= 50 ? 'stable with room for improvement' : 'concerning and requires strategic intervention'}.`;

    setExecutiveSummary(summary);
    toast.success('Summary generated');
  }, [allKPIs, overallHealth]);

  const generatePDF = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(30, 30, 30);
      doc.text('The Quantum Club', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text(`Board Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 20, yPos);
      yPos += 15;
      
      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      // Executive Overview
      if (sections.find(s => s.id === 'overview')?.checked) {
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text('Executive Overview', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const healthColor = overallHealth >= 80 ? [16, 185, 129] : overallHealth >= 60 ? [245, 158, 11] : [239, 68, 68];
        doc.setTextColor(healthColor[0], healthColor[1], healthColor[2]);
        doc.text(`Overall Health: ${overallHealth.toFixed(0)}%`, 20, yPos);
        yPos += 6;
        
        doc.setTextColor(60, 60, 60);
        const onTarget = allKPIs.filter(k => k.status === 'success').length;
        const warnings = allKPIs.filter(k => k.status === 'warning').length;
        const critical = allKPIs.filter(k => k.status === 'critical').length;
        
        doc.text(`KPIs On Target: ${onTarget} | Warnings: ${warnings} | Critical: ${critical}`, 20, yPos);
        yPos += 10;
        
        // Executive summary text
        if (executiveSummary) {
          const lines = doc.splitTextToSize(executiveSummary, pageWidth - 40);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        }
        
        yPos += 5;
      }

      // Domain Performance
      if (sections.find(s => s.id === 'domains')?.checked) {
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text('Domain Performance', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        domainHealth.forEach(domain => {
          const healthColor = domain.healthScore >= 80 ? [16, 185, 129] : domain.healthScore >= 60 ? [245, 158, 11] : [239, 68, 68];
          doc.setTextColor(60, 60, 60);
          doc.text(`${domain.label}: `, 20, yPos);
          doc.setTextColor(healthColor[0], healthColor[1], healthColor[2]);
          doc.text(`${domain.healthScore.toFixed(0)}%`, 70, yPos);
          doc.setTextColor(100, 100, 100);
          doc.text(`(${domain.onTarget}/${domain.totalKPIs} on target)`, 90, yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      // Critical Items
      if (sections.find(s => s.id === 'critical')?.checked) {
        const criticalKPIs = allKPIs.filter(k => k.status === 'critical').slice(0, 10);
        
        if (criticalKPIs.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(239, 68, 68);
          doc.text('Critical Items Requiring Attention', 20, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          criticalKPIs.forEach(kpi => {
            doc.setTextColor(60, 60, 60);
            doc.text(`• ${kpi.displayName} (${kpi.domain})`, 20, yPos);
            doc.setTextColor(239, 68, 68);
            const valueStr = kpi.format === 'percent' ? `${kpi.value?.toFixed(1)}%` : 
                           kpi.format === 'currency' ? `€${kpi.value?.toFixed(0)}` : 
                           kpi.value?.toFixed(1) || 'N/A';
            doc.text(valueStr, 120, yPos);
            yPos += 6;
          });
          yPos += 5;
        }
      }

      // Top Performers (Trends)
      if (sections.find(s => s.id === 'trends')?.checked) {
        const topPerformers = allKPIs
          .filter(k => k.status === 'success' && k.trendDirection === 'up')
          .slice(0, 5);
        
        if (topPerformers.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(16, 185, 129);
          doc.text('Top Performers', 20, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          topPerformers.forEach(kpi => {
            doc.setTextColor(60, 60, 60);
            doc.text(`• ${kpi.displayName}`, 20, yPos);
            doc.setTextColor(16, 185, 129);
            doc.text(`↑ ${kpi.trendPercentage?.toFixed(1) || 0}%`, 120, yPos);
            yPos += 6;
          });
        }
      }

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleString()} | The Quantum Club KPI Command Center`, 20, pageHeight - 10);
      doc.text('Confidential - For Internal Use Only', pageWidth - 70, pageHeight - 10);

      // Save
      doc.save(`TQC-Board-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Board report generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  }, [sections, executiveSummary, allKPIs, domainHealth, overallHealth, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Board Report
          </DialogTitle>
          <DialogDescription>
            Create a professional PDF report for board meetings and executive reviews
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Period */}
          <div className="space-y-2">
            <Label>Report Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Section Selection */}
          <div className="space-y-3">
            <Label>Report Sections</Label>
            {sections.map(section => (
              <div 
                key={section.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <Checkbox 
                  id={section.id}
                  checked={section.checked}
                  onCheckedChange={() => toggleSection(section.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={section.id} className="cursor-pointer font-medium">
                    {section.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Executive Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Executive Summary</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateAISummary}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Generate with QUIN
              </Button>
            </div>
            <Textarea
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="Enter or generate an executive summary for the report..."
              rows={4}
            />
          </div>

          {/* Preview Stats */}
          <Card className="border-border/50 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{overallHealth.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Health Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">
                    {allKPIs.filter(k => k.status === 'success').length}
                  </p>
                  <p className="text-xs text-muted-foreground">On Target</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">
                    {allKPIs.filter(k => k.status === 'warning').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-500">
                    {allKPIs.filter(k => k.status === 'critical').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
