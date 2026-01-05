import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Inbox, Search, Filter, Star, Clock, DollarSign,
  CheckCircle2, XCircle, MessageSquare, Calendar,
  ChevronRight, Sparkles, Eye, ThumbsUp, ThumbsDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectChat } from "@/components/projects/ProjectChat";

interface Proposal {
  id: string;
  cover_letter: string;
  proposed_rate: number;
  proposed_timeline_weeks: number;
  status: string;
  match_score: number;
  submitted_at: string;
  viewed_by_client_at: string | null;
  freelancer: {
    id: string;
    full_name: string;
    avatar_url: string;
    current_title: string;
  };
  project: {
    id: string;
    title: string;
  };
}

interface ProposalInboxProps {
  projectId?: string;
  companyId?: string;
}

export function ProposalInbox({ projectId, companyId }: ProposalInboxProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<{ id: string; name: string; projectId: string } | null>(null);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposal-inbox", projectId, companyId, activeTab, sortBy],
    queryFn: async () => {
      let query = (supabase as any)
        .from("project_proposals")
        .select(`
          *,
          freelancer:profiles!project_proposals_freelancer_id_fkey(
            id, full_name, avatar_url, current_title
          ),
          project:marketplace_projects!project_proposals_project_id_fkey(
            id, title
          )
        `);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      // Sort
      switch (sortBy) {
        case "newest":
          query = query.order("submitted_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("submitted_at", { ascending: true });
          break;
        case "match_score":
          query = query.order("match_score", { ascending: false });
          break;
        case "rate_low":
          query = query.order("proposed_rate", { ascending: true });
          break;
        case "rate_high":
          query = query.order("proposed_rate", { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Proposal[];
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, status, notes }: { proposalId: string; status: string; notes?: string }) => {
      const updateData: any = { status, reviewed_at: new Date().toISOString() };
      if (notes) updateData.client_notes = notes;
      
      const { error } = await supabase
        .from("project_proposals")
        .update(updateData)
        .eq("id", proposalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-inbox"] });
      toast.success("Proposal updated");
    },
    onError: (error) => {
      toast.error("Failed to update proposal: " + error.message);
    },
  });

  const markAsViewedMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("project_proposals")
        .update({ viewed_by_client_at: new Date().toISOString() })
        .eq("id", proposalId)
        .is("viewed_by_client_at", null);
      
      if (error) throw error;
    },
  });

  const handleViewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    if (!proposal.viewed_by_client_at) {
      markAsViewedMutation.mutate(proposal.id);
    }
  };

  const filteredProposals = proposals?.filter(p =>
    !searchQuery ||
    p.freelancer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.cover_letter?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted": return "bg-blue-100 text-blue-800";
      case "shortlisted": return "bg-yellow-100 text-yellow-800";
      case "interviewing": return "bg-purple-100 text-purple-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const tabCounts = {
    all: proposals?.length || 0,
    submitted: proposals?.filter(p => p.status === "submitted").length || 0,
    shortlisted: proposals?.filter(p => p.status === "shortlisted").length || 0,
    interviewing: proposals?.filter(p => p.status === "interviewing").length || 0,
    accepted: proposals?.filter(p => p.status === "accepted").length || 0,
    rejected: proposals?.filter(p => p.status === "rejected").length || 0,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Proposal List */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Proposals
              {tabCounts.all > 0 && (
                <Badge variant="secondary">{tabCounts.all}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proposals..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="match_score">Best Match</SelectItem>
                  <SelectItem value="rate_low">Rate: Low to High</SelectItem>
                  <SelectItem value="rate_high">Rate: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="submitted">
                  New {tabCounts.submitted > 0 && `(${tabCounts.submitted})`}
                </TabsTrigger>
                <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Proposal List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredProposals && filteredProposals.length > 0 ? (
            filteredProposals.map((proposal) => (
              <Card
                key={proposal.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedProposal?.id === proposal.id ? "ring-2 ring-primary" : ""
                } ${!proposal.viewed_by_client_at ? "bg-primary/5" : ""}`}
                onClick={() => handleViewProposal(proposal)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={proposal.freelancer?.avatar_url} />
                      <AvatarFallback>
                        {proposal.freelancer?.full_name?.charAt(0) || "F"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {proposal.freelancer?.full_name}
                        </p>
                        {!proposal.viewed_by_client_at && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {proposal.freelancer?.current_title}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          €{proposal.proposed_rate}/hr
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {proposal.proposed_timeline_weeks}w
                        </span>
                        {proposal.match_score && (
                          <span className="flex items-center gap-1 text-primary">
                            <Sparkles className="h-3 w-3" />
                            {proposal.match_score}%
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No proposals yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Panel - Proposal Detail */}
      <div className="lg:col-span-2">
        {selectedProposal ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedProposal.freelancer?.avatar_url} />
                    <AvatarFallback>
                      {selectedProposal.freelancer?.full_name?.charAt(0) || "F"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedProposal.freelancer?.full_name}</CardTitle>
                    <CardDescription>
                      {selectedProposal.freelancer?.current_title}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(selectedProposal.status)}>
                  {selectedProposal.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">€{selectedProposal.proposed_rate}</p>
                  <p className="text-xs text-muted-foreground">per hour</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{selectedProposal.proposed_timeline_weeks}</p>
                  <p className="text-xs text-muted-foreground">weeks</p>
                </div>
                {selectedProposal.match_score && (
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold text-primary">{selectedProposal.match_score}%</p>
                    <p className="text-xs text-muted-foreground">AI Match</p>
                  </div>
                )}
              </div>

              {/* Cover Letter */}
              <div>
                <h4 className="font-medium mb-2">Cover Letter</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {selectedProposal.cover_letter}
                </p>
              </div>

              {/* Submitted Time */}
              <p className="text-sm text-muted-foreground">
                Submitted {formatDistanceToNow(new Date(selectedProposal.submitted_at), { addSuffix: true })}
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedProposal.status === "submitted" && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => updateProposalMutation.mutate({
                        proposalId: selectedProposal.id,
                        status: "rejected"
                      })}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => updateProposalMutation.mutate({
                        proposalId: selectedProposal.id,
                        status: "shortlisted"
                      })}
                    >
                      <Star className="h-4 w-4" />
                      Shortlist
                    </Button>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={() => {
                        setChatRecipient({
                          id: selectedProposal.freelancer?.id || "",
                          name: selectedProposal.freelancer?.full_name || "Freelancer",
                          projectId: selectedProposal.project?.id || ""
                        });
                        setChatOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  </>
                )}
                
                {selectedProposal.status === "shortlisted" && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => updateProposalMutation.mutate({
                        proposalId: selectedProposal.id,
                        status: "rejected"
                      })}
                    >
                      <XCircle className="h-4 w-4" />
                      Remove
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => updateProposalMutation.mutate({
                        proposalId: selectedProposal.id,
                        status: "interviewing"
                      })}
                    >
                      <Calendar className="h-4 w-4" />
                      Schedule Interview
                    </Button>
                  </>
                )}

                {selectedProposal.status === "interviewing" && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => updateProposalMutation.mutate({
                        proposalId: selectedProposal.id,
                        status: "rejected"
                      })}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => updateProposalMutation.mutate({
                        proposalId: selectedProposal.id,
                        status: "accepted"
                      })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept & Hire
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  onClick={() => navigate(`/profile/${selectedProposal.freelancer?.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Proposal</h3>
              <p className="text-muted-foreground">
                Click on a proposal to view details
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Message {chatRecipient?.name}</DialogTitle>
          </DialogHeader>
          {chatRecipient && (
            <ProjectChat
              projectId={chatRecipient.projectId}
              recipientId={chatRecipient.id}
              recipientName={chatRecipient.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
