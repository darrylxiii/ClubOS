import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CompanyRelationshipCard } from './CompanyRelationshipCard';
import { CompanyRelationship, CompanyRelationshipStats } from '@/hooks/useCompanyRelationships';
import { cn } from '@/lib/utils';

interface CompanyRelationshipGridProps {
  relationships: CompanyRelationship[];
  companies: { id: string; name: string }[];
  stats: CompanyRelationshipStats;
  loading: boolean;
  selectedCompanyId: string | null;
  onCompanyChange: (companyId: string | null) => void;
  onSendMessage?: (companyId: string, channel: 'whatsapp' | 'email') => void;
}

type FilterStatus = 'all' | 'healthy' | 'attention' | 'at-risk' | 'critical';

export function CompanyRelationshipGrid({
  relationships,
  companies,
  stats,
  loading,
  selectedCompanyId,
  onCompanyChange,
  onSendMessage
}: CompanyRelationshipGridProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const filteredRelationships = relationships.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'healthy') return r.risk_level === 'low';
    if (statusFilter === 'attention') return r.risk_level === 'medium';
    if (statusFilter === 'at-risk') return r.risk_level === 'high';
    if (statusFilter === 'critical') return r.risk_level === 'critical';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Companies"
          value={stats.total}
          icon={Building2}
          color="text-primary"
        />
        <StatsCard
          title="Healthy"
          value={stats.healthy}
          icon={CheckCircle}
          color="text-green-500"
          onClick={() => setStatusFilter(statusFilter === 'healthy' ? 'all' : 'healthy')}
          active={statusFilter === 'healthy'}
        />
        <StatsCard
          title="Needs Attention"
          value={stats.needsAttention}
          icon={AlertTriangle}
          color="text-yellow-500"
          onClick={() => setStatusFilter(statusFilter === 'attention' ? 'all' : 'attention')}
          active={statusFilter === 'attention'}
        />
        <StatsCard
          title="At Risk"
          value={stats.atRisk}
          icon={AlertTriangle}
          color="text-orange-500"
          onClick={() => setStatusFilter(statusFilter === 'at-risk' ? 'all' : 'at-risk')}
          active={statusFilter === 'at-risk'}
        />
        <StatsCard
          title="Critical"
          value={stats.critical}
          icon={AlertTriangle}
          color="text-red-500"
          onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
          active={statusFilter === 'critical'}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select
          value={selectedCompanyId || 'all'}
          onValueChange={(value) => onCompanyChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {statusFilter !== 'all' && (
          <Badge 
            variant="secondary" 
            className="cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            Status: {statusFilter} ✕
          </Badge>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredRelationships.length} of {relationships.length} companies
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredRelationships.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No companies found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Add companies to start tracking relationships'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
        >
          {filteredRelationships.map((relationship) => (
            <CompanyRelationshipCard
              key={relationship.company_id}
              relationship={relationship}
              onSendMessage={onSendMessage 
                ? (channel) => onSendMessage(relationship.company_id, channel)
                : undefined}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  active?: boolean;
}

function StatsCard({ title, value, icon: Icon, color, onClick, active }: StatsCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:shadow-md",
        active && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
          <Icon className={cn("h-8 w-8 opacity-50", color)} />
        </div>
      </CardContent>
    </Card>
  );
}
