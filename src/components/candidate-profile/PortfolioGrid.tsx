import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, Download, ExternalLink, Link as LinkIcon, 
  Plus, Github, Globe 
} from "lucide-react";
import { motion } from "framer-motion";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";

interface Props {
  candidate: any;
  portfolioItems?: any[];
  canEdit?: boolean;
  onAddLink?: () => void;
}

// OPTIMIZED: Cap animation delay to prevent slow rendering on large lists
const MAX_STAGGER_ITEMS = 8;
const getAnimationDelay = (idx: number) => Math.min(idx, MAX_STAGGER_ITEMS) * 0.05;

/**
 * OPTIMIZED: Memoized PortfolioGrid with capped stagger animations
 */
export const PortfolioGrid = memo(function PortfolioGrid({ candidate, portfolioItems = [], canEdit, onAddLink }: Props) {
  // OPTIMIZED: Memoize links array
  const links = useMemo(() => [
    { icon: Github, label: 'GitHub', url: candidate.github_url, color: 'text-foreground' },
    { icon: Globe, label: 'Portfolio', url: candidate.portfolio_url, color: 'text-purple-500' },
  ].filter(link => link.url), [candidate.github_url, candidate.portfolio_url]);

  // Parse custom links from JSONB field
  const customLinks = candidate.candidate_links || [];
  
  // Only show section if there are links/portfolio items or user can edit
  const hasContent = links.length > 0 || customLinks.length > 0 || portfolioItems.length > 0 || (canEdit && onAddLink);

  if (!candidate.resume_url && !hasContent) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Resume Card */}
      {candidate.resume_url && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resume / CV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold">{candidate.resume_filename || 'Resume.pdf'}</p>
                  <p className="text-sm text-muted-foreground">Click to download</p>
                </div>
              </div>
              <Button asChild>
                <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social & Website Links */}
      {hasContent && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Links & Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {links.map((link, idx) => (
                <motion.a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: getAnimationDelay(idx) }}
                  whileHover={{ scale: 1.02 }}
                  className={`${candidateProfileTokens.glass.strong} rounded-xl p-4 flex items-center gap-3 transition-all hover:shadow-md`}
                >
                  <link.icon className={`w-5 h-5 ${link.color}`} />
                  <span className="font-medium">{link.label}</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </motion.a>
              ))}
              {customLinks.map((link: any, idx: number) => (
                <motion.a
                  key={`custom-${idx}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: getAnimationDelay(links.length + idx) }}
                  whileHover={{ scale: 1.02 }}
                  className={`${candidateProfileTokens.glass.strong} rounded-xl p-4 flex items-center gap-3 transition-all hover:shadow-md`}
                >
                  <Globe className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">{link.label}</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </motion.a>
              ))}
              {canEdit && onAddLink && (
                <motion.button
                  onClick={onAddLink}
                  whileHover={{ scale: 1.02 }}
                  className="border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Link</span>
                </motion.button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Items */}
      {portfolioItems && portfolioItems.length > 0 && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Portfolio Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: getAnimationDelay(idx) }}
                  className={`${candidateProfileTokens.glass.strong} rounded-xl overflow-hidden hover:shadow-lg transition-all`}
                  style={{ contentVisibility: idx > 6 ? 'auto' : 'visible' }}
                >
                  {item.thumbnail_url && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        width={400}
                        height={225}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                    {item.technologies && item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.technologies.slice(0, 3).map((tech: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {item.url && (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          View Project
                        </a>
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
