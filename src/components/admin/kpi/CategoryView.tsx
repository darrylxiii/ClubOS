import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Bell } from 'lucide-react';
import { UnifiedKPICard } from './UnifiedKPICard';
import type { UnifiedKPI, KPIDomain } from '@/hooks/useUnifiedKPIs';

interface CategoryViewProps {
  domain: KPIDomain;
  category: string;
  categoryDisplayName: string;
  kpis: UnifiedKPI[];
  onBack: () => void;
}

const categoryDescriptions: Record<string, string> = {
  // Operations
  workforce: 'Track team productivity, hours worked, and task completion rates',
  pipeline: 'Monitor deal flow, win rates, and pipeline health metrics',
  recruitment: 'Measure hiring efficiency, time-to-hire, and candidate flow',
  experience: 'NPS scores, CSAT ratings, and satisfaction metrics',
  utilisation: 'Capacity planning and resource allocation efficiency',
  financial: 'Revenue metrics, costs, and financial performance',
  // Website
  north_star: 'Core acquisition metrics driving business growth',
  funnel: 'Session data, engagement rates, and Core Web Vitals',
  attribution: 'Channel performance and conversion attribution',
  ai_insights: 'AI-powered content analysis and optimization',
  retention: 'Visitor return rates and re-engagement metrics',
  google_signals: 'Google-specific performance and SEO metrics',
  // Sales
  conversational: 'Conversation quality, qualification, and response metrics',
  meetings: 'Discovery calls, show rates, and meeting effectiveness',
  proposals: 'Proposal volume, close rates, and deal values',
  closing: 'Win rates, revenue, and sales cycle metrics',
  ai_efficiency: 'AI-assisted outreach and automation metrics',
  quality: 'Lead sentiment, intent scores, and satisfaction',
  forecasting: 'Pipeline predictions and forecast accuracy',
};

const categoryActions: Record<string, { label: string; tip: string }[]> = {
  north_star: [
    { label: 'CPL > €175', tip: 'Optimize campaigns per audience or keyword' },
    { label: 'CPSQL high', tip: 'Disable low SQL-output campaigns immediately' },
    { label: 'Landing CR < 3%', tip: 'A/B test pages with >70% bounce rate' },
  ],
  meetings: [
    { label: 'Show Rate < 70%', tip: 'Implement reminder sequence 24h before call' },
    { label: 'Low Duration', tip: 'Review call structure and agenda' },
    { label: 'No Shows > 20%', tip: 'Add calendar blocking and SMS reminders' },
  ],
  closing: [
    { label: 'Win Rate < 30%', tip: 'Review qualification criteria and proposal quality' },
    { label: 'Cycle > 45 days', tip: 'Identify and remove pipeline bottlenecks' },
    { label: 'High Churn', tip: 'Analyze loss reasons and address patterns' },
  ],
};

export function CategoryView({
  domain,
  category,
  categoryDisplayName,
  kpis,
  onBack,
}: CategoryViewProps) {
  const description = categoryDescriptions[category] || 'Category metrics and performance indicators';
  const actions = categoryActions[category];

  // Sort KPIs: critical first, then warning, then success, then neutral
  const sortedKPIs = [...kpis].sort((a, b) => {
    const order = { critical: 0, warning: 1, success: 2, neutral: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground capitalize">{domain}</span>
              <span className="text-muted-foreground">/</span>
              <h2 className="text-xl font-bold">{categoryDisplayName}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Set Alerts
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      {sortedKPIs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedKPIs.map(kpi => (
            <UnifiedKPICard key={kpi.id || kpi.name} kpi={kpi} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No KPIs calculated yet for this category
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Run the calculation to generate metrics
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actionable Insights */}
      {actions && actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optimization Actions</CardTitle>
            <CardDescription>Recommended actions based on threshold breaches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {actions.map((action, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
