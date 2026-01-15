import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Clock,
  Target
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PipelineInsight {
  roleId: string;
  roleName: string;
  candidatesInPipeline: number;
  predictedTimeToHire: string;
  bottleneck?: string;
}

interface PartnerAlert {
  type: "risk" | "opportunity" | "action";
  title: string;
  description: string;
  urgency: "low" | "medium" | "high";
}

export function PartnerAgentWidget() {
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ["partner-pipeline-insights"],
    queryFn: async (): Promise<PipelineInsight[]> => {
      // In production, this would come from predictive-intelligence-engine
      return [
        {
          roleId: "1",
          roleName: "Senior Engineer",
          candidatesInPipeline: 12,
          predictedTimeToHire: "2-3 weeks",
          bottleneck: "Technical interview scheduling",
        },
        {
          roleId: "2",
          roleName: "Product Manager",
          candidatesInPipeline: 8,
          predictedTimeToHire: "3-4 weeks",
        },
      ];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["partner-agent-alerts"],
    queryFn: async (): Promise<PartnerAlert[]> => {
      return [
        {
          type: "opportunity",
          title: "Strong candidate ready for offer",
          description: "Based on interview feedback, John D. is a 92% fit. Consider extending offer before competing interests.",
          urgency: "high",
        },
        {
          type: "risk",
          title: "Pipeline velocity slowing",
          description: "Interview-to-offer conversion dropped 15% this month. QUIN suggests streamlining the final round.",
          urgency: "medium",
        },
        {
          type: "action",
          title: "Feedback pending on 3 candidates",
          description: "Candidates are waiting on hiring manager feedback. SLA: 24 hours.",
          urgency: "medium",
        },
      ];
    },
  });

  const { data: healthScore } = useQuery({
    queryKey: ["partner-health-score"],
    queryFn: async () => {
      return {
        overall: 78,
        pipelineVelocity: 85,
        candidateQuality: 72,
        timeToHire: 80,
      };
    },
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "text-destructive border-destructive/50";
      case "medium": return "text-yellow-500 border-yellow-500/50";
      default: return "text-muted-foreground border-border";
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Partner Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Hiring Health Score</span>
            <Badge variant="secondary">{healthScore?.overall}%</Badge>
          </div>
          <Progress value={healthScore?.overall || 0} className="h-2" />
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
            <div>
              <span>Velocity</span>
              <p className="font-medium text-foreground">{healthScore?.pipelineVelocity}%</p>
            </div>
            <div>
              <span>Quality</span>
              <p className="font-medium text-foreground">{healthScore?.candidateQuality}%</p>
            </div>
            <div>
              <span>Speed</span>
              <p className="font-medium text-foreground">{healthScore?.timeToHire}%</p>
            </div>
          </div>
        </div>

        {/* Pipeline Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <Target className="h-4 w-4" />
            Active Roles
          </h4>
          {pipelineData?.map((pipeline) => (
            <div
              key={pipeline.roleId}
              className="p-2 rounded-lg border border-border/50 bg-background/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{pipeline.roleName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {pipeline.candidatesInPipeline} candidates
                    <Clock className="h-3 w-3 ml-1" />
                    {pipeline.predictedTimeToHire}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              {pipeline.bottleneck && (
                <Badge variant="outline" className="mt-2 text-xs text-yellow-500 border-yellow-500/50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {pipeline.bottleneck}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            QUIN Alerts
          </h4>
          {alerts?.slice(0, 2).map((alert, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg border ${getUrgencyColor(alert.urgency)} bg-background/50`}
            >
              <div className="flex items-start gap-2">
                {alert.type === "risk" && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                {alert.type === "opportunity" && <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />}
                {alert.type === "action" && <Clock className="h-4 w-4 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" variant="outline" size="sm">
          <Building2 className="h-4 w-4 mr-2" />
          View Full Pipeline
        </Button>
      </CardContent>
    </Card>
  );
}
