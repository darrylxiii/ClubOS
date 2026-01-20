import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Globe, Users, MapPin, Linkedin, ExternalLink, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompanyData {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  linkedinUrl?: string;
  description?: string;
  fundingStage?: string;
  employeeCount?: number;
}

interface CompanyEnrichmentSidebarProps {
  company: CompanyData | null;
  loading?: boolean;
}

export function CompanyEnrichmentSidebar({ company, loading }: CompanyEnrichmentSidebarProps) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="w-5 h-5" />
            Company Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="w-5 h-5" />
            Company Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No company information available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building className="w-5 h-5 text-primary" />
            </div>
            {company.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {company.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {company.description}
            </p>
          )}

          <div className="space-y-3">
            {company.industry && (
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{company.industry}</span>
              </div>
            )}

            {company.size && (
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{company.size}</span>
                {company.employeeCount && (
                  <Badge variant="secondary" className="text-xs">
                    ~{company.employeeCount.toLocaleString()} employees
                  </Badge>
                )}
              </div>
            )}

            {company.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{company.location}</span>
              </div>
            )}

            {company.fundingStage && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {company.fundingStage}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {company.domain && (
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-1" />
                  Website
                </a>
              </Button>
            )}
            {company.linkedinUrl && (
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-1" />
                  LinkedIn
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
