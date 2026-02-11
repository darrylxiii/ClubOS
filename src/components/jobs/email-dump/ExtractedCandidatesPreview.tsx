import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Upload, ArrowLeft, Loader2, AlertTriangle, ExternalLink, CheckCircle2, UserCheck, Copy, HelpCircle } from "lucide-react";
import { AIConfidenceScore } from "@/components/ai/AIConfidenceScore";
import type { ExtractedCandidate, DuplicateMatchType } from "./EmailDumpTab";

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

const MATCH_TYPE_CONFIG: Record<DuplicateMatchType, {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
  rowClassName: string;
}> = {
  new: {
    label: 'New',
    className: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10',
    icon: CheckCircle2,
    rowClassName: 'hover:bg-muted/10',
  },
  existing_profile: {
    label: 'Existing profile',
    className: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
    icon: UserCheck,
    rowClassName: 'bg-blue-500/5 border border-blue-500/20',
  },
  in_pipeline: {
    label: 'Already in pipeline',
    className: 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10',
    icon: AlertTriangle,
    rowClassName: 'bg-yellow-500/5 border border-yellow-500/20',
  },
  name_match: {
    label: 'Possible name match',
    className: 'border-orange-500/30 text-orange-500 bg-orange-500/10',
    icon: HelpCircle,
    rowClassName: 'bg-orange-500/5 border border-orange-500/20',
  },
  batch_duplicate: {
    label: 'Duplicate in batch',
    className: 'border-red-500/30 text-red-500 bg-red-500/10',
    icon: Copy,
    rowClassName: 'bg-red-500/5 border border-red-500/20',
  },
};

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
  const newCount = candidates.filter((c) => c.match_type === 'new').length;
  const existingCount = candidates.filter((c) => c.match_type === 'existing_profile').length;
  const pipelineCount = candidates.filter((c) => c.match_type === 'in_pipeline').length;
  const nameMatchCount = candidates.filter((c) => c.match_type === 'name_match').length;
  const batchDupeCount = candidates.filter((c) => c.match_type === 'batch_duplicate').length;

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
    let importedCount = 0;
    let skippedCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const candidate of toImport) {
        try {
          let candidateProfileId: string | null = candidate.existing_profile_id;

          // If no existing profile pre-linked, resolve or create
          if (!candidateProfileId) {
            // Check by email
            if (candidate.email) {
              const { data: existing } = await supabase
                .from("candidate_profiles")
                .select("id")
                .ilike("email", candidate.email)
                .maybeSingle();
              if (existing) candidateProfileId = existing.id;
            }

            // Check by LinkedIn
            if (!candidateProfileId && candidate.linkedin_url) {
              const { data: existing } = await supabase
                .from("candidate_profiles")
                .select("id")
                .ilike("linkedin_url", candidate.linkedin_url)
                .maybeSingle();
              if (existing) candidateProfileId = existing.id;
            }

            // Create new profile with graceful constraint handling
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
                  source_metadata: {
                    origin: 'email_dump',
                    dump_id: dumpId,
                    job_id: jobId,
                  },
                } as any)
                .select("id")
                .single();

              if (profileErr) {
                // Graceful constraint violation handling (Fix 3)
                if (profileErr.message?.includes('unique') || profileErr.code === '23505') {
                  // Fetch existing profile by email as fallback
                  if (candidate.email) {
                    const { data: fallback } = await supabase
                      .from("candidate_profiles")
                      .select("id")
                      .ilike("email", candidate.email)
                      .maybeSingle();
                    if (fallback) {
                      candidateProfileId = fallback.id;
                    } else {
                      console.error("Constraint violation but couldn't find existing profile:", profileErr);
                      skippedCount++;
                      continue;
                    }
                  } else {
                    console.error("Constraint violation on profile without email:", profileErr);
                    skippedCount++;
                    continue;
                  }
                } else {
                  console.error("Profile creation failed:", profileErr);
                  skippedCount++;
                  continue;
                }
              } else {
                candidateProfileId = newProfile.id;
              }
            }
          }

          // Check if application already exists for this job
          const { data: existingApp } = await supabase
            .from("applications")
            .select("id")
            .eq("job_id", jobId)
            .eq("candidate_id", candidateProfileId)
            .maybeSingle();

          if (existingApp) {
            skippedCount++;
            continue;
          }

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

          if (appErr) {
            console.error("Application creation failed:", appErr);
            skippedCount++;
            continue;
          }

          importedCount++;
        } catch (err) {
          console.error("Error processing candidate:", candidate.full_name, err);
          skippedCount++;
        }
      }

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

      const msg = skippedCount > 0
        ? `Imported ${importedCount} candidate${importedCount !== 1 ? "s" : ""}, ${skippedCount} skipped (duplicates or errors)`
        : `Imported ${importedCount} candidate${importedCount !== 1 ? "s" : ""} to pipeline`;

      toast.success(msg);
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
        {/* Dedup summary badges */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {newCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
              {newCount} new
            </Badge>
          )}
          {existingCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500">
              {existingCount} existing profile{existingCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {pipelineCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {pipelineCount} already in pipeline
            </Badge>
          )}
          {nameMatchCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500">
              {nameMatchCount} possible match{nameMatchCount !== 1 ? 'es' : ''}
            </Badge>
          )}
          {batchDupeCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
              {batchDupeCount} batch duplicate{batchDupeCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
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
          {candidates.map((c) => {
            const config = MATCH_TYPE_CONFIG[c.match_type];
            const Icon = config.icon;

            return (
              <div
                key={c.id}
                className={`grid grid-cols-[40px_1fr_1fr_1fr_1fr_100px] gap-2 px-2 py-2 rounded-md text-xs items-center transition-colors ${config.rowClassName}`}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] gap-0.5 ${config.className}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {config.label}
                    </Badge>
                    {c.match_details && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={c.match_details}>
                        {c.match_details}
                      </span>
                    )}
                  </div>
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
