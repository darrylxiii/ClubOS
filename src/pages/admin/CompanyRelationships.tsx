import { useState } from 'react';
import { RefreshCw, Download, Building2, Users, Mail, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { PageTitle } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CompanyRelationshipGrid } from '@/components/communication/CompanyRelationshipGrid';
import { CompanyContactManager } from '@/components/communication/CompanyContactManager';
import { ContactSentimentList } from '@/components/communication/ContactSentimentList';
import { QUINAdvisorWidget } from '@/components/communication/QUINAdvisorWidget';
import { useCompanyRelationships } from '@/hooks/useCompanyRelationships';
import { useEmailIntelligenceSync } from '@/hooks/useEmailIntelligenceSync';
import { notify } from '@/lib/notify';

export default function CompanyRelationships() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { relationships, companies, stats, loading, refetch } = useCompanyRelationships(selectedCompanyId);
  const { syncEmailIntelligence, isSyncing, lastSyncResults } = useEmailIntelligenceSync();

  const handleSendMessage = (companyId: string, channel: 'whatsapp' | 'email') => {
    const company = relationships.find(r => r.company_id === companyId);
    notify.info(`Opening ${channel}`, {
      description: `Preparing to contact ${company?.company_name || 'company'}...`
    });
  };

  const handleExport = () => {
    const csvContent = [
      ['Company', 'Risk Level', 'Engagement', 'Response Rate', 'Sentiment', 'Emails', 'Last Contact', 'Active Jobs', 'Placements', 'Health Score'].join(','),
      ...relationships.map(r => [
        `"${r.company_name}"`,
        r.risk_level,
        r.engagement_score?.toFixed(1) || '0',
        `${Math.round((r.response_rate || 0) * 100)}%`,
        r.avg_sentiment ? `${Math.round(r.avg_sentiment * 100)}%` : 'N/A',
        r.total_communications || 0,
        r.last_outbound_at || 'Never',
        r.active_jobs,
        r.total_placements,
        r.email_health_score ?? 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company-relationships-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    notify.success('Export complete', {
      description: `Exported ${relationships.length} company relationships`
    });
  };

  const selectedCompany = selectedCompanyId 
    ? companies.find(c => c.id === selectedCompanyId)
    : null;

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <PageTitle>Company Relationships</PageTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage relationships with partner companies
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={async () => {
                  await syncEmailIntelligence();
                  refetch();
                }}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isSyncing ? 'Syncing...' : 'Sync Emails'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {relationships.reduce((sum, r) => sum + (r.total_communications || 0), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Emails Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.avgSentiment !== 0 ? `${Math.round(stats.avgSentiment * 100)}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Sentiment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Users className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.needsAttention + stats.atRisk}</p>
                    <p className="text-xs text-muted-foreground">Need Attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Building2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.critical}</p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content with Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <CompanyRelationshipGrid
                    relationships={relationships}
                    companies={companies}
                    stats={stats}
                    loading={loading}
                    selectedCompanyId={selectedCompanyId}
                    onCompanyChange={setSelectedCompanyId}
                    onSendMessage={handleSendMessage}
                  />
                </TabsContent>

                <TabsContent value="contacts">
                  <Card>
                    <CardHeader>
                      <CardTitle>Company Contacts</CardTitle>
                      <CardDescription>
                        Manage contacts for each partner company. Add emails manually or auto-detect from communications.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedCompanyId && selectedCompany ? (
                        <CompanyContactManager
                          companyId={selectedCompanyId}
                          companyName={selectedCompany.name}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Select a company from the Overview tab to manage contacts.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sentiment">
                  <Card>
                    <CardHeader>
                      <CardTitle>Per-Person Sentiment</CardTitle>
                      <CardDescription>
                        View sentiment analysis for individual contacts within each company.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedCompanyId ? (
                        <ContactSentimentList companyId={selectedCompanyId} />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Select a company from the Overview tab to view individual contact sentiment.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar - QUIN Advisor */}
            <div className="lg:col-span-1">
              <QUINAdvisorWidget context="general" />
            </div>
          </div>
        </div>
      </AppLayout>
    </RoleGate>
  );
}
