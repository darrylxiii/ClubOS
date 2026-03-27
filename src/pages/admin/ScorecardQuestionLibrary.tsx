import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import { ClipboardList, Plus, Search, Trash2, Tag, BarChart3, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface ScorecardQuestion {
  id: string;
  question_text: string;
  question_type: string;
  competency: string;
  difficulty: string;
  scoring_criteria: string;
  tags: string[];
  usage_count: number;
  created_at: string;
}

const QUESTION_TYPES = ["behavioral", "technical", "situational", "culture_fit", "leadership"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const COMPETENCIES = ["communication", "problem_solving", "teamwork", "leadership", "technical", "adaptability", "creativity", "time_management"];

const emptyForm = {
  question_text: "", question_type: "behavioral", competency: "communication",
  difficulty: "medium", scoring_criteria: "", tags: "",
};

export default function ScorecardQuestionLibrary() {
  const [questions, setQuestions] = useState<ScorecardQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ScorecardQuestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [competencyFilter, setCompetencyFilter] = useState("all");
  const [form, setForm] = useState({ ...emptyForm });

  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
  const { t } = useTranslation('pages');
    setLoading(true);
    const { data } = await supabase.from("scorecard_question_library").select("*").order("usage_count", { ascending: false });
    if (data) setQuestions(data);
    setLoading(false);
  };

  const resetFormAndClose = () => {
    setForm({ ...emptyForm });
    setEditingQuestion(null);
    setDialogOpen(false);
  };

  const openCreateDialog = () => {
    setEditingQuestion(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEditDialog = (q: ScorecardQuestion) => {
    setEditingQuestion(q);
    setForm({
      question_text: q.question_text || "",
      question_type: q.question_type || "behavioral",
      competency: q.competency || "communication",
      difficulty: q.difficulty || "medium",
      scoring_criteria: q.scoring_criteria || "",
      tags: (q.tags || []).join(", "),
    });
    setDialogOpen(true);
  };

  const saveQuestion = async () => {
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);

    if (editingQuestion) {
      const { error } = await supabase.from("scorecard_question_library").update({
        question_text: form.question_text, question_type: form.question_type,
        competency: form.competency, difficulty: form.difficulty,
        scoring_criteria: form.scoring_criteria, tags,
      }).eq("id", editingQuestion.id);
      if (!error) {
        toast.success(t('toast.questionUpdated', 'Question updated'));
        resetFormAndClose();
        fetchQuestions();
      } else {
        toast.error(t('toast.failedToUpdateQuestion', 'Failed to update question'));
      }
    } else {
      const { error } = await supabase.from("scorecard_question_library").insert({
        question_text: form.question_text, question_type: form.question_type,
        competency: form.competency, difficulty: form.difficulty,
        scoring_criteria: form.scoring_criteria, tags, usage_count: 0,
      });
      if (!error) {
        toast.success(t('toast.questionAddedToLibrary', 'Question added to library'));
        resetFormAndClose();
        fetchQuestions();
      } else {
        toast.error(t('toast.failedToAddQuestion', 'Failed to add question'));
      }
    }
  };

  const deleteQuestion = async (id: string, questionText: string) => {
    confirm(
      {
        type: "delete",
        title: "Delete Question",
        description: `Are you sure you want to delete this question? "${questionText.length > 120 ? questionText.slice(0, 120) + "..." : questionText}"`,
        confirmText: "Delete Question",
      },
      async () => {
        await supabase.from("scorecard_question_library").delete().eq("id", id);
        toast.success(t('toast.questionRemoved', 'Question removed'));
        fetchQuestions();
      }
    );
  };

  const filtered = questions.filter(q => {
    if (typeFilter !== "all" && q.question_type !== typeFilter) return false;
    if (competencyFilter !== "all" && q.competency !== competencyFilter) return false;
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(q.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const typeBreakdown = QUESTION_TYPES.map(t => ({
    type: t, count: questions.filter(q => q.question_type === t).length,
  }));

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('scorecardQuestionLibrary', 'SCORECARD QUESTION LIBRARY')}</h1>
            </div>
            <p className="text-muted-foreground">{t('searchableBankOfInterviewQuestions', 'Searchable bank of interview questions by competency, type, and difficulty')}</p>
          </div>
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />{t('addQuestion', 'Add Question')}</Button>
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetFormAndClose(); else setDialogOpen(true); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question to Library"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>{t("question", "Question")}</Label><Textarea value={form.question_text} onChange={e => setForm(p => ({...p, question_text: e.target.value}))} rows={3} placeholder={t('placeholder.tellMeAboutATime', 'Tell me about a time when...')} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t("type", "Type")}</Label>
                  <Select value={form.question_type} onValueChange={v => setForm(p => ({...p, question_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("competency", "Competency")}</Label>
                  <Select value={form.competency} onValueChange={v => setForm(p => ({...p, competency: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPETENCIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("difficulty", "Difficulty")}</Label>
                  <Select value={form.difficulty} onValueChange={v => setForm(p => ({...p, difficulty: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t('scoringCriteria', 'Scoring Criteria')}</Label><Textarea value={form.scoring_criteria} onChange={e => setForm(p => ({...p, scoring_criteria: e.target.value}))} rows={2} placeholder={t('placeholder.whatMakesAGreatAnswer', 'What makes a great answer...')} /></div>
              <div><Label>{t("tags_commaseparated", "Tags (comma-separated)")}</Label><Input value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} placeholder={t("engineering_senior_backend", "engineering, senior, backend")} /></div>
            </div>
            <DialogFooter>
              <Button onClick={saveQuestion} disabled={!form.question_text}>
                {editingQuestion ? "Save Changes" : "Add Question"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardHeader className="pb-2"><Skeleton variant="text" className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t('totalQuestions', 'Total Questions')}</CardDescription><CardTitle className="text-2xl">{questions.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t("competencies", "Competencies")}</CardDescription><CardTitle className="text-2xl">{new Set(questions.map(q => q.competency).filter(Boolean)).size}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('mostUsedType', 'Most Used Type')}</CardDescription><CardTitle className="text-lg">{typeBreakdown.sort((a, b) => b.count - a.count)[0]?.type.replace("_", " ") || "\u2014"}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('avgUsage', 'Avg Usage')}</CardDescription><CardTitle className="text-2xl">{questions.length > 0 ? Math.round(questions.reduce((a, q) => a + (q.usage_count || 0), 0) / questions.length) : 0}</CardTitle></CardHeader></Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('placeholder.searchQuestionsOrTags', 'Search questions or tags...')} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes', 'All Types')}</SelectItem>
              {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={competencyFilter} onValueChange={setCompetencyFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCompetencies', 'All Competencies')}</SelectItem>
              {COMPETENCIES.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Question Cards */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="h-5 w-full" />
                      <Skeleton variant="text" className="h-5 w-3/4" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {questions.length === 0 ? "No questions in the library. Add questions to build your interview question bank." : "No questions match the search criteria."}
            </CardContent></Card>
          ) : (
            filtered.map(q => (
              <Card key={q.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEditDialog(q)}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="font-medium">{q.question_text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{q.question_type.replace("_", " ")}</Badge>
                        <Badge variant="secondary">{q.competency.replace("_", " ")}</Badge>
                        <Badge variant={q.difficulty === "hard" ? "destructive" : q.difficulty === "medium" ? "default" : "secondary"}>{q.difficulty}</Badge>
                        {(q.tags || []).map(t => (
                          <Badge key={t} variant="outline" className="text-xs"><Tag className="h-2 w-2 mr-1" />{t}</Badge>
                        ))}
                      </div>
                      {q.scoring_criteria && <p className="text-xs text-muted-foreground">{q.scoring_criteria}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">Used {q.usage_count || 0}x</span>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditDialog(q); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id, q.question_text); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}
