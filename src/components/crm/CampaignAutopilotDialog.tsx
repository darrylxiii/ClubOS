import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { aiService } from '@/services/aiService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Wand2, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CampaignAutopilotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CampaignAutopilotDialog({
    open,
    onOpenChange,
    onSuccess,
}: CampaignAutopilotDialogProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'input' | 'processing'>('input');
    const [formData, setFormData] = useState({
        goal: '',
        target_audience: '',
        industry: '',
    });
    const navigate = useNavigate();

    const handleGenerate = async () => {
        if (!formData.goal || !formData.target_audience) {
            toast.error('Please enter a goal and target audience');
            return;
        }

        setLoading(true);
        setStep('processing');

        try {
            // 1. Generate Campaign Structure via AI
            const result = await aiService.generateCampaignAutopilot(
                formData.goal,
                formData.target_audience,
                formData.industry
            );

            // The response properties are at the root level, not nested in 'campaign'
            if (!result?.campaign_name) {
                throw new Error('Failed to generate campaign structure');
            }

            const campaignData = result;

            // 2. Create Draft Campaign in DB
            const { data: { user } } = await supabase.auth.getUser();

            const { data: newCampaign, error: dbError } = await supabase
                .from('crm_campaigns')
                .insert({
                    name: campaignData.name,
                    description: campaignData.description,
                    status: 'draft',
                    source: 'ai_autopilot',
                    owner_id: user?.id,
                    target_audience: campaignData.target_audience, // JSONB
                    config: campaignData.config, // JSONB
                    metrics: {
                        sent: 0,
                        opens: 0,
                        replies: 0,
                        bounces: 0,
                        reply_rate: 0,
                        open_rate: 0,
                        prospects: 0
                    },
                    metadata: {
                        generated_steps: campaignData.steps, // Store generated steps in metadata for now, or unified field
                        original_prompt: formData
                    }
                })
                .select()
                .single();

            if (dbError) throw dbError;

            toast.success('Campaign generated successfully!');
            onOpenChange(false);
            onSuccess?.();

            // Navigate to campaign detail or list? 
            // For now, staying on list but could navigate: navigate(\`/crm/campaigns/${newCampaign.id}\`);

        } catch (error) {
            console.error('Autopilot error:', error);
            toast.error('Failed to generate campaign. Please try again.');
            setStep('input');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-500/30 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                        Campaign Auto-Pilot
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Describe your goal, and our AI will design a complete high-converting campaign for you.
                    </DialogDescription>
                </DialogHeader>

                {step === 'input' ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="goal" className="text-indigo-200">Campaign Goal</Label>
                            <Textarea
                                id="goal"
                                placeholder="e.g. Book 10 meetings with Fintech founders for an SEO audit..."
                                className="bg-slate-800/50 border-indigo-500/30 min-h-[80px] text-white placeholder:text-slate-500"
                                value={formData.goal}
                                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="target" className="text-indigo-200">Target Audience</Label>
                                <Input
                                    id="target"
                                    placeholder="e.g. CTOs, Founders"
                                    className="bg-slate-800/50 border-indigo-500/30 text-white placeholder:text-slate-500"
                                    value={formData.target_audience}
                                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry" className="text-indigo-200">Industry (Optional)</Label>
                                <Input
                                    id="industry"
                                    placeholder="e.g. Fintech, SaaS"
                                    className="bg-slate-800/50 border-indigo-500/30 text-white placeholder:text-slate-500"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                            <Wand2 className="w-12 h-12 text-indigo-400 animate-bounce relative z-10" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium text-white">Designing Campaign Strategy...</h3>
                            <p className="text-sm text-slate-400">Analyzing market trends • Writing copy • Configuring sequences</p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'input' && (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/10">
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                                <Rocket className="w-4 h-4" />
                                Launch Auto-Pilot
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
