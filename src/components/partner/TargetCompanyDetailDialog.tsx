import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, MapPin, Globe, User, Send, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string | null };
}

interface TargetCompanyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onRefresh: () => void;
}

export function TargetCompanyDetailDialog({
  open,
  onOpenChange,
  company,
  onRefresh,
}: TargetCompanyDetailDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (open && company) {
      loadComments();
      checkVoteStatus();
    }
  }, [open, company]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("target_company_comments")
        .select("*")
        .eq("target_company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedComments = data?.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id)
      })) || [];

      setComments(enrichedComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const checkVoteStatus = async () => {
    if (!user) return;
    const voted = company.target_company_votes?.some(
      (vote: any) => vote.user_id === user.id
    );
    setHasVoted(voted || false);
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("target_company_comments").insert({
        target_company_id: company.id,
        user_id: user.id,
        comment: newComment.trim(),
      });

      if (error) throw error;

      toast.success("Comment toegevoegd");
      setNewComment("");
      loadComments();
      onRefresh();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Fout bij toevoegen comment");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!user) return;

    try {
      if (hasVoted) {
        const { error } = await supabase
          .from("target_company_votes")
          .delete()
          .eq("target_company_id", company.id)
          .eq("user_id", user.id);

        if (error) throw error;

        await supabase
          .from("target_companies")
          .update({ votes: Math.max(0, company.votes - 1) })
          .eq("id", company.id);

        setHasVoted(false);
        toast.success("Vote verwijderd");
      } else {
        const { error } = await supabase
          .from("target_company_votes")
          .insert({ target_company_id: company.id, user_id: user.id });

        if (error) throw error;

        await supabase
          .from("target_companies")
          .update({ votes: company.votes + 1 })
          .eq("id", company.id);

        setHasVoted(true);
        toast.success("Vote toegevoegd");
      }

      onRefresh();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Fout bij stemmen");
    }
  };

  const jobSpecs = Array.isArray(company.job_specifications)
    ? company.job_specifications
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-10 w-10 rounded object-cover"
              />
            )}
            <div>
              <div>{company.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {company.industry}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Status
              </div>
              <Badge>{company.status}</Badge>
            </div>

            {company.location && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Locatie
                </div>
                <div>{company.location}</div>
              </div>
            )}

            {company.website_url && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Website
                </div>
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.website_url}
                </a>
              </div>
            )}

            {company.company_insider && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Company Insider
                </div>
                <div>{company.company_insider}</div>
              </div>
            )}
          </div>

          {/* Priority */}
          {company.priority && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Prioriteit</div>
              <div className="flex items-center gap-2">
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${company.priority * 10}%` }}
                  />
                </div>
                <span className="font-medium">{company.priority}/10</span>
              </div>
            </div>
          )}

          {/* Job Specifications */}
          {jobSpecs.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Functie Specificaties</div>
              <div className="flex flex-wrap gap-2">
                {jobSpecs.map((spec: string, idx: number) => (
                  <Badge key={idx} variant="outline">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {company.notes && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Notities</div>
              <div className="rounded-lg bg-muted p-4 text-sm">{company.notes}</div>
            </div>
          )}

          {/* Votes */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant={hasVoted ? "default" : "outline"}
              onClick={handleVote}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              {hasVoted ? "Voted" : "Vote"}
              <span className="font-bold">{company.votes}</span>
            </Button>
            <div className="text-sm text-muted-foreground">
              {company.target_company_votes?.length || 0} personen hebben gestemd
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Comments</h3>

            {/* Add Comment */}
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Voeg een comment toe..."
                rows={3}
              />
              <Button onClick={handleAddComment} disabled={loading || !newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {comment.profiles?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.profiles?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "PPp", { locale: nl })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nog geen comments
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}