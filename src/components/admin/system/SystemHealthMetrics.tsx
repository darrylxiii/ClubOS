import {
  AnimatedCard,
  CardBody,
  CardVisual,
  CardTitle,
  CardDescription
} from "@/components/ui/animated-card";
import { Visual3 } from "@/components/ui/visual-3";
import { Activity, Database, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemHealthMetricsProps {
  health: {
    platform_status: string;
    active_users_1h: number;
    total_errors_1h: number;
    critical_errors_1h: number;
    avg_response_time_ms: number;
    db_connections: number;
  } | null;
}

export const SystemHealthMetrics = ({ health }: SystemHealthMetricsProps) => {
  if (!health) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="#3b82f6" secondaryColor="#60a5fa" />
        </CardVisual>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">{health.active_users_1h}</CardTitle>
              <CardDescription>Active Users (1h)</CardDescription>
            </div>
          </div>
        </CardBody>
      </AnimatedCard>

      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="#10b981" secondaryColor="#34d399" />
        </CardVisual>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">{health.avg_response_time_ms}ms</CardTitle>
              <CardDescription>Avg Response Time</CardDescription>
            </div>
          </div>
        </CardBody>
      </AnimatedCard>

      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="#8b5cf6" secondaryColor="#a78bfa" />
        </CardVisual>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">{health.db_connections}</CardTitle>
              <CardDescription>DB Connections</CardDescription>
            </div>
          </div>
        </CardBody>
      </AnimatedCard>

      <AnimatedCard>
        <CardVisual>
          <Visual3
            mainColor={health.total_errors_1h > 0 ? "#ef4444" : "#10b981"}
            secondaryColor={health.critical_errors_1h > 0 ? "#b91c1c" : "#34d399"}
          />
        </CardVisual>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-lg",
              health.total_errors_1h > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
            )}>
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className={cn(
                "text-3xl font-bold",
                health.critical_errors_1h > 0 && "text-destructive"
              )}>
                {health.total_errors_1h}
              </CardTitle>
              <CardDescription>
                {health.critical_errors_1h > 0 ? `${health.critical_errors_1h} Critical Errors` : "System Errors (1h)"}
              </CardDescription>
            </div>
          </div>
        </CardBody>
      </AnimatedCard>
    </div>
  );
};
