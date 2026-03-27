import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ClipboardList, Plus, Pencil, Trash2, Copy, MessageSquare, Target, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface InterviewKit {
  id: string;
  name: string;
  description: string;
  interview_stage: string;
  duration_minutes: number;
  questions: { text: string; category: string; scoring_guide: string }[];
  anti_bias_prompts: string[];
  is_template: boolean;
  created_at: string;
}

const STAGES = ["Phone Screen", "Technical", "Behavioral", "Culture Fit", "Final Round", "Hiring Manager", "Panel"];
const QUESTION_CATEGORIES = ["Technical", "Behavioral", "Situational", "Culture", "Experience", "Problem Solving"];

export default function InterviewKitBuilder() {
  const { t } = useTranslation('pages');
  const [kits, setKits] = useState<InterviewKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", interview_stage: "Phone Screen",
    duration_minutes: 60,
    questions: [{ text: "", category: "Behavioral", scoring_guide: "" }],
    anti_bias_prompts: ["Focus on skills and experience, not personal characteristics", "Use the same questions for all candidates in this stage"],
  });

  useEffect(() => { fetchKits(); }, []);

  const fetchKits = async () => {
    const { data } = await supabase.from("interview_kits").select("*").order("created_at", { ascending: false });
    if (data) setKits(data);
    setLoading(false);
  };

  const addQuestion = () => {
    setForm(p => ({ ...p, questions: [...p.questions, { text: "", category: "Behavioral", scoring_guide: "" }] }));
  };

  const updateQuestion = (idx: number, field: string, value: string) => {
    setForm(p => ({
      ...p,
      questions: p.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q),
    }));
  };

  const removeQuestion = (idx: number) => {
    setForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));
  };

  const saveKit = async () => {
    const { error } = await supabase.from("interview_kits").insert({
      name: form.name,
      description: form.description,
      interview_stage: form.interview_stage,
      duration_minutes: form.duration_minutes,
      questions: form.questions.filter(q => q.text),
      anti_bias_prompts: form.anti_bias_prompts,
      is_template: true,
    });
    if (!error) {
      toast.success(t('toast.interviewKitCreated', 'Interview kit created'));
      setDialogOpen(false);
      fetchKits();
    }
  };

  const duplicateKit = async (kit: InterviewKit) => {
    await supabase.from("interview_kits").insert({
      name: `${kit.name} (Copy)`,
      description: kit.description,
      interview_stage: kit.interview_stage,
      duration_minutes: kit.duration_minutes,
      questions: kit.questions,
      anti_bias_prompts: kit.anti_bias_prompts,
      is_template: true,
    });
    toast.success(t('toast.kitDuplicated', 'Kit duplicated'));
    fetchKits();
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('interviewKitBuilder', 'INTERVIEW KIT BUILDER')}</h1>
            </div>
            <p className="text-muted-foreground">{t('createStructuredInterviewKitsWith', 'Create structured interview kits with questions, rubrics, and anti-bias guidelines')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('createKit', 'Create Kit')}</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('newInterviewKit', 'New Interview Kit')}</DialogTitle>
                <DialogDescription>{t('defineQuestionsScoringRubricsAnd', 'Define questions, scoring rubrics, and interviewer guidelines')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>{t('kitName', 'Kit Name')}</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('placeholder.seniorEngineerTechnicalRound', 'Senior Engineer - Technical Round')} /></div>
                  <div>
                    <Label>{t('interviewStage', 'Interview Stage')}</Label>
                    <Select value={form.interview_stage} onValueChange={v => setForm(p => ({...p, interview_stage: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>{t("description", "Description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
                <div><Label>{t("duration_minutes", "Duration (minutes)")}</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({...p, duration_minutes: parseInt(e.target.value) || 60}))} className="w-32" /></div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" />Questions ({form.questions.length})</h3>
                    <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" />{t('addQuestion', 'Add Question')}</Button>
                  </div>
                  {form.questions.map((q, i) => (
                    <div key={i} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Question {i + 1}</span>
                        <div className="flex gap-2">
                          <Select value={q.category} onValueChange={v => updateQuestion(i, "category", v)}>
                            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{QUESTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                          {form.questions.length > 1 && (
                            <Button size="sm" variant="ghost" onClick={() => removeQuestion(i)}><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </div>
                      <Input value={q.text} onChange={e => updateQuestion(i, "text", e.target.value)} placeholder={t('placeholder.tellMeAboutATime', 'Tell me about a time when...')} />
                      <Input value={q.scoring_guide} onChange={e => updateQuestion(i, "scoring_guide", e.target.value)} placeholder={t('placeholder.scoringGuideLookForSpecific', 'Scoring guide: Look for specific examples of...')} className="text-sm" />
                    </div>
                  ))}
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" />{t('antibiasPrompts', 'Anti-Bias Prompts')}</h3>
                  {form.anti_bias_prompts.map((prompt, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-amber-50 dark:bg-amber-950/20 rounded">
                      <span className="text-amber-600">!</span>
                      <span>{prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter><Button onClick={saveKit} disabled={!form.name || form.questions.every(q => !q.text)}>{t('saveKit', 'Save Kit')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>{t('totalKits', 'Total Kits')}</CardDescription><CardTitle className="text-2xl">{kits.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t("templates", "Templates")}</CardDescription><CardTitle className="text-2xl">{kits.filter(k => k.is_template).length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>{t('totalQuestions', 'Total Questions')}</CardDescription><CardTitle className="text-2xl">{kits.reduce((a, k) => a + (k.questions?.length || 0), 0)}</CardTitle></CardHeader></Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('kitName1', 'Kit Name')}</TableHead>
                  <TableHead>{t("stage", "Stage")}</TableHead>
                  <TableHead>{t("questions", "Questions")}</TableHead>
                  <TableHead>{t("duration", "Duration")}</TableHead>
                  <TableHead>{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kits.map(kit => (
                  <TableRow key={kit.id}>
                    <TableCell><div><span className="font-medium">{kit.name}</span><br /><span className="text-xs text-muted-foreground">{kit.description}</span></div></TableCell>
                    <TableCell><Badge variant="outline">{kit.interview_stage}</Badge></TableCell>
                    <TableCell>{kit.questions?.length || 0} questions</TableCell>
                    <TableCell className="flex items-center gap-1"><Clock className="h-3 w-3" />{kit.duration_minutes}m</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => duplicateKit(kit)}><Copy className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost"><Pencil className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {kits.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('noInterviewKitsYetCreate', 'No interview kits yet. Create your first structured interview kit.')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
