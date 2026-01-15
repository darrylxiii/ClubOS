import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Brain,
    Save,
    RotateCcw,
    Edit2,
    Copy,
    Code,
    Search
} from "lucide-react";
import { SectionLoader } from "@/components/ui/unified-loader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

interface PromptTemplate {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    system_prompt: string;
    user_prompt_template: string | null;
    model: string;
    temperature: number;
    max_tokens: number | null;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
    metadata: Record<string, any>;
}

const AVAILABLE_MODELS = [
    { value: 'gpt-4o', label: 'GPT-4o (Best Quality)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
];

const PromptTemplateManager = () => {
    const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Form state for editing
    const [formData, setFormData] = useState<Partial<PromptTemplate>>({});

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('llm_prompt_templates')
                .select('*')
                .order('slug', { ascending: true });

            if (error) throw error;
            setPrompts((data as PromptTemplate[]) || []);
        } catch (error) {
            console.error('Error fetching prompts:', error);
            toast.error('Failed to load prompt templates');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (prompt: PromptTemplate) => {
        setSelectedPrompt(prompt);
        setFormData({
            name: prompt.name,
            description: prompt.description,
            system_prompt: prompt.system_prompt,
            user_prompt_template: prompt.user_prompt_template,
            model: prompt.model,
            temperature: prompt.temperature,
            max_tokens: prompt.max_tokens,
            is_active: prompt.is_active,
        });
        setEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedPrompt) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('llm_prompt_templates')
                .update({
                    name: formData.name,
                    description: formData.description,
                    system_prompt: formData.system_prompt,
                    user_prompt_template: formData.user_prompt_template,
                    model: formData.model,
                    temperature: formData.temperature,
                    max_tokens: formData.max_tokens,
                    is_active: formData.is_active,
                    version: selectedPrompt.version + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedPrompt.id);

            if (error) throw error;

            toast.success('Prompt template updated successfully');
            setEditDialogOpen(false);
            fetchPrompts();
        } catch (error) {
            console.error('Error saving prompt:', error);
            toast.error('Failed to save prompt template');
        } finally {
            setSaving(false);
        }
    };

    const handleDuplicate = async (prompt: PromptTemplate) => {
        try {
            const newSlug = `${prompt.slug}.copy`;
            const { error } = await supabase
                .from('llm_prompt_templates')
                .insert({
                    slug: newSlug,
                    name: `${prompt.name} (Copy)`,
                    description: prompt.description,
                    system_prompt: prompt.system_prompt,
                    user_prompt_template: prompt.user_prompt_template,
                    model: prompt.model,
                    temperature: prompt.temperature,
                    max_tokens: prompt.max_tokens,
                    is_active: false,
                    version: 1,
                });

            if (error) throw error;

            toast.success('Prompt duplicated. You can now edit the copy.');
            fetchPrompts();
        } catch (error) {
            console.error('Error duplicating prompt:', error);
            toast.error('Failed to duplicate prompt');
        }
    };

    const handleToggleActive = async (prompt: PromptTemplate) => {
        try {
            const { error } = await supabase
                .from('llm_prompt_templates')
                .update({ is_active: !prompt.is_active, updated_at: new Date().toISOString() })
                .eq('id', prompt.id);

            if (error) throw error;

            toast.success(`Prompt ${prompt.is_active ? 'deactivated' : 'activated'}`);
            fetchPrompts();
        } catch (error) {
            console.error('Error toggling prompt:', error);
            toast.error('Failed to update prompt status');
        }
    };

    const filteredPrompts = prompts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryFromSlug = (slug: string) => {
        const parts = slug.split('.');
        return parts[0] || 'general';
    };

    const groupedPrompts = filteredPrompts.reduce((acc, prompt) => {
        const category = getCategoryFromSlug(prompt.slug);
        if (!acc[category]) acc[category] = [];
        acc[category].push(prompt);
        return acc;
    }, {} as Record<string, PromptTemplate[]>);

    if (loading) {
        return <SectionLoader text="Loading prompt templates..." className="py-16" />;
    }

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Brain className="h-8 w-8" />
                    LLM Prompt Templates
                </h1>
                <p className="text-muted-foreground">
                    Manage and customize the AI prompts used across the recruitment engine.
                    Changes take effect immediately without code deployments.
                </p>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search prompts by name, slug, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" onClick={fetchPrompts}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Prompt Categories */}
            <div className="space-y-8">
                {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle className="capitalize">{category} Prompts</CardTitle>
                            <CardDescription>
                                {categoryPrompts.length} template(s) in this category
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {categoryPrompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    className={`p-4 border rounded-lg ${prompt.is_active ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : 'border-gray-200 bg-gray-50/50 dark:bg-gray-900/20'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{prompt.name}</h3>
                                                <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                                                    {prompt.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <Badge variant="outline">v{prompt.version}</Badge>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {prompt.model}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-mono">{prompt.slug}</p>
                                            {prompt.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(prompt)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(prompt)}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Switch
                                                checked={prompt.is_active}
                                                onCheckedChange={() => handleToggleActive(prompt)}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="bg-muted/50 rounded p-3 font-mono text-xs max-h-24 overflow-hidden relative">
                                        <pre className="whitespace-pre-wrap">{prompt.system_prompt.substring(0, 300)}...</pre>
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/80 to-transparent" />
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                        <span>Temperature: {prompt.temperature}</span>
                                        {prompt.max_tokens && <span>Max Tokens: {prompt.max_tokens}</span>}
                                        <span>Updated: {new Date(prompt.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="h-5 w-5" />
                            Edit Prompt Template
                        </DialogTitle>
                        <DialogDescription>
                            {selectedPrompt?.slug} (v{selectedPrompt?.version})
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-6 py-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Model</Label>
                                    <Select
                                        value={formData.model}
                                        onValueChange={(v) => setFormData({ ...formData, model: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_MODELS.map((m) => (
                                                <SelectItem key={m.value} value={m.value}>
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of what this prompt does..."
                                />
                            </div>

                            {/* Temperature */}
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Temperature</Label>
                                    <span className="text-sm font-mono">{formData.temperature}</span>
                                </div>
                                <Slider
                                    value={[formData.temperature || 0]}
                                    onValueChange={([v]) => setFormData({ ...formData, temperature: v })}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lower = more deterministic, Higher = more creative
                                </p>
                            </div>

                            <Separator />

                            {/* System Prompt */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    System Prompt
                                </Label>
                                <Textarea
                                    value={formData.system_prompt || ''}
                                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                                    rows={12}
                                    className="font-mono text-sm"
                                    placeholder="The system prompt that defines agent behavior..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {'{{variable}}'} syntax for dynamic values (e.g., {'{{candidate}}'}, {'{{config}}'})
                                </p>
                            </div>

                            {/* User Prompt Template */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    User Prompt Template (Optional)
                                </Label>
                                <Textarea
                                    value={formData.user_prompt_template || ''}
                                    onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
                                    rows={6}
                                    className="font-mono text-sm"
                                    placeholder="Optional user message template..."
                                />
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                <div>
                                    <Label>Active Status</Label>
                                    <p className="text-sm text-muted-foreground">
                                        When active, this prompt is used in production.
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                                />
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PromptTemplateManager;
