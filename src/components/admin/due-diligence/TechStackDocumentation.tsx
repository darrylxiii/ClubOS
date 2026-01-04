import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Database, 
  Shield, 
  Cpu, 
  Globe, 
  Lock,
  Zap,
  Cloud
} from 'lucide-react';

interface TechItem {
  name: string;
  category: string;
  purpose: string;
  maturity: 'production' | 'beta' | 'planned';
}

const techStack: TechItem[] = [
  { name: 'React 18', category: 'Frontend', purpose: 'UI Framework', maturity: 'production' },
  { name: 'TypeScript', category: 'Frontend', purpose: 'Type Safety', maturity: 'production' },
  { name: 'Tailwind CSS', category: 'Frontend', purpose: 'Styling', maturity: 'production' },
  { name: 'Vite', category: 'Frontend', purpose: 'Build Tool', maturity: 'production' },
  { name: 'Supabase', category: 'Backend', purpose: 'Database & Auth', maturity: 'production' },
  { name: 'PostgreSQL', category: 'Database', purpose: 'Primary Database', maturity: 'production' },
  { name: 'Edge Functions', category: 'Backend', purpose: 'Serverless Logic', maturity: 'production' },
  { name: 'Row Level Security', category: 'Security', purpose: 'Data Isolation', maturity: 'production' },
  { name: 'OpenAI/Gemini', category: 'AI', purpose: 'QUIN AI Engine', maturity: 'production' },
  { name: 'Sentry', category: 'Observability', purpose: 'Error Tracking', maturity: 'production' },
  { name: 'PostHog', category: 'Analytics', purpose: 'Product Analytics', maturity: 'production' },
  { name: 'Capacitor', category: 'Mobile', purpose: 'Native Apps', maturity: 'beta' },
];

const securityFeatures = [
  'SOC 2 Type II Compliant',
  'GDPR Compliant',
  'End-to-end Encryption',
  'Row Level Security (RLS)',
  'Multi-factor Authentication',
  'Audit Logging',
  'Data Residency Controls',
  'Regular Penetration Testing',
];

const infrastructureMetrics = [
  { label: 'Uptime SLA', value: '99.9%' },
  { label: 'Average Response Time', value: '<200ms' },
  { label: 'Data Centers', value: '3 regions' },
  { label: 'Backup Frequency', value: 'Daily' },
  { label: 'Recovery Time Objective', value: '<4 hours' },
  { label: 'Recovery Point Objective', value: '<1 hour' },
];

export function TechStackDocumentation() {
  const getMaturityBadge = (maturity: TechItem['maturity']) => {
    switch (maturity) {
      case 'production':
        return <Badge className="bg-green-500">Production</Badge>;
      case 'beta':
        return <Badge className="bg-yellow-500">Beta</Badge>;
      case 'planned':
        return <Badge variant="outline">Planned</Badge>;
    }
  };

  const groupedStack = techStack.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, TechItem[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Technology Stack</h2>
        <p className="text-muted-foreground">
          Complete technical architecture documentation
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groupedStack).map(([category, items]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {category === 'Frontend' && <Globe className="h-5 w-5" />}
                {category === 'Backend' && <Server className="h-5 w-5" />}
                {category === 'Database' && <Database className="h-5 w-5" />}
                {category === 'Security' && <Shield className="h-5 w-5" />}
                {category === 'AI' && <Cpu className="h-5 w-5" />}
                {category === 'Observability' && <Zap className="h-5 w-5" />}
                {category === 'Analytics' && <Zap className="h-5 w-5" />}
                {category === 'Mobile' && <Cloud className="h-5 w-5" />}
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.purpose}</p>
                  </div>
                  {getMaturityBadge(item.maturity)}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {securityFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Infrastructure SLAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {infrastructureMetrics.map((metric) => (
                <div key={metric.label} className="flex justify-between">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-medium">{metric.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Architecture Highlights</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            <li><strong>Scalable Serverless Architecture:</strong> Edge functions auto-scale to handle traffic spikes without infrastructure management</li>
            <li><strong>Real-time Capabilities:</strong> WebSocket-based real-time updates for live collaboration features</li>
            <li><strong>AI-First Design:</strong> QUIN AI engine integrated at core for intelligent matching and recommendations</li>
            <li><strong>Multi-tenant Security:</strong> Row Level Security ensures complete data isolation between organizations</li>
            <li><strong>Mobile-Ready:</strong> Progressive Web App with native mobile capabilities via Capacitor</li>
            <li><strong>Observability Stack:</strong> Full error tracking, analytics, and performance monitoring</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
