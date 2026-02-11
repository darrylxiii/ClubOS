
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, FileText, Mic, Video, Loader2, Building2, Calendar, Target, Briefcase } from 'lucide-react';
import { useExternalImports } from '@/hooks/useExternalImports';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UniversalIdentitySearch, IdentityResult } from './UniversalIdentitySearch';

interface UnifiedImportDialogProps {
    children?: React.ReactNode;
    defaultEntityId?: string;
    defaultEntityType?: string;
}

export function UnifiedImportDialog({ children, defaultEntityId, defaultEntityType }: UnifiedImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('file');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { uploadImport } = useExternalImports();

    // Form State
    const [title, setTitle] = useState('');
    const [selectedIdentity, setSelectedIdentity] = useState<IdentityResult | null>(null);
    const [sourcePlatform, setSourcePlatform] = useState('zoom');
    const [textContent, setTextContent] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Context Contextual State
    const [jobId, setJobId] = useState<string>('');
    const [companyId, setCompanyId] = useState<string>('');
    const [meetingId, setMeetingId] = useState<string>('');

    // Data Fetching State
    const [jobs, setJobs] = useState<{ id: string, title: string }[]>([]);
    const [companies, setCompanies] = useState<{ id: string, name: string }[]>([]);
    const [meetings, setMeetings] = useState<{ id: string, title: string, scheduled_at: string }[]>([]);

    // Fetch Reference Data on mount
    React.useEffect(() => {
        // Jobs
        supabase.from('jobs').select('id, title').eq('status', 'open').then(({ data }) => { if (data) setJobs(data); });
        // Companies
        supabase.from('companies').select('id, name').limit(20).then(({ data }) => { if (data) setCompanies(data); });
        // Recent Meetings
        supabase.from('meetings').select('id, title, scheduled_start').order('scheduled_start', { ascending: false }).limit(10).then(({ data }) => { if (data) setMeetings(data.map(m => ({ id: m.id, title: m.title, scheduled_at: m.scheduled_start }))); });
    }, []);

    const handleSubmit = async () => {
        if (!title) {
            toast.error('Please enter a title');
            return;
        }
        if (!selectedIdentity) {
            toast.error('Please select an identity (Person)');
            return;
        }

        if (activeTab === 'file' && !file) {
            toast.error('Please select a file');
            return;
        }

        if (activeTab === 'text' && !textContent) {
            toast.error('Please enter text content');
            return;
        }

        try {
            setIsSubmitting(true);

            let finalEntityId = selectedIdentity.id;
            let finalEntityType = selectedIdentity.type;

            // Handle Shadow Profile Creation
            if (selectedIdentity.id === 'NEW') {
                const { data, error } = await supabase
                    .from('crm_prospects')
                    .insert({
                        full_name: selectedIdentity.name,
                        source: 'import_shadow',
                        email: `${selectedIdentity.name.toLowerCase().replace(/\s+/g, '.')}@shadow.qc`, // Placeholder email
                        stage: 'new'
                    })
                    .select()
                    .single();

                if (error) throw error;
                finalEntityId = data.id;
                finalEntityType = 'prospect';
            }

            let contentType = 'other';
            if (activeTab === 'file') {
                if (file?.type.startsWith('audio/')) contentType = 'call_recording';
                else if (file?.type.startsWith('video/')) contentType = 'call_recording';
                else contentType = 'meeting_notes';
            } else {
                contentType = 'meeting_notes';
            }

            await uploadImport(file, {
                title,
                contentType,
                entityType: finalEntityType,
                entityId: finalEntityId,
                sourcePlatform,
                rawContent: activeTab === 'text' ? textContent : undefined,
                secondaryEntityType: jobId ? 'job' : (companyId ? 'company' : undefined),
                secondaryEntityId: jobId || companyId || undefined,
                metadata: {
                    linked_meeting_id: meetingId || undefined,
                    linked_company_id: companyId || undefined,
                    linked_job_id: jobId || undefined,
                    is_shadow: selectedIdentity.id === 'NEW'
                }
            });

            setOpen(false);
            resetForm();
            toast.success('Communication imported successfully');
        } catch (error: unknown) {
            toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setTextContent('');
        setFile(null);
        setJobId('');
        setCompanyId('');
        setMeetingId('');
        setSelectedIdentity(null);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="gap-2">
                        <UploadCloud className="h-4 w-4" />
                        Import External
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import External Communication</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Part 1: Identity & Subject */}
                    <div className="space-y-4 border-b pb-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">1. Participant (Identity)</Label>
                            < UniversalIdentitySearch onSelect={setSelectedIdentity} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title / Subject</Label>
                                <Input
                                    placeholder="E.g. Initial Screening Call"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Source Platform</Label>
                                <Select value={sourcePlatform} onValueChange={setSourcePlatform}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="zoom">Zoom</SelectItem>
                                        <SelectItem value="google_meet">Google Meet</SelectItem>
                                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                                        <SelectItem value="phone">Phone Call</SelectItem>
                                        <SelectItem value="whatsapp">WhatsApp Export</SelectItem>
                                        <SelectItem value="in_person">In Person</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Part 2: Context Linking */}
                    <div className="space-y-4 border-b pb-6 bg-muted/30 p-4 rounded-lg">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Target className="h-4 w-4" /> 2. Multi-Context Linking (Optional)
                        </Label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Company</Label>
                                <Select value={companyId} onValueChange={setCompanyId}>
                                    <SelectTrigger><SelectValue placeholder="Link Company" /></SelectTrigger>
                                    <SelectContent>
                                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Job</Label>
                                <Select value={jobId} onValueChange={setJobId}>
                                    <SelectTrigger><SelectValue placeholder="Link Job" /></SelectTrigger>
                                    <SelectContent>
                                        {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Meeting</Label>
                                <Select value={meetingId} onValueChange={setMeetingId}>
                                    <SelectTrigger><SelectValue placeholder="Link Meeting" /></SelectTrigger>
                                    <SelectContent>
                                        {meetings.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.title} ({new Date(m.scheduled_at).toLocaleDateString()})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Part 3: Content */}
                    <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="file">File Upload (Audio/Transcript)</TabsTrigger>
                            <TabsTrigger value="text">Paste Text</TabsTrigger>
                        </TabsList>

                        <TabsContent value="file" className="space-y-4 pt-4">
                            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-muted/50 transition-colors">
                                <div className="flex justify-center gap-4">
                                    <Mic className="h-8 w-8 text-muted-foreground" />
                                    <Video className="h-8 w-8 text-muted-foreground" />
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                                        Select File
                                    </Button>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        accept=".mp3,.mp4,.wav,.m4a,.txt,.vtt,.srt,.md"
                                    />
                                </div>
                                {file && (
                                    <div className="text-sm font-medium text-emerald-500 bg-emerald-500/10 py-1 px-3 rounded-full inline-block">
                                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="text" className="pt-4">
                            <Textarea
                                placeholder="Paste transcript, meeting notes, or message content here..."
                                className="min-h-[150px] font-mono text-xs"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                            />
                        </TabsContent>
                    </Tabs>

                    <Button className="w-full h-12 text-lg font-bold" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {isSubmitting ? 'Processing Identity & Content...' : 'Verify & Import Communications'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
