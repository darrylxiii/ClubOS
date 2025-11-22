import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EdgeFunctionHealth {
  function_name: string;
  total_calls: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_duration_ms: number;
}

interface FunctionHealthTableProps {
  functions: EdgeFunctionHealth[] | null;
}

export const FunctionHealthTable = ({ functions }: FunctionHealthTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edge Functions Health</CardTitle>
        <CardDescription>Performance metrics for backend functions</CardDescription>
      </CardHeader>
      <CardContent>
        {!functions || functions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No function data available</p>
        ) : (
          <div className="space-y-4">
            {functions.map((func) => (
              <div key={func.function_name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{func.function_name.replace('function:', '')}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{func.total_calls} calls</span>
                    <span>{func.avg_duration_ms}ms avg</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {func.success_rate >= 95 ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : func.success_rate >= 80 ? (
                    <AlertCircle className="w-5 h-5 text-warning" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="font-semibold">{func.success_rate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
