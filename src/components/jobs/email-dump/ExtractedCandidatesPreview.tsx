import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Upload, ArrowLeft, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { AIConfidenceScore } from "@/components/ai/AIConfidenceScore";
import type { ExtractedCandidate } from "./EmailDumpTab";

interface ExtractedCandidatesPreviewProps {
  candidates: ExtractedCandidate[];
  onCandidatesChange: (candidates: ExtractedCandidate[]) => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  dumpId: string | null;
  onReset: () => void;
  onImportComplete: () => void;
}

export function ExtractedCandidatesPreview({
  candidates,
  onCandidatesChange,
  jobId,
  jobTitle,
  companyName,
  dumpId,
  onReset,
  onImportComplete,
}: ExtractedCandidatesPreviewProps) {
  const [importing, setImporting] = useState(false);

  const selectedCount = candidates.filter((c) => c.selected).length;
  const duplicateCount = candidates.filter((c) => c.duplicate_of).length;

  const toggleSelect = (id: string) => {
    onCandidatesChange(
      candidates.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleAll = (checked: boolean) => {
    onCandidatesChange(candidates.map((c) => ({ ...c, selected: checked })));
  };

  const updateField = (id: string, field: keyof ExtractedCandidate, value: string) => {
    onCandidatesChange(
      candidates.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleImport = async () => {
    const toImport = candidates.filter((c) => c.selected);
    if (toImport.length === 0) {
      toast.error("Select at least one candidate");
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Batch: resolve all candidate profile IDs in parallel
      const profileResults = await Promise.allSettled(
        toImport.map(async (candidate) => {
          let candidateProfileId: string | null = null;

          // Check existing by email
          if (candidate.email) {
            const { data: existing } = await supabase
              .from("candidate_profiles")
              .select("id")
              .ilike("email", candidate.email)
              .maybeSingle();
            if (existing) candidateProfileId = existing.id;
          }

          // Check existing by LinkedIn
          if (!candidateProfileId && candidate.linkedin_url) {
            const { data: existing } = await supabase
              .from("candidate_profiles")
              .select("id")
              .ilike("linkedin_url", candidate.linkedin_url)
              .maybeSingle();
            if (existing) candidateProfileId = existing.id;
          }

          // Create if not exists
          if (!candidateProfileId) {
            const { data: newProfile, error: profileErr } = await supabase
              .from("candidate_profiles")
              .insert({
                full_name: candidate.full_name,
                email: candidate.email || null,
                phone: candidate.phone || null,
                current_title: candidate.current_title || null,
                current_company: candidate.current_company || null,
                linkedin_url: candidate.linkedin_url || null,
                source_channel: "email_dump",
                created_by: user.id,
                admin_notes: candidate.notes || null,
              })
              .select("id")
              .single();

            if (profileErr) throw profileErr;
            candidateProfileId = newProfile.id;
          }

          return { candidate, candidateProfileId };
        })
      );

      // Filter successful profile resolutions
      const resolved = profileResults
        .filter((r): r is PromiseFulfilledResult<{ candidate: ExtractedCandidate; candidateProfileId: string }> =>
          r.status === "fulfilled"
        )
        .map((r) => r.value);

      // Batch: create applications in parallel
      const appResults = await Promise.allSettled(
        resolved.map(async ({ candidate, candidateProfileId }) => {
          // Check if application already exists
          const { data: existingApp } = await supabase
            .from("applications")
            .select("id")
            .eq("job_id", jobId)
            .eq("candidate_id", candidateProfileId)
            .maybeSingle();

          if (existingApp) return false; // skip duplicate

          const { error: appErr } = await supabase.from("applications").insert({
            job_id: jobId,
            candidate_id: candidateProfileId,
            candidate_full_name: candidate.full_name,
            candidate_email: candidate.email || null,
            candidate_linkedin_url: candidate.linkedin_url || null,
            candidate_title: candidate.current_title || null,
            candidate_company: candidate.current_company || null,
            candidate_phone: candidate.phone || null,
            application_source: "other",
            current_stage_index: 0,
            status: "active",
            position: jobTitle,
            company_name: companyName,
            sourced_by: user.id,
            user_id: null,
          });

          if (appErr) throw appErr;
          return true;
        })
      );

      const importedCount = appResults.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length;

      // Update dump status
      if (dumpId) {
        await supabase
          .from("job_email_dumps" as any)
          .update({
            import_status: importedCount === toImport.length ? "imported" : "partial",
            imported_count: importedCount,
          } as any)
          .eq("id", dumpId);
      }

      toast.success(`Imported ${importedCount} candidate${importedCount !== 1 ? "s" : ""} to pipeline`);
      onImportComplete();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import candidates");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Extracted Candidates ({candidates.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              size="sm"
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {selectedCount} to Pipeline
                </>
              )}
            </Button>
          </div>
        </div>
        {duplicateCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-yellow-500">
            <AlertTriangle className="h-3 w-3" />
            {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} detected (already in pipeline)
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_100px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b border-border/20">
            <div>
              <Checkbox
                checked={candidates.every((c) => c.selected)}
                onCheckedChange={(checked) => toggleAll(!!checked)}
              />
            </div>
            <div>Name</div>
            <div>Email / Phone</div>
            <div>Title / Company</div>
            <div>LinkedIn</div>
            <div>Confidence</div>
          </div>

          {/* Rows */}
          {candidates.map((c) => (
            <div
              key={c.id}
              className={`grid grid-cols-[40px_1fr_1fr_1fr_1fr_100px] gap-2 px-2 py-2 rounded-md text-xs items-center transition-colors ${
                c.duplicate_of
                  ? "bg-yellow-500/5 border border-yellow-500/20"
                  : "hover:bg-muted/10"
              }`}
            >
              <div>
                <Checkbox
                  checked={c.selected}
                  onCheckedChange={() => toggleSelect(c.id)}
                />
              </div>
              <div className="space-y-1">
                <Input
                  value={c.full_name}
                  onChange={(e) => updateField(c.id, "full_name", e.target.value)}
                  className="h-7 text-xs bg-transparent border-transparent hover:border-border/30 focus:border-border/50"
                />
                {c.duplicate_of && (
                  <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500">
                    Duplicate ({c.duplicate_of})
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  value={c.email}
                  onChange={(e) => updateField(c.id, "email", e.target.value)}
                  placeholder="email"
                  className="h-7 text-xs bg-transparent border-transparent hover:border-border/30 focus:border-border/50"
                />
                <Input
                  value={c.phone}
                  onChange={(e) => updateField(c.id, "phone", e.target.value)}
                  placeholder="phone"
                  className="h-7 text-xs bg-transparent border-transparent hover:border-border/30 focus:border-border/50"
                />
              </div>
              <div className="space-y-1">
                <Input
                  value={c.current_title}
                  onChange={(e) => updateField(c.id, "current_title", e.target.value)}
                  placeholder="title"
                  className="h-7 text-xs bg-transparent border-transparent hover:border-border/30 focus:border-border/50"
                />
                <Input
                  value={c.current_company}
                  onChange={(e) => updateField(c.id, "current_company", e.target.value)}
                  placeholder="company"
                  className="h-7 text-xs bg-transparent border-transparent hover:border-border/30 focus:border-border/50"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Input
                    value={c.linkedin_url}
                    onChange={(e) => updateField(c.id, "linkedin_url", e.target.value)}
                    placeholder="linkedin"
                    className="h-7 text-xs bg-transparent border-transparent hover:border-border/30 focus:border-border/50"
                  />
                  {c.linkedin_url && (
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <div>
                <AIConfidenceScore score={Math.round(c.confidence * 100)} label="" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
