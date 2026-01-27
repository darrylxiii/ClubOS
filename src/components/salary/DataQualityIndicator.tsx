/**
 * Data Quality Indicator Component
 * 
 * Displays transparency about salary data sources, freshness, and reliability.
 * Matches TQC's premium, trustworthy aesthetic.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Globe, 
  Users,
  Clock,
  Shield
} from 'lucide-react';

interface DataQualityIndicatorProps {
  sampleSize: number;
  lastUpdated?: string;
  confidenceScore: number;
  sources?: {
    platform: number;
    seed: number;
    external: number;
  };
}

export function DataQualityIndicator({
  sampleSize,
  lastUpdated,
  confidenceScore,
  sources = { platform: 0, seed: 100, external: 0 }
}: DataQualityIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getConfidenceLevel = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: 'High', color: 'bg-success/20 text-success border-success/30' };
    if (score >= 0.6) return { label: 'Medium', color: 'bg-warning/20 text-warning border-warning/30' };
    return { label: 'Low', color: 'bg-muted text-muted-foreground border-muted' };
  };

  const getTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const confidence = getConfidenceLevel(confidenceScore);
  const totalSources = sources.platform + sources.seed + sources.external;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border/50 rounded-lg bg-muted/20">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Data Quality & Sources</span>
              <Badge variant="outline" className={confidence.color}>
                {confidence.label} Confidence
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Sample Size</p>
                  <p className="font-semibold">{sampleSize.toLocaleString()} data points</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="font-semibold">{getTimeAgo(lastUpdated)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Confidence Score</p>
                  <p className="font-semibold">{Math.round(confidenceScore * 100)}%</p>
                </div>
              </div>
            </div>

            {/* Data Sources Breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Data Sources
              </p>
              <div className="flex gap-2">
                {sources.seed > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border/50">
                    <Database className="w-3 h-3 text-primary" />
                    <span className="text-xs">Market Data</span>
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {Math.round((sources.seed / totalSources) * 100)}%
                    </Badge>
                  </div>
                )}
                {sources.platform > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border/50">
                    <Users className="w-3 h-3 text-accent-gold" />
                    <span className="text-xs">Platform Intelligence</span>
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {Math.round((sources.platform / totalSources) * 100)}%
                    </Badge>
                  </div>
                )}
                {sources.external > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border/50">
                    <Globe className="w-3 h-3 text-success" />
                    <span className="text-xs">External APIs</span>
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {Math.round((sources.external / totalSources) * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Confidence Explanation */}
            <p className="text-xs text-muted-foreground">
              {confidenceScore >= 0.8 
                ? 'This data is highly reliable based on a large sample size and recent updates.'
                : confidenceScore >= 0.6
                ? 'This data provides a good estimate. Consider adjusting filters for more precision.'
                : 'Limited data available. Results may vary - consider expanding your search criteria.'}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
