import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  Search,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Activity,
  Target,
} from 'lucide-react';
import { useClientHealthScores, ClientHealthData } from '@/hooks/useClientHealthScore';
import { formatCurrencyCompact } from '@/hooks/useMultiHirePipelineMetrics';
import { formatDistanceToNow } from 'date-fns';

export function ClientHealthDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const { data: clients, isLoading } = useClientHealthScores();

  const filteredClients = clients?.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || client.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const riskCounts = {
    high: clients?.filter(c => c.risk_level === 'high').length || 0,
    medium: clients?.filter(c => c.risk_level === 'medium').length || 0,
    low: clients?.filter(c => c.risk_level === 'low').length || 0,
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Medium Risk</Badge>;
      default:
        return <Badge variant="outline" className="text-green-600">Low Risk</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${filterRisk === 'high' ? 'border-red-500' : ''}`}
          onClick={() => setFilterRisk(filterRisk === 'high' ? 'all' : 'high')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{riskCounts.high}</p>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                </div>
              </div>
              <TrendingDown className="h-6 w-6 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filterRisk === 'medium' ? 'border-yellow-500' : ''}`}
          onClick={() => setFilterRisk(filterRisk === 'medium' ? 'all' : 'medium')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{riskCounts.medium}</p>
                  <p className="text-sm text-muted-foreground">Medium Risk</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${filterRisk === 'low' ? 'border-green-500' : ''}`}
          onClick={() => setFilterRisk(filterRisk === 'low' ? 'all' : 'low')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{riskCounts.low}</p>
                  <p className="text-sm text-muted-foreground">Healthy</p>
                </div>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Client Health Monitor
              </CardTitle>
              <CardDescription>
                Track engagement, activity, and identify at-risk accounts
              </CardDescription>
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredClients?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4" />
              <p>No clients found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.company_id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Logo */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.logo_url || undefined} />
                    <AvatarFallback>
                      {client.company_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{client.company_name}</h4>
                      {getRiskBadge(client.risk_level)}
                    </div>
                    
                    {/* Health Score Bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <Progress 
                          value={client.overall_health_score} 
                          className={`h-2 ${getHealthBg(client.overall_health_score)}`}
                        />
                      </div>
                      <span className={`text-lg font-bold ${getHealthColor(client.overall_health_score)}`}>
                        {client.overall_health_score}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Engagement:</span>
                        <span className="font-medium">{client.engagement_score}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Placements:</span>
                        <span className="font-medium">{client.total_placements}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Pipeline:</span>
                        <span className="font-medium">{formatCurrencyCompact(client.pipeline_value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Last Active:</span>
                        <span className={`font-medium ${client.activity_recency_days > 30 ? 'text-red-500' : ''}`}>
                          {client.last_activity_date 
                            ? formatDistanceToNow(new Date(client.last_activity_date), { addSuffix: true })
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Risk Factors & Actions */}
                    {client.risk_factors.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {client.risk_factors.map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-red-500 border-red-500/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {client.suggested_actions.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {client.suggested_actions.slice(0, 2).map((action, idx) => (
                          <Button key={idx} size="sm" variant="outline" className="text-xs">
                            {action.includes('call') ? <Phone className="h-3 w-3 mr-1" /> : 
                             action.includes('email') ? <Mail className="h-3 w-3 mr-1" /> :
                             <Calendar className="h-3 w-3 mr-1" />}
                            {action}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="hidden lg:flex flex-col items-end gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Active Jobs:</span>
                      <Badge variant="secondary">{client.active_jobs}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Comm Score:</span>
                      <span className="font-medium">{client.communication_score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
