import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ThumbsDown, Loader2, CheckCircle2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Candidate {
    id: string;
    first_name: string;
    last_name: string;
    headline: string;
    bio: string;
    skills: string[];
    location: string;
    total_score: number;
    analysis: any;
    is_blind?: boolean;
}

const ClientCandidateView = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ job_title: string; candidates: Candidate[]; is_blind: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [feedbackType, setFeedbackType] = useState<'interested' | 'rejected' | 'interview_request' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (token) fetchPresentation();
    }, [token]);

    const fetchPresentation = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('client-presentation', {
                body: { action: 'get', token }
            });

            if (error || data.error) throw new Error(data.error || 'Failed to load presentation');
            setData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = (candidate: Candidate, type: 'interested' | 'rejected' | 'interview_request') => {
        setSelectedCandidate(candidate);
        setFeedbackType(type);
        setFeedbackComment("");
    };

    const submitVote = async () => {
        if (!selectedCandidate || !feedbackType) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.functions.invoke('client-presentation', {
                body: {
                    action: 'vote',
                    token,
                    candidate_id: selectedCandidate.id,
                    status: feedbackType,
                    comment: feedbackComment
                }
            });

            if (error) throw error;
            toast.success("Feedback sent! Thank you.");
            setSelectedCandidate(null);
            setFeedbackType(null);
        } catch (error) {
            toast.error("Failed to send feedback");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-muted-foreground">{error || "This link may have expired."}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Reviewing Candidates For</div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{data.job_title}</h1>
                    </div>
                    <div className="hidden md:block text-right">
                        <Badge variant="outline" className="text-xs">
                            {data.candidates.length} Candidates
                        </Badge>
                        {data.is_blind && <Badge variant="secondary" className="ml-2 text-xs">Blind Mode</Badge>}
                    </div>
                </div>
            </div>

            {/* Candidate List */}
            <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                {data.candidates.map((candidate) => (
                    <Card key={candidate.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                        <CardHeader className="bg-white dark:bg-slate-800 pb-4 border-b">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                        {candidate.first_name[0]}{candidate.last_name[0]}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">
                                            {candidate.first_name} {candidate.last_name}
                                        </CardTitle>
                                        <p className="text-muted-foreground font-medium">{candidate.headline}</p>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                {Math.round(candidate.total_score)}% Match
                                            </Badge>
                                            {candidate.location && <Badge variant="outline">{candidate.location}</Badge>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-wrap">
                                {candidate.bio}
                            </div>

                            {candidate.skills && candidate.skills.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Key Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {candidate.skills.slice(0, 8).map(skill => (
                                            <Badge key={skill} variant="secondary" className="bg-white border">{skill}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {candidate.analysis?.evidence && (
                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
                                    <h4 className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300 mb-2">Why we like them</h4>
                                    <ul className="list-disc pl-4 text-sm space-y-1 text-slate-700 dark:text-slate-300">
                                        {Object.entries(candidate.analysis.evidence).slice(0, 3).map(([k, v]: any) => (
                                            <li key={k}>{v.quotes?.[0] || v.reasoning || "Strong match"}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-2">
                                <Button
                                    variant="outline"
                                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    onClick={() => handleVote(candidate, 'rejected')}
                                >
                                    <ThumbsDown className="h-4 w-4 mr-2" />
                                    Pass
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => handleVote(candidate, 'interview_request')}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Request Interview
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </main>

            {/* Feedback Dialog */}
            <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {feedbackType === 'interview_request' ? "Great! Let's book it." : "Feedback (Optional)"}
                        </DialogTitle>
                        <DialogDescription>
                            Leaving a comment helps us refine our search for you.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder={feedbackType === 'interview_request' ? "Any preference on times? (e.g. Wednesday afternoon)" : "What was missing? (e.g. Needs more React experience)"}
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedCandidate(null)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={submitVote} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Submit Feedback
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientCandidateView;
