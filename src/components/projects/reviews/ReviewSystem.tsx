import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Star, ThumbsUp
} from "lucide-react";

interface ReviewSystemProps {
  contractId: string;
  projectId?: string;
  freelancerId?: string;
  clientId?: string;
}

interface Review {
  id: string;
  overall_rating: number;
  review_text: string;
  communication_rating: number;
  professionalism_rating: number;
  quality_rating: number;
  timeliness_rating: number;
  would_work_again: boolean;
  is_public: boolean;
  response_text: string | null;
  created_at: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  reviewee: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export function ReviewSystem({ contractId, projectId, freelancerId, clientId }: ReviewSystemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({
    overall_rating: 5,
    review_text: "",
    communication_rating: 5,
    professionalism_rating: 5,
    quality_rating: 5,
    timeliness_rating: 5,
    would_work_again: true,
    is_public: true,
    project_highlights: [] as string[],
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["project-reviews", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_reviews")
        .select(`
          *,
          reviewer:profiles!project_reviews_reviewer_id_fkey(id, full_name, avatar_url),
          reviewee:profiles!project_reviews_reviewee_id_fkey(id, full_name, avatar_url)
        `)
        .eq("contract_id", contractId);
      
      if (error) throw error;
      return data as Review[];
    },
  });

  const { data: canReview } = useQuery({
    queryKey: ["can-review", contractId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Check if user is part of this contract
      const { data: contract } = await supabase
        .from("freelance_contracts")
        .select("client_id, freelancer_id, status")
        .eq("id", contractId)
        .single();
      
      if (!contract || contract.status !== "completed") return false;
      
      const isParticipant = contract.client_id === user.id || contract.freelancer_id === user.id;
      if (!isParticipant) return false;
      
      // Check if already reviewed
      const { data: existingReview } = await supabase
        .from("project_reviews")
        .select("id")
        .eq("contract_id", contractId)
        .eq("reviewer_id", user.id)
        .single();
      
      return !existingReview;
    },
    enabled: !!user?.id,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: typeof reviewData) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Determine reviewee
      const { data: contract } = await supabase
        .from("freelance_contracts")
        .select("client_id, freelancer_id")
        .eq("id", contractId)
        .single();
      
      if (!contract) throw new Error("Contract not found");
      
      const revieweeId = contract.client_id === user.id ? contract.freelancer_id : contract.client_id;
      const reviewType = contract.client_id === user.id ? "client_to_freelancer" : "freelancer_to_client";
      
      const { error } = await supabase
        .from("project_reviews")
        .insert({
          contract_id: contractId,
          project_id: projectId,
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          review_type: reviewType,
          ...data,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["can-review"] });
      setShowReviewDialog(false);
      setReviewData({
        overall_rating: 5,
        review_text: "",
        communication_rating: 5,
        professionalism_rating: 5,
        quality_rating: 5,
        timeliness_rating: 5,
        would_work_again: true,
        is_public: true,
        project_highlights: [],
      });
      toast.success("Review submitted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to submit review: " + error.message);
    },
  });

  const renderStars = (rating: number, onChange?: (value: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={onChange ? "cursor-pointer" : "cursor-default"}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Reviews & Ratings
          </h3>
          <p className="text-sm text-muted-foreground">
            {reviews?.length || 0} reviews for this project
          </p>
        </div>

        {canReview && (
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Star className="h-4 w-4" />
                Leave a Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Leave a Review</DialogTitle>
                <DialogDescription>
                  Share your experience working on this project
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Overall Rating */}
                <div>
                  <Label className="mb-2 block">Overall Rating</Label>
                  {renderStars(reviewData.overall_rating, (value) =>
                    setReviewData({ ...reviewData, overall_rating: value })
                  )}
                </div>

                {/* Category Ratings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Communication</Label>
                    {renderStars(reviewData.communication_rating, (value) =>
                      setReviewData({ ...reviewData, communication_rating: value })
                    )}
                  </div>
                  <div>
                    <Label className="text-sm">Professionalism</Label>
                    {renderStars(reviewData.professionalism_rating, (value) =>
                      setReviewData({ ...reviewData, professionalism_rating: value })
                    )}
                  </div>
                  <div>
                    <Label className="text-sm">Quality of Work</Label>
                    {renderStars(reviewData.quality_rating, (value) =>
                      setReviewData({ ...reviewData, quality_rating: value })
                    )}
                  </div>
                  <div>
                    <Label className="text-sm">Timeliness</Label>
                    {renderStars(reviewData.timeliness_rating, (value) =>
                      setReviewData({ ...reviewData, timeliness_rating: value })
                    )}
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <Label>Your Review</Label>
                  <Textarea
                    placeholder="Share details about your experience..."
                    rows={4}
                    value={reviewData.review_text}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, review_text: e.target.value })
                    }
                  />
                </div>

                {/* Would Work Again */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Would you work with them again?</Label>
                    <p className="text-sm text-muted-foreground">
                      This helps others understand your experience
                    </p>
                  </div>
                  <Switch
                    checked={reviewData.would_work_again}
                    onCheckedChange={(checked) =>
                      setReviewData({ ...reviewData, would_work_again: checked })
                    }
                  />
                </div>

                {/* Public Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Make review public</Label>
                    <p className="text-sm text-muted-foreground">
                      Public reviews are visible to everyone
                    </p>
                  </div>
                  <Switch
                    checked={reviewData.is_public}
                    onCheckedChange={(checked) =>
                      setReviewData({ ...reviewData, is_public: checked })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => submitReviewMutation.mutate(reviewData)}
                  disabled={submitReviewMutation.isPending || !reviewData.review_text}
                >
                  {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} currentUserId={user?.id} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Reviews Yet</h4>
            <p className="text-muted-foreground">
              Reviews will appear here once the project is completed
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewCard({ review, currentUserId }: { review: Review; currentUserId?: string }) {
  const isOwnReview = review.reviewer.id === currentUserId;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={review.reviewer.avatar_url} />
            <AvatarFallback>{review.reviewer.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold">{review.reviewer.full_name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.overall_rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {review.would_work_again && (
                  <Badge variant="secondary" className="gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    Would work again
                  </Badge>
                )}
                {isOwnReview && (
                  <Badge variant="outline">Your review</Badge>
                )}
              </div>
            </div>

            {/* Review Text */}
            <p className="text-muted-foreground mb-4">{review.review_text}</p>

            {/* Category Ratings */}
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Communication</p>
                <p className="font-medium">{review.communication_rating}/5</p>
              </div>
              <div>
                <p className="text-muted-foreground">Professionalism</p>
                <p className="font-medium">{review.professionalism_rating}/5</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quality</p>
                <p className="font-medium">{review.quality_rating}/5</p>
              </div>
              <div>
                <p className="text-muted-foreground">Timeliness</p>
                <p className="font-medium">{review.timeliness_rating}/5</p>
              </div>
            </div>

            {/* Response */}
            {review.response_text && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Response from {review.reviewee.full_name}</p>
                <p className="text-sm text-muted-foreground">{review.response_text}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
