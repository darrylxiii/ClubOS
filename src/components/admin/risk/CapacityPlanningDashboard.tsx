import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, Database, Users, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

const capacityMetrics = [
  {
    name: 'Database Connections',
    current: 450,
    max: 1000,
    unit: 'connections',
    trend: '+12%',
    status: 'healthy',
    icon: Database,
  },
  {
    name: 'API Requests/min',
    current: 2400,
    max: 5000,
    unit: 'req/min',
    trend: '+8%',
    status: 'healthy',
    icon: Zap,
  },
  {
    name: 'Active Users',
    current: 1250,
    max: 5000,
    unit: 'users',
    trend: '+25%',
    status: 'healthy',
    icon: Users,
  },
  {
    name: 'Storage Used',
    current: 78,
    max: 100,
    unit: 'GB',
    trend: '+5%',
    status: 'warning',
    icon: Server,
  },
];

const growthProjections = [
  { period: 'Q1 2026', users: 2500, revenue: '€125K', hires: 15 },
  { period: 'Q2 2026', users: 4000, revenue: '€200K', hires: 25 },
  { period: 'Q3 2026', users: 6500, revenue: '€325K', hires: 40 },
  { period: 'Q4 2026', users: 10000, revenue: '€500K', hires: 60 },
];

const scalingTriggers = [
  { metric: 'CPU Usage', threshold: '80%', action: 'Auto-scale compute', status: 'active' },
  { metric: 'Memory Usage', threshold: '75%', action: 'Add memory tier', status: 'active' },
  { metric: 'DB Connections', threshold: '800', action: 'Scale read replicas', status: 'standby' },
  { metric: 'Queue Depth', threshold: '1000', action: 'Add worker instances', status: 'active' },
];

export function CapacityPlanningDashboard() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 text-green-500';
      case 'warning': return 'bg-yellow-500/10 text-yellow-500';
      case 'critical': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {capacityMetrics.map((metric) => {
          const Icon = metric.icon;
          const percentage = (metric.current / metric.max) * 100;
          
          return (
            <Card key={metric.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{metric.name}</p>
                <p className="text-2xl font-bold">
                  {metric.current.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {metric.max.toLocaleString()} {metric.unit}</span>
                </p>
                <Progress value={percentage} className="mt-2" />
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {metric.trend} this month
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Projections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {growthProjections.map((proj) => (
                <div key={proj.period} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{proj.period}</p>
                    <p className="text-sm text-muted-foreground">
                      {proj.users.toLocaleString()} users • {proj.hires} hires
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{proj.revenue}</p>
                    <p className="text-xs text-muted-foreground">MRR target</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Scaling Triggers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Auto-Scaling Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scalingTriggers.map((trigger, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{trigger.metric}</p>
                    <p className="text-sm text-muted-foreground">
                      Threshold: {trigger.threshold} → {trigger.action}
                    </p>
                  </div>
                  <Badge variant={trigger.status === 'active' ? 'default' : 'secondary'}>
                    {trigger.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Configure Scaling Rules
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Alerts */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            Capacity Planning Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">•</span>
              <span>Storage approaching 80% - consider upgrading to next tier before Q2</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">•</span>
              <span>User growth trending 25% MoM - prepare for 10x capacity by Q4</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">•</span>
              <span>Add database read replicas when connections exceed 600</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
