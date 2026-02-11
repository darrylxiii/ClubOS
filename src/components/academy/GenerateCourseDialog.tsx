import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, BookOpen, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";

interface GenerateCourseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    academyId?: string;
    onSuccess: () => void;
}

export function GenerateCourseDialog({ open, onOpenChange, academyId, onSuccess }: GenerateCourseDialogProps) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedCourse, setGeneratedCourse] = useState<any>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('ai-course-generator', {
                body: {
                    action: 'generate_course',
                    prompt: prompt
                }
            });

            if (error) throw error;

            const courseData = JSON.parse(data.content);
            setGeneratedCourse(courseData);
            setStep('preview');
        } catch (error: unknown) {
            notify.error("Generation failed", { description: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!user || !generatedCourse) return;

        setLoading(true);
        try {
            // 1. Create Course
            const slug = generatedCourse.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            const { data: course, error: courseError } = await supabase
                .from("courses")
                .insert({
                    title: generatedCourse.title,
                    slug: `${slug}-${Date.now()}`, // Ensure uniqueness
                    description: generatedCourse.description,
                    difficulty_level: generatedCourse.difficulty_level,
                    estimated_hours: generatedCourse.estimated_hours,
                    academy_id: academyId,
                    created_by: user.id,
                    is_published: false
                })
                .select()
                .single();

            if (courseError) throw courseError;

            // 2. Create Modules
            if (generatedCourse.modules && generatedCourse.modules.length > 0) {
                const modulesToInsert = generatedCourse.modules.map((mod: any, index: number) => ({
                    course_id: course.id,
                    title: mod.title,
                    description: mod.description,
                    display_order: index,
                    content: "", // Empty content initially
                }));

                const { error: modulesError } = await supabase
                    .from("modules")
                    .insert(modulesToInsert);

                if (modulesError) throw modulesError;
            }

            notify.success("Course created!", { description: "Your AI-generated course is ready to edit." });

            onSuccess();
            onOpenChange(false);
            navigate(`/courses/${course.slug}/edit`);

        } catch (error: unknown) {
            notify.error("Creation failed", { description: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('input');
        setGeneratedCourse(null);
        setPrompt("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Course Generator
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'input'
                            ? "Describe what you want to teach, and AI will design a course structure for you."
                            : "Review the generated course structure. You can edit details later."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                    {step === 'input' ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="prompt">What is the topic of your course?</Label>
                                <Textarea
                                    id="prompt"
                                    placeholder="e.g., A comprehensive guide to digital marketing for beginners, covering SEO, social media, and email marketing."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={6}
                                    className="resize-none"
                                />
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                                <p className="font-medium mb-2">Tips for best results:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Be specific about the target audience (e.g., "for beginners")</li>
                                    <li>Mention key topics you want to cover</li>
                                    <li>Specify the desired tone (e.g., "professional", "casual")</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">{generatedCourse.title}</h3>
                                <p className="text-sm text-muted-foreground">{generatedCourse.description}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                                    <span className="bg-secondary px-2 py-1 rounded-full capitalize">
                                        {generatedCourse.difficulty_level}
                                    </span>
                                    <span className="bg-secondary px-2 py-1 rounded-full">
                                        {generatedCourse.estimated_hours} hours
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Modules</h4>
                                {generatedCourse.modules.map((mod: any, i: number) => (
                                    <div key={i} className="p-3 border rounded-lg bg-card">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            <p className="font-medium">{mod.title}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground pl-9">{mod.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === 'input' ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Structure
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={reset} disabled={loading}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                            <Button onClick={handleCreate} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Create Course
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
