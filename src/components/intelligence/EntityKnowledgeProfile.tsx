import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Brain, Sparkles, MessageSquare, Save, Plus, X } from "lucide-react";

interface KnowledgeProfile {
    id: string;
    voice_tone: string;
    voice_examples: string[];
    keywords_to_include: string[];
    keywords_to_avoid: string[];
    custom_instructions: string;
    knowledge_sources: {
        use_website: boolean;
        use_uploaded_docs: boolean;
        use_past_comms: boolean;
    };
}

interface EntityKnowledgeProfileProps {
    entityId: string;
    entityType: 'company' | 'user' | 'job';
    title?: string;
    description?: string;
}

export const EntityKnowledgeProfile = ({
    entityId,
    entityType,
    title = "Brain Configuration",
    description = "Configure the AI knowledge and voice for this context."
}: EntityKnowledgeProfileProps) => {
    const [profile, setProfile] = useState<KnowledgeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Local state for edits
    const [voiceTone, setVoiceTone] = useState("");
    const [instructions, setInstructions] = useState("");
    const [newKeyword, setNewKeyword] = useState("");
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newExample, setNewExample] = useState("");
    const [examples, setExamples] = useState<string[]>([]);

    useEffect(() => {
        loadProfile();
    }, [entityId, entityType]);

    const loadProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('knowledge_profiles' as any)
                .select('*')
                .eq('entity_id', entityId)
                .eq('entity_type', entityType)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const profileData = data as any;
                setProfile(profileData);
                setVoiceTone(profileData.voice_tone || "");
                setInstructions(profileData.custom_instructions || "");
                setKeywords(profileData.keywords_to_include || []);
                setExamples(profileData.voice_examples as string[] || []);
            }
        } catch (error) {
            console.error("Error loading knowledge profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            const payload = {
                entity_id: entityId,
                entity_type: entityType,
                voice_tone: voiceTone,
                custom_instructions: instructions,
                keywords_to_include: keywords,
                voice_examples: examples,
                knowledge_sources: {
                    use_website: true,
                    use_uploaded_docs: true,
                    use_past_comms: true
                }
            };

            const { error } = await supabase
                .from('knowledge_profiles' as any)
                .upsert(payload as any, { onConflict: 'entity_type,entity_id' });

            if (error) throw error;

            toast.success("Knowledge Profile updated successfully!");
            loadProfile();
        } catch (error: any) {
            console.error("Error saving profile:", error);
            toast.error("Failed to save profile: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addKeyword = () => {
        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
            setKeywords([...keywords, newKeyword.trim()]);
            setNewKeyword("");
        }
    };

    const removeKeyword = (kw: string) => {
        setKeywords(keywords.filter(k => k !== kw));
    };

    const addExample = () => {
        if (newExample.trim()) {
            setExamples([...examples, newExample.trim()]);
            setNewExample("");
        }
    };

    const removeExample = (idx: number) => {
        setExamples(examples.filter((_, i) => i !== idx));
    };

    if (loading) return <div>Loading Intelligence Configuration...</div>;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Voice & Tone Column */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Voice & Style
                        </CardTitle>
                        <CardDescription>
                            {entityType === 'user' ? "How should the AI speak when pretending to be you?" : "Define the specific tone for this context."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tone Descriptor</Label>
                            <Input
                                placeholder={entityType === 'user' ? "e.g. Helpful, Direct, Casual" : "e.g. Professional, Witty"}
                                value={voiceTone}
                                onChange={(e) => setVoiceTone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Voice Examples</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a sample sentence..."
                                    value={newExample}
                                    onChange={(e) => setNewExample(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addExample()}
                                />
                                <Button onClick={addExample} size="icon" variant="secondary"><Plus className="w-4 h-4" /></Button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {examples.map((ex, i) => (
                                    <div key={i} className="flex items-start justify-between bg-muted/50 p-2 rounded text-sm">
                                        <span className="italic">"{ex}"</span>
                                        <Button size="icon" variant="ghost" className="h-5 w-5 ml-2" onClick={() => removeExample(i)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            Key Vocabulary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Keywords to Include</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add keyword..."
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                />
                                <Button onClick={addKeyword} size="icon" variant="secondary"><Plus className="w-4 h-4" /></Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {keywords.map(kw => (
                                    <Badge key={kw} variant="secondary" className="gap-1 px-3 py-1">
                                        {kw}
                                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeKeyword(kw)} />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Brain Configuration Column */}
            <div className="space-y-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-blue-500" />
                            {title}
                        </CardTitle>
                        <CardDescription>
                            {description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Custom Instructions</Label>
                            <Textarea
                                className="min-h-[200px]"
                                placeholder="E.g. Always include my Calendly link. Be concise. Never apologize."
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                These instructions will be injected into the system prompt for queries with this context.
                            </p>
                        </div>

                        <div className="pt-4 border-t">
                            <Label className="mb-4 block">Knowledge Sources (Read-Only Alpha)</Label>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Indexed Content</span>
                                    <Switch checked={true} disabled />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-6 pt-0 mt-auto">
                        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
                            Save {entityType === 'user' ? 'My Persona' : 'Profile'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
