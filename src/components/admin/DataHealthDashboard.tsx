import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  FileWarning,
  Users,
  Briefcase,
  Building2,
  TrendingUp,
  Zap,
  Shield,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TableHealth {
  table: string;
  displayName: string;
  icon: React.ReactNode;
  totalRecords: number;
  completenessScore: number;
  missingFields: { field: string; count: number; percentage: number }[];
  mockDataCount: number;
  lastUpdated: string;
}

interface DataHealthSummary {
  overallScore: number;
  totalRecords: number;
  tablesAnalyzed: number;
  criticalIssues: number;
  warnings: number;
  mockDataDetected: number;
}

export function DataHealthDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['data-health-dashboard'],
    queryFn: async () => {
      // Analyze key tables for data health
      const tableConfigs = [
        { table: 'profiles', displayName: 'User Profiles', icon: <Users className="w-4 h-4" />, requiredFields: ['full_name', 'email', 'avatar_url'] },
        { table: 'candidate_profiles', displayName: 'Candidates', icon: <Users className="w-4 h-4" />, requiredFields: ['current_title', 'location', 'years_experience'] },
        { table: 'jobs', displayName: 'Jobs', icon: <Briefcase className="w-4 h-4" />, requiredFields: ['title', 'description', 'location', 'salary_min', 'salary_max'] },
        { table: 'companies', displayName: 'Companies', icon: <Building2 className="w-4 h-4" />, requiredFields: ['name', 'description', 'industry', 'logo_url'] },
        { table: 'applications', displayName: 'Applications', icon: <FileWarning className="w-4 h-4" />, requiredFields: ['candidate_id', 'job_id', 'status'] },
      ];

      const tableHealthResults: TableHealth[] = [];
      let totalRecords = 0;
      let mockDataTotal = 0;

      for (const config of tableConfigs) {
        try {
          // Get total count
          const { count } = await supabase
            .from(config.table as any)
            .select('*', { count: 'exact', head: true });
          
          const recordCount = count || 0;
          totalRecords += recordCount;

          // Sample records to analyze completeness
          const { data: sampleData } = await supabase
            .from(config.table as any)
            .select('*')
            .limit(100);

          const missingFields: { field: string; count: number; percentage: number }[] = [];
          let mockCount = 0;

          if (sampleData && sampleData.length > 0) {
            // Check required fields
            for (const field of config.requiredFields) {
              const missingCount = sampleData.filter((row: any) => 
                !row[field] || row[field] === '' || row[field] === null
              ).length;
              
              if (missingCount > 0) {
                missingFields.push({
                  field,
                  count: missingCount,
                  percentage: Math.round((missingCount / sampleData.length) * 100)
                });
              }
            }

            // Detect mock/test data patterns
            mockCount = sampleData.filter((row: any) => {
              const jsonStr = JSON.stringify(row).toLowerCase();
              return jsonStr.includes('test') || 
                     jsonStr.includes('demo') || 
                     jsonStr.includes('sample') ||
                     jsonStr.includes('example') ||
                     jsonStr.includes('lorem') ||
                     jsonStr.includes('placeholder');
            }).length;
            
            mockDataTotal += mockCount;
          }

          // Calculate completeness score
          const completenessScore = missingFields.length > 0 
            ? Math.round(100 - (missingFields.reduce((sum, f) => sum + f.percentage, 0) / config.requiredFields.length))
            : 100;

          tableHealthResults.push({
            table: config.table,
            displayName: config.displayName,
            icon: config.icon,
            totalRecords: recordCount,
            completenessScore,
            missingFields,
            mockDataCount: mockCount,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error analyzing ${config.table}:`, error);
        }
      }

      // Calculate summary
      const overallScore = tableHealthResults.length > 0
        ? Math.round(tableHealthResults.reduce((sum, t) => sum + t.completenessScore, 0) / tableHealthResults.length)
        : 0;

      const criticalIssues = tableHealthResults.filter(t => t.completenessScore < 50).length;
      const warnings = tableHealthResults.filter(t => t.completenessScore >= 50 && t.completenessScore < 80).length;

      const summary: DataHealthSummary = {
        overallScore,
        totalRecords,
        tablesAnalyzed: tableHealthResults.length,
        criticalIssues,
        warnings,
        mockDataDetected: mockDataTotal,
      };

      return { tables: tableHealthResults, summary };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Healthy</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Needs Attention</Badge>;
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { tables, summary } = healthData || { tables: [], summary: null };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Data Health Dashboard
          </h2>
          <p className="text-muted-foreground">Monitor data quality and completeness across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Overall Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className={cn("text-4xl font-bold", getScoreColor(summary?.overallScore || 0))}>
                {summary?.overallScore || 0}%
              </span>
              {getScoreBadge(summary?.overallScore || 0)}
            </div>
            <Progress value={summary?.overallScore || 0} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.totalRecords?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary?.tablesAnalyzed || 0} tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Issues Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-2xl font-bold text-red-500">{summary?.criticalIssues || 0}</span>
                <span className="text-xs text-muted-foreground ml-1">critical</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-yellow-500">{summary?.warnings || 0}</span>
                <span className="text-xs text-muted-foreground ml-1">warnings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Mock Data Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{summary?.mockDataDetected || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Test/sample records found
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Table Health Analysis</CardTitle>
          <CardDescription>Detailed completeness and quality metrics per table</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Field Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {tables.map((table) => (
                    <div 
                      key={table.table}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          {table.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{table.displayName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {table.totalRecords.toLocaleString()} records
                            {table.mockDataCount > 0 && (
                              <span className="text-orange-500 ml-2">
                                • {table.mockDataCount} mock
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={cn("text-lg font-bold", getScoreColor(table.completenessScore))}>
                            {table.completenessScore}%
                          </span>
                          <p className="text-xs text-muted-foreground">completeness</p>
                        </div>
                        {table.completenessScore >= 80 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : table.completenessScore >= 50 ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {tables.map((table) => (
                    <div key={table.table}>
                      <div className="flex items-center gap-2 mb-3">
                        {table.icon}
                        <h4 className="font-medium">{table.displayName}</h4>
                        {getScoreBadge(table.completenessScore)}
                      </div>
                      
                      {table.missingFields.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {table.missingFields.map((field) => (
                            <div 
                              key={field.field}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                            >
                              <span className="font-mono text-muted-foreground">{field.field}</span>
                              <Badge variant="outline" className="text-xs">
                                {field.percentage}% missing
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          All required fields populated
                        </p>
                      )}
                      
                      <Separator className="mt-4" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Data Security</p>
            <p className="text-xs text-muted-foreground">
              This dashboard analyzes data patterns without exposing PII. 
              Mock data detection helps identify test records that should be cleaned before production.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
