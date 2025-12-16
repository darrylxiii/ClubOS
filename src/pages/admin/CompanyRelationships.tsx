import { useState } from 'react';
import { RefreshCw, Download, Building2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { PageTitle } from '@/components/ui/typography';
import { CompanyRelationshipGrid } from '@/components/communication/CompanyRelationshipGrid';
import { QUINAdvisorWidget } from '@/components/communication/QUINAdvisorWidget';
import { useCompanyRelationships } from '@/hooks/useCompanyRelationships';
import { useToast } from '@/hooks/use-toast';

export default function CompanyRelationships() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const { relationships, companies, stats, loading, refetch } = useCompanyRelationships(selectedCompanyId);
  const { toast } = useToast();

  const handleSendMessage = (companyId: string, channel: 'whatsapp' | 'email') => {
    // Find company name
    const company = relationships.find(r => r.company_id === companyId);
    toast({
      title: `Opening ${channel}`,
      description: `Preparing to contact ${company?.company_name || 'company'}...`
    });
    // TODO: Integrate with actual messaging system
  };

  const handleExport = () => {
    const csvContent = [
      ['Company', 'Risk Level', 'Engagement', 'Response Rate', 'Messages', 'Last Contact', 'Active Jobs', 'Placements'].join(','),
      ...relationships.map(r => [
        `"${r.company_name}"`,
        r.risk_level,
        r.engagement_score?.toFixed(1) || '0',
        `${Math.round((r.response_rate || 0) * 100)}%`,
        r.total_communications || 0,
        r.last_outbound_at || 'Never',
        r.active_jobs,
        r.total_placements
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company-relationships-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Exported ${relationships.length} company relationships`
    });
  };

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

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Grid - 3 columns on large screens */}
            <div className="lg:col-span-3">
              <CompanyRelationshipGrid
                relationships={relationships}
                companies={companies}
                stats={stats}
                loading={loading}
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={setSelectedCompanyId}
                onSendMessage={handleSendMessage}
              />
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
