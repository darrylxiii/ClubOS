import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, ThumbsUp, MessageSquare, ExternalLink } from "lucide-react";
import { TargetCompanyDetailDialog } from "./TargetCompanyDetailDialog";
import { EnrichmentBadge } from "./EnrichmentBadge";

interface TargetCompany {
  id: string;
  name: string;
  status: string;
  industry: string | null;
  priority: number | null;
  job_id: string | null;
  votes: number | null;
  company_insider: string | null;
  location: string | null;
  logo_url: string | null;
  website_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  enrichment_source?: 'database' | 'clearbit' | 'manual';
  profiles?: { full_name: string | null } | null;
  jobs?: { title: string; status: string | null } | null;
  target_company_votes?: Array<{ user_id: string; profiles?: { full_name: string | null } }>;
  target_company_comments?: Array<any>;
}

interface TargetCompanyTableProps {
  companies: TargetCompany[];
  loading: boolean;
  currentUserId: string;
  onEdit: (company: TargetCompany) => void;
  onDelete: (companyId: string) => void;
  onVote: (companyId: string, hasVoted: boolean) => void;
  onRefresh: () => void;
  getStatusIcon: (status: string) => JSX.Element;
}

export function TargetCompanyTable({
  companies,
  loading,
  currentUserId,
  onEdit,
  onDelete,
  onVote,
  onRefresh,
  getStatusIcon,
}: TargetCompanyTableProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<TargetCompany | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "targetting": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "paused": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "done": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "hunting": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getPriorityColor = (priority: number | null) => {
    if (!priority) return "bg-gray-500";
    if (priority >= 8) return "bg-green-500";
    if (priority >= 5) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleOpenDetail = (company: TargetCompany) => {
    setSelectedCompany(company);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Laden...
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Geen bedrijven gevonden
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Industrie</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Prioriteit</TableHead>
              <TableHead>Functies</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Upvoted By</TableHead>
              <TableHead>Locatie</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const hasVoted = company.target_company_votes?.some(
                (vote) => vote.user_id === currentUserId
              );

              return (
                <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell onClick={() => handleOpenDetail(company)}>
                    <div className="flex items-center gap-2">
                      {company.logo_url && (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{company.name}</div>
                        {company.website_url && (
                          <a
                            href={company.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Website <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(company.status)}>
                      <span className="mr-1">{getStatusIcon(company.status)}</span>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {company.industry ? (
                      <Badge variant="secondary">{company.industry}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EnrichmentBadge 
                      source={company.enrichment_source || 'manual'} 
                    />
                  </TableCell>
                  <TableCell>
                    {company.priority ? (
                      <div className="flex items-center gap-2">
                        <div className="w-full max-w-[100px] bg-muted rounded-full h-2">
                          <div
                            className={`h-full rounded-full ${getPriorityColor(company.priority)}`}
                            style={{ width: `${company.priority * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{company.priority}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.jobs ? (
                      <Badge variant="secondary" className="text-xs">
                        {company.jobs.title}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Alle jobs</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={hasVoted ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVote(company.id, hasVoted);
                      }}
                      className="gap-1"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      {company.votes ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 max-w-[150px]">
                      {company.target_company_votes?.slice(0, 2).map((vote, idx) => (
                        <span key={idx} className="text-xs text-muted-foreground truncate">
                          {vote.profiles?.full_name || "Unknown"}
                        </span>
                      ))}
                      {(company.target_company_votes?.length || 0) > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{(company.target_company_votes?.length || 0) - 2} meer
                        </span>
                      )}
                      {!company.target_company_votes?.length && (
                        <span className="text-xs text-muted-foreground">Geen votes</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {company.location || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" aria-label="Company actions">
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetail(company)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Details & Comments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(company)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Bewerken
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(company.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedCompany && (
        <TargetCompanyDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          company={selectedCompany}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}