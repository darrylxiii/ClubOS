/**
 * Scheduling AI Intelligence Tab
 * 
 * Combined view for AI-powered scheduling features:
 * - Focus Time Settings (Phase 3)
 * - No-Show Prediction Panel (Phase 1)
 * - Conflict Resolution trigger
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FocusTimeSettings } from './FocusTimeSettings';
import { NoShowPredictionPanel } from '@/components/booking/NoShowPredictionPanel';
import { ConflictAlertBanner } from './ConflictAlertBanner';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { useNoShowPredictions } from '@/hooks/useNoShowPrediction';
import { 
  Brain, 
  Shield, 
  AlertTriangle, 
  Zap,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface SchedulingAITabProps {
  bookingIds?: string[];
  className?: string;
}

export function SchedulingAITab({ bookingIds = [], className }: SchedulingAITabProps) {
  const [activeTab, setActiveTab] = useState('focus');
  const { conflicts, fetchConflicts, isResolving } = useConflictResolution();
  const { data: predictions = {}, refetch: refetchPredictions, isLoading: loadingPredictions } = useNoShowPredictions(bookingIds);

  const conflictCount = conflicts.length;
  const highRiskCount = Object.values(predictions).filter(
    p => p.risk_level === 'high' || p.risk_level === 'critical'
  ).length;

  return (
    <div className={className}>
      {/* Conflict Alert Banner - Always visible when conflicts exist */}
      {conflictCount > 0 && (
        <div className="mb-6">
          <ConflictAlertBanner />
        </div>
      )}

      {/* AI Features Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('focus')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Focus Defender</p>
                <p className="text-xl font-bold">Active</p>
              </div>
              <Shield className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('noshow')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Risk Bookings</p>
                <p className="text-xl font-bold text-destructive">{highRiskCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fetchConflicts()}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conflicts</p>
                <p className="text-xl font-bold">{conflictCount}</p>
              </div>
              <Zap className={`h-8 w-8 ${conflictCount > 0 ? 'text-orange-500/50' : 'text-green-500/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="focus" className="gap-2">
            <Shield className="h-4 w-4" />
            Focus Time
          </TabsTrigger>
          <TabsTrigger value="noshow" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            No-Show Predictions
            {highRiskCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs">
                {highRiskCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="focus">
          <FocusTimeSettings />
        </TabsContent>

        <TabsContent value="noshow">
          <NoShowPredictionPanel
            predictions={predictions}
            onRefresh={() => refetchPredictions()}
            isRefreshing={loadingPredictions}
          />
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                QUIN AI Insights
              </CardTitle>
              <CardDescription>
                AI-powered recommendations for your scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Optimize your meeting schedule</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on your patterns, consider blocking 9-11am for deep work. 
                      You're most productive during morning hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-accent">
                    <TrendingUp className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Meeting efficiency improving</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your average meeting duration decreased by 15% this week. 
                      Keep using the agenda feature to maintain this trend.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">High meeting load detected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have 8 meetings scheduled tomorrow. Consider delegating 
                      or rescheduling to maintain productivity.
                    </p>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Generate New Insights
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
