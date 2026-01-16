import { useEffect, useState } from "react";
import { aiService } from '@/services/aiService';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Download, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface InterviewReport {
  id: string;
  executive_summary: string;
  key_strengths: string[];
  key_weaknesses: string[];
  technical_assessment: string;
  cultural_fit_assessment: string;
  communication_assessment: string;
  highlights: Array<{ timestamp: string; description: string; type: string }>;
  recommendation: string;
  recommendation_confidence: number;
  recommendation_reasoning: string;
  generated_at: string;
}

interface InterviewReportViewProps {
  meetingId: string;
  candidateId?: string;
  roleTitle?: string;
  companyName?: string;
}

export function InterviewReportView({
  meetingId,
  candidateId,
  roleTitle,
  companyName
}: InterviewReportViewProps) {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReport();
  }, [meetingId]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_reports')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading report:', error);
      } else if (data) {
        setReport(data as any);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!candidateId) {
      toast.error("Candidate information required");
      return;
    }

    setGenerating(true);
    try {
      const reportData = await aiService.generateInterviewReport({
        meetingId,
        candidateId,
        roleTitle,
        companyName
      });
      const report = reportData;

      if (!report) throw new Error("No report returned");

      setReport(report);
      toast.success("Interview report generated!");
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const getRecommendationIcon = (rec: string) => {
    if (rec === 'advance') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (rec === 'reject') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getRecommendationColor = (rec: string) => {
    if (rec === 'advance') return 'text-green-500';
    if (rec === 'reject') return 'text-red-500';
    return 'text-yellow-500';
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading interview report...</span>
        </div>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="p-8 bg-card/50 backdrop-blur-sm text-center">
        <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Post-Interview Report</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Generate a comprehensive AI-powered interview report with recommendations
        </p>
        <Button onClick={generateReport} disabled={generating} size="lg">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recommendation Banner */}
      <Card className={`p-6 border-2 ${report.recommendation === 'advance' ? 'bg-green-500/5 border-green-500/20' :
        report.recommendation === 'reject' ? 'bg-red-500/5 border-red-500/20' :
          'bg-yellow-500/5 border-yellow-500/20'
        }`}>
        <div className="flex items-start gap-4">
          {getRecommendationIcon(report.recommendation)}
          <div className="flex-1">
            <h3 className={`text-xl font-bold capitalize mb-2 ${getRecommendationColor(report.recommendation)}`}>
              Recommendation: {report.recommendation}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Confidence: {report.recommendation_confidence}%
            </p>
            <p className="text-sm leading-relaxed">{report.recommendation_reasoning}</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </Card>

      {/* Executive Summary */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Executive Summary
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {report.executive_summary}
        </p>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 bg-green-500/5 border-green-500/20">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-500">
            <TrendingUp className="w-5 h-5" />
            Key Strengths
          </h3>
          <ul className="space-y-2">
            {report.key_strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 bg-red-500/5 border-red-500/20">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-500">
            <TrendingDown className="w-5 h-5" />
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {report.key_weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Detailed Assessments */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Technical Assessment</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {report.technical_assessment}
          </p>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Cultural Fit</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {report.cultural_fit_assessment}
          </p>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Communication Style</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {report.communication_assessment}
          </p>
        </div>
      </Card>

      {/* Interview Highlights */}
      {report.highlights && report.highlights.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <h3 className="font-semibold text-lg mb-4">Notable Moments</h3>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {report.highlights.map((highlight, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="shrink-0">
                      {highlight.timestamp}
                    </Badge>
                    <Badge variant={
                      highlight.type === 'strength' ? 'default' :
                        highlight.type === 'weakness' ? 'destructive' :
                          'secondary'
                    }>
                      {highlight.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{highlight.description}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}