import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, ArrowRight, Rocket, Users, Code, DollarSign } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'in-progress' | 'pending';
  category: 'tech' | 'team' | 'process' | 'finance';
}

const scalingChecklist: ChecklistItem[] = [
  // Tech
  { id: '1', title: 'Horizontal scaling architecture', description: 'Stateless services, load balancing configured', status: 'complete', category: 'tech' },
  { id: '2', title: 'Database read replicas', description: 'Read replicas ready to deploy on demand', status: 'complete', category: 'tech' },
  { id: '3', title: 'CDN & edge caching', description: 'Static assets served from edge locations', status: 'complete', category: 'tech' },
  { id: '4', title: 'Auto-scaling policies', description: 'CPU/memory triggers configured', status: 'in-progress', category: 'tech' },
  { id: '5', title: 'Multi-region deployment', description: 'EU & US regions for latency optimization', status: 'pending', category: 'tech' },
  
  // Team
  { id: '6', title: 'Hiring pipeline established', description: 'Recruiters, job posts, interview process', status: 'complete', category: 'team' },
  { id: '7', title: 'Onboarding automation', description: 'Self-serve onboarding < 1 week', status: 'complete', category: 'team' },
  { id: '8', title: 'Leadership team complete', description: 'CTO, VP Sales, VP Ops in place', status: 'in-progress', category: 'team' },
  { id: '9', title: 'Remote-first culture documented', description: 'Handbook, async practices, tools', status: 'complete', category: 'team' },
  
  // Process
  { id: '10', title: 'Customer success playbooks', description: 'Onboarding, QBRs, escalation paths', status: 'complete', category: 'process' },
  { id: '11', title: 'Sales process documented', description: 'CRM workflows, qualification criteria', status: 'complete', category: 'process' },
  { id: '12', title: 'Support tier escalation', description: 'L1/L2/L3 support with SLAs', status: 'in-progress', category: 'process' },
  { id: '13', title: 'Partner onboarding flow', description: 'Self-serve partner registration', status: 'pending', category: 'process' },
  
  // Finance
  { id: '14', title: 'Unit economics validated', description: 'CAC:LTV ratio > 3:1', status: 'complete', category: 'finance' },
  { id: '15', title: 'Runway calculated', description: '18+ months with current burn', status: 'complete', category: 'finance' },
  { id: '16', title: 'Budget model for 10x scale', description: 'Hiring, infra, marketing projections', status: 'in-progress', category: 'finance' },
];

const categoryConfig = {
  tech: { label: 'Technology', icon: Code, color: 'text-blue-500' },
  team: { label: 'Team', icon: Users, color: 'text-green-500' },
  process: { label: 'Process', icon: ArrowRight, color: 'text-purple-500' },
  finance: { label: 'Finance', icon: DollarSign, color: 'text-yellow-500' },
};

export function ScalingReadinessPanel() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const categories = ['tech', 'team', 'process', 'finance'] as const;
  
  const getCategoryProgress = (category: string) => {
    const items = scalingChecklist.filter(i => i.category === category);
    const complete = items.filter(i => i.status === 'complete').length;
    return Math.round((complete / items.length) * 100);
  };

  const overallProgress = Math.round(
    (scalingChecklist.filter(i => i.status === 'complete').length / scalingChecklist.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Rocket className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Scale Readiness Score</h2>
                <p className="text-muted-foreground">Overall preparation for 10x growth</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-primary">{overallProgress}%</p>
              <p className="text-sm text-muted-foreground">
                {scalingChecklist.filter(i => i.status === 'complete').length} / {scalingChecklist.length} items
              </p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const config = categoryConfig[cat];
          const Icon = config.icon;
          const progress = getCategoryProgress(cat);
          
          return (
            <Card key={cat}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                </div>
                <p className="text-2xl font-bold mb-2">{progress}%</p>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Checklist by Category */}
      {categories.map((cat) => {
        const config = categoryConfig[cat];
        const Icon = config.icon;
        const items = scalingChecklist.filter(i => i.category === cat);
        
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${config.color}`} />
                {config.label} Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.status === 'complete' ? 'bg-green-500/5 border-green-500/30' :
                      item.status === 'in-progress' ? 'bg-yellow-500/5 border-yellow-500/30' :
                      'bg-muted/50'
                    }`}
                  >
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Badge variant={
                      item.status === 'complete' ? 'default' :
                      item.status === 'in-progress' ? 'secondary' : 'outline'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
