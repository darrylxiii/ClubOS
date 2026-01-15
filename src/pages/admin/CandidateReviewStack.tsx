import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, BrainCircuit, ArrowLeft } from "lucide-react";
import { SectionLoader, InlineLoader } from "@/components/ui/unified-loader";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface Candidate {
    id: string;
    first_name: string;
    last_name: string;
    headline: string;
    bio: string;
    skills: string[];
    total_score: number;
    tier_2_analysis: any;
    core_dna: any;
}

const REJECTION_REASONS = [
    { value: "culture_risk", label: "Culture Risk" },
    { value: "experience_mismatch", label: "Experience Mismatch" },
    { value: "salary_mismatch", label: "Salary Expectations Too High" },
    { value: "location_mismatch", label: "Location Mismatch" },
    { value: "skills_gap", label: "Technical Skills Gap" },
    { value: "overqualified", label: "Overqualified" },
    { value: "underqualified", label: "Underqualified" },
    { value: "job_hopper", label: "Job Hopper" },
    { value: "other", label: "Other" },
];

const CandidateReviewStack = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [optimizing, setOptimizing] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

    useEffect(() => {
        if (jobId) fetchCandidates();
    }, [jobId]);

    const fetchCandidates = async () => {
        try {
            const { data: config, error: configError } = await supabase
                .from('recruitment_project_configs')
                .select('id')
                .eq('job_id', jobId)
                .eq('is_active', true)
                .single();

            if (configError || !config) {
                toast.error('No active config found. Please calibrate this job first.');
                setLoading(false);
                return;
            }
            setConfigId(config.id);

            const { data, error } = await supabase
                .from('recruitment_candidate_scores')
                .select('*, candidate:candidate_id(*)')
                .eq('project_config_id', config.id)
                .not('tier_2_analysis', 'is', null)
                .is('human_feedback', null);

            if (error) {
                console.error('Error fetching candidates:', error);
                toast.error('Failed to load candidates');
            }

            const mapped = (data || []).map((score: any) => ({
                ...score.candidate,
                total_score: score.total_score,
                tier_2_analysis: score.tier_2_analysis,
                score_id: score.id
            }));

            setCandidates(mapped);
        } catch (err) {
            console.error('Unexpected error:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = async (direction: 'left' | 'right', reason?: string) => {
        const candidate = candidates[currentIndex];
        if (!candidate) return;

        if (direction === 'left' && !reason) {
            setShowRejectDialog(true);
            return;
        }

        // Trigger animation
        setSwipeDirection(direction);
        setShowRejectDialog(false);

        // Wait for animation to complete
        setTimeout(async () => {
            setCurrentIndex(prev => prev + 1);
            setSwipeDirection(null);

            const feedback = direction === 'right' ? 'approve' : 'reject';
            const updatePayload: any = {
                human_feedback: feedback,
                updated_at: new Date().toISOString()
            };

            if (direction === 'left' && reason) {
                updatePayload.rejection_reason_tag = reason;
            }

            try {
                await supabase
                    .from('recruitment_candidate_scores')
                    .update(updatePayload)
                    .eq('candidate_id', candidate.id)
                    .eq('project_config_id', configId);



                toast.success(direction === 'right' ? "Candidate Shortlisted ✨" : "Candidate Rejected");
            } catch (error) {
                console.error('Error saving feedback:', error);
                toast.error('Failed to save feedback');
            }
        }, 300);
    };

    const handleOptimize = async () => {
        if (!configId) return;
        setOptimizing(true);
        try {
            const { data, error } = await supabase.functions.invoke('optimize-weights', {
                body: { project_config_id: configId }
            });

            if (error) throw error;

            if (data.version) {
                toast.success(`System Optimized! New logic v${data.version} active.`);
                navigate(0);
            } else {
                toast.info(data.message || "No optimization needed yet.");
            }
        } catch (error) {
            console.error('Optimization error:', error);
            toast.error('Optimization failed');
        } finally {
            setOptimizing(false);
        }
    };

    if (loading) return <SectionLoader text="Loading candidates..." />;

    const currentCandidate = candidates[currentIndex];

    const cardVariants = {
        initial: { opacity: 1, x: 0, rotate: 0 },
        swipeLeft: {
            opacity: 0,
            x: -300,
            rotate: -15,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        swipeRight: {
            opacity: 0,
            x: 300,
            rotate: 15,
            transition: { duration: 0.3, ease: "easeOut" }
        }
    };

    return (
        <div className="container mx-auto py-8 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {candidates.length - currentIndex} to review
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOptimize}
                        disabled={optimizing}
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    >
                        {optimizing ? <InlineLoader text="Optimizing..." /> : <><BrainCircuit className="h-4 w-4 mr-2" /> Optimize Logic</>}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative bg-muted/20 rounded-xl overflow-hidden">
                {!currentCandidate ? (
                    <div className="text-center">
                        <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold">All caught up!</h3>
                        <p className="text-muted-foreground mb-6">No more candidates to review.</p>
                        <Button onClick={() => navigate(-1)}>Return to Dashboard</Button>
                    </div>
                ) : (
                    <div className="relative w-full max-w-2xl h-[600px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentCandidate.id}
                                variants={cardVariants}
                                initial="initial"
                                animate={
                                    swipeDirection === 'left' ? 'swipeLeft' :
                                        swipeDirection === 'right' ? 'swipeRight' : 'initial'
                                }
                                className="absolute inset-0"
                            >
                                <Card className="h-full shadow-xl border-2 overflow-hidden flex flex-col">
                                    <CardContent className="p-6 flex-1 overflow-y-auto">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h2 className="text-2xl font-bold">{currentCandidate.first_name} {currentCandidate.last_name}</h2>
                                                <p className="text-muted-foreground">{currentCandidate.headline}</p>
                                            </div>
                                            <Badge variant={currentCandidate.total_score > 80 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                                                {Math.round(currentCandidate.total_score)}% Match
                                            </Badge>
                                        </div>

                                        <div className="space-y-6">
                                            {currentCandidate.core_dna && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1 border">
                                                    <div className="font-semibold text-slate-500 uppercase tracking-wider">Core DNA Analysis</div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="text-muted-foreground">Type: </span>
                                                            <span className="font-medium">{currentCandidate.core_dna.builder_type > 50 ? 'Builder 🔨' : 'Operator ⚙️'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Level: </span>
                                                            <span className="font-medium capitalize">{currentCandidate.core_dna.seniority_curve}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="font-semibold mb-2">Key Evidence</h4>
                                                <ul className="space-y-2 text-sm">
                                                    {Object.entries(currentCandidate.tier_2_analysis?.evidence || {}).map(([key, value]: any) => (
                                                        <li key={key} className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-900">
                                                            <span className="font-medium capitalize">{key.replace('_', ' ')}:</span> {value.quotes?.[0] || "No quote extracted"}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold mb-2">Summary</h4>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentCandidate.bio}</p>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t flex justify-between gap-4">
                                        <Button
                                            variant="destructive"
                                            size="lg"
                                            className="flex-1"
                                            onClick={() => handleSwipe('left')}
                                        >
                                            <X className="h-6 w-6 mr-2" /> Reject
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="lg"
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => handleSwipe('right')}
                                        >
                                            <Check className="h-6 w-6 mr-2" /> Shortlist
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Why are you rejecting this candidate?</DialogTitle>
                        <DialogDescription>
                            This helps the system learn to make better recommendations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2 mt-4">
                        {REJECTION_REASONS.map((reason) => (
                            <Button
                                key={reason.value}
                                variant="outline"
                                className="justify-start h-auto py-3"
                                onClick={() => handleSwipe('left', reason.value)}
                            >
                                {reason.label}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CandidateReviewStack;
