import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Sparkles, Loader2, History, ClipboardPaste, Link } from "lucide-react";
import { ExtractedCandidatesPreview } from "./ExtractedCandidatesPreview";
import { EmailDumpHistory } from "./EmailDumpHistory";
import { RoleGate } from "@/components/RoleGate";

interface EmailDumpTabProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  onCandidatesImported?: () => void;
}

export type DuplicateMatchType =
  | 'new'
  | 'existing_profile'
  | 'in_pipeline'
  | 'name_match'
  | 'batch_duplicate';

export interface ExtractedCandidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  current_title: string;
  current_company: string;
  linkedin_url: string;
  notes: string;
  confidence: number;
  selected: boolean;
  duplicate_of: string | null;
  match_type: DuplicateMatchType;
  existing_profile_id: string | null;
  match_details: string | null;
}

interface DetectedHyperlink {
  text: string;
  url: string;
}

export function EmailDumpTab({ jobId, jobTitle, companyName, onCandidatesImported }: EmailDumpTabProps) {
  const [rawContent, setRawContent] = useState("");
  const [detectedLinks, setDetectedLinks] = useState<DetectedHyperlink[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedCandidate[]>([]);
  const [currentDumpId, setCurrentDumpId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("paste");

  // Rich paste handler: extract hyperlinks from HTML clipboard data
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");

    if (html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const anchors = doc.querySelectorAll("a[href]");
        const links: DetectedHyperlink[] = [];

        anchors.forEach((a) => {
          const href = a.getAttribute("href") || "";
          const text = (a.textContent || "").trim();
          if (href && text) {
            links.push({ text, url: href });
          }
        });

        if (links.length > 0) {
          setDetectedLinks((prev) => {
            const existing = new Set(prev.map((l) => l.url));
            const newLinks = links.filter((l) => !existing.has(l.url));
            return [...prev, ...newLinks];
          });
        }
      } catch {
        // Fallback: just use plain text
      }
    }
  }, []);

  // Build enriched content with detected hyperlinks for the AI
  const buildEnrichedContent = useCallback(() => {
    let content = rawContent;
    if (detectedLinks.length > 0) {
      content += "\n\n---\nDETECTED HYPERLINKS (extracted from email HTML):\n";
      detectedLinks.forEach((link) => {
        content += `- text="${link.text}" url="${link.url}"\n`;
      });
    }
    return content;
  }, [rawContent, detectedLinks]);

  const handleExtract = async () => {
    if (!rawContent.trim()) {
      toast.error("Paste email content first");
      return;
    }

    setExtracting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const enrichedContent = buildEnrichedContent();

      const { data: dump, error: dumpError } = await supabase
        .from("job_email_dumps" as any)
        .insert({
          job_id: jobId,
          raw_content: enrichedContent,
          created_by: user.id,
          import_status: "pending",
        } as any)
        .select()
        .single();

      if (dumpError) throw dumpError;

      const dumpId = (dump as any).id;
      setCurrentDumpId(dumpId);

      const { data, error } = await supabase.functions.invoke("parse-email-candidates", {
        body: { raw_content: enrichedContent, job_id: jobId, dump_id: dumpId },
      });

      if (error) throw error;

      if (data?.candidates?.length > 0) {
        const candidatesWithDupes = await checkDuplicates(data.candidates, jobId);
        setExtractedCandidates(candidatesWithDupes);
        toast.success(`Extracted ${data.candidates.length} candidate${data.candidates.length !== 1 ? "s" : ""}`);

        // Log email_dump_created to audit log
        try {
          await supabase.from('pipeline_audit_logs').insert({
            job_id: jobId,
            user_id: user.id,
            action: 'email_dump_created',
            stage_data: {
              dump_id: dumpId,
              candidate_count: data.candidates.length,
              linkedin_count: detectedLinks.filter(l => l.url.toLowerCase().includes('linkedin.com')).length,
            },
            metadata: { content_length: enrichedContent.length },
          });
        } catch (auditErr) {
          console.error('Failed to log email dump audit:', auditErr);
        }
      } else {
        toast.info("No candidates found in the email content");
        setExtractedCandidates([]);
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast.error(error.message || "Failed to extract candidates");
    } finally {
      setExtracting(false);
    }
  };

  const handleReset = () => {
    setRawContent("");
    setDetectedLinks([]);
    setExtractedCandidates([]);
    setCurrentDumpId(null);
  };

  const linkedInLinkCount = detectedLinks.filter((l) =>
    l.url.toLowerCase().includes("linkedin.com")
  ).length;

  return (
    <RoleGate allowedRoles={["admin", "strategist"]}>
      <div className="space-y-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="bg-card/50 border border-border/20">
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="h-4 w-4" />
              New Dump
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-4 mt-4">
            {extractedCandidates.length === 0 ? (
              <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Email Dump — {jobTitle}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Paste forwarded emails or candidate lists. Hyperlinks (LinkedIn URLs) are automatically detected from rich text. Powered by QUIN.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Paste email content here... Hyperlinks from rich text (e.g. LinkedIn profiles) will be automatically extracted."
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    onPaste={handlePaste}
                    className="min-h-[240px] font-mono text-xs bg-background/40 border-border/30 resize-y"
                    disabled={extracting}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {rawContent.length > 0
                          ? `${rawContent.length.toLocaleString()} characters`
                          : "No content"}
                      </span>
                      {detectedLinks.length > 0 && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Link className="h-3 w-3" />
                          {detectedLinks.length} hyperlink{detectedLinks.length !== 1 ? "s" : ""} detected
                          {linkedInLinkCount > 0 && ` (${linkedInLinkCount} LinkedIn)`}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleExtract}
                      disabled={!rawContent.trim() || extracting}
                      className="gap-2"
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Extract Candidates
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ExtractedCandidatesPreview
                candidates={extractedCandidates}
                onCandidatesChange={setExtractedCandidates}
                jobId={jobId}
                jobTitle={jobTitle}
                companyName={companyName}
                dumpId={currentDumpId}
                onReset={handleReset}
                onImportComplete={() => {
                  handleReset();
                  onCandidatesImported?.();
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <EmailDumpHistory jobId={jobId} />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}

// ============= Three-Layer Deduplication =============

function normalizeLinkedIn(url: string): string {
  try {
    const lower = url.toLowerCase().trim().replace(/\/+$/, '');
    const match = lower.match(/linkedin\.com\/in\/([^/?#]+)/);
    return match ? match[1] : lower;
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Fuzzy name match: handles "Lillian" vs "Lilian", minor typos
function fuzzyNameMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;

  // Check Levenshtein distance ≤ 2 for short names
  if (Math.abs(na.length - nb.length) > 2) return false;

  let dist = 0;
  const longer = na.length >= nb.length ? na : nb;
  const shorter = na.length < nb.length ? na : nb;

  // Simple edit distance check (optimized for short strings)
  const matrix: number[][] = [];
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  dist = matrix[shorter.length][longer.length];

  // Allow distance ≤ 2 for names > 5 chars, ≤ 1 for shorter
  const threshold = na.length > 5 && nb.length > 5 ? 2 : 1;
  return dist <= threshold;
}

async function checkDuplicates(
  candidates: ExtractedCandidate[],
  jobId: string
): Promise<ExtractedCandidate[]> {
  const enriched: ExtractedCandidate[] = candidates.map((c) => ({
    ...c,
    match_type: 'new' as DuplicateMatchType,
    existing_profile_id: null,
    match_details: null,
    duplicate_of: null,
    selected: true,
  }));

  // === Layer 1: Within-batch dedup ===
  const emailSeen = new Map<string, number>();
  const linkedinSeen = new Map<string, number>();
  const nameSeen = new Map<string, number>();

  enriched.forEach((c, i) => {
    if (c.email) {
      const key = c.email.toLowerCase().trim();
      if (emailSeen.has(key)) {
        c.match_type = 'batch_duplicate';
        c.duplicate_of = 'batch';
        c.match_details = `Same email as #${(emailSeen.get(key)! + 1)}`;
        c.selected = false;
      } else {
        emailSeen.set(key, i);
      }
    }
    if (c.linkedin_url && c.match_type === 'new') {
      const key = normalizeLinkedIn(c.linkedin_url);
      if (linkedinSeen.has(key)) {
        c.match_type = 'batch_duplicate';
        c.duplicate_of = 'batch';
        c.match_details = `Same LinkedIn as #${(linkedinSeen.get(key)! + 1)}`;
        c.selected = false;
      } else {
        linkedinSeen.set(key, i);
      }
    }
    // Batch name dedup
    if (c.full_name && c.match_type === 'new') {
      const key = normalizeName(c.full_name);
      if (nameSeen.has(key)) {
        c.match_type = 'batch_duplicate';
        c.duplicate_of = 'batch';
        c.match_details = `Same name as #${(nameSeen.get(key)! + 1)}`;
        c.selected = false;
      } else {
        nameSeen.set(key, i);
      }
    }
  });

  // Collect lookup values
  const emails = enriched
    .filter((c) => c.match_type === 'new' && c.email)
    .map((c) => c.email.toLowerCase().trim());
  const linkedinUsernames = enriched
    .filter((c) => c.match_type === 'new' && c.linkedin_url)
    .map((c) => normalizeLinkedIn(c.linkedin_url));

  // === Layer 2: Global candidate_profiles check ===
  const profilesByEmail = new Map<string, { id: string; full_name: string }>();
  const profilesByLinkedIn = new Map<string, { id: string; full_name: string }>();

  if (emails.length > 0) {
    const { data: emailMatches } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, email")
      .in("email", emails);

    (emailMatches || []).forEach((p: any) => {
      if (p.email) profilesByEmail.set(p.email.toLowerCase().trim(), { id: p.id, full_name: p.full_name });
    });
  }

  // LinkedIn: fetch ALL profiles with linkedin_url and compare normalized usernames
  if (linkedinUsernames.length > 0) {
    const { data: allLinkedinProfiles } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, linkedin_url")
      .not("linkedin_url", "is", null);

    (allLinkedinProfiles || []).forEach((p: any) => {
      if (p.linkedin_url) {
        const normalized = normalizeLinkedIn(p.linkedin_url);
        profilesByLinkedIn.set(normalized, { id: p.id, full_name: p.full_name });
      }
    });
  }

  // Apply Layer 2 matches
  enriched.forEach((c) => {
    if (c.match_type !== 'new') return;

    if (c.email) {
      const match = profilesByEmail.get(c.email.toLowerCase().trim());
      if (match) {
        c.match_type = 'existing_profile';
        c.existing_profile_id = match.id;
        c.match_details = `Existing profile: ${match.full_name}`;
        return;
      }
    }
    if (c.linkedin_url) {
      const normalizedKey = normalizeLinkedIn(c.linkedin_url);
      const match = profilesByLinkedIn.get(normalizedKey);
      if (match) {
        c.match_type = 'existing_profile';
        c.existing_profile_id = match.id;
        c.match_details = `Existing profile: ${match.full_name}`;
        return;
      }
    }
  });

  // === Layer 2b: Fuzzy name matching for ALL remaining 'new' candidates ===
  const stillNew = enriched.filter((c) => c.match_type === 'new' && c.full_name);
  if (stillNew.length > 0) {
    // Fetch candidate names for fuzzy comparison
    const { data: allProfiles } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, email, linkedin_url")
      .not("full_name", "is", null)
      .limit(2000);

    if (allProfiles && allProfiles.length > 0) {
      for (const c of stillNew) {
        if (c.match_type !== 'new') continue;

        for (const existing of allProfiles) {
          if (fuzzyNameMatch(c.full_name, existing.full_name || '')) {
            // If the existing profile also has a matching LinkedIn username, it's high confidence
            const linkedinAlsoMatches = c.linkedin_url && existing.linkedin_url &&
              normalizeLinkedIn(c.linkedin_url) === normalizeLinkedIn(existing.linkedin_url);

            if (linkedinAlsoMatches) {
              c.match_type = 'existing_profile';
              c.existing_profile_id = existing.id;
              c.match_details = `Existing profile: ${existing.full_name} (name + LinkedIn match)`;
            } else {
              c.match_type = 'name_match';
              c.existing_profile_id = existing.id;
              c.match_details = `Possible match: ${existing.full_name}${existing.email ? ` (${existing.email})` : ''}`;
            }
            break;
          }
        }
      }
    }
  }

  // === Layer 3: Job-specific application check ===
  const { data: existingApps } = await supabase
    .from("applications")
    .select("candidate_email, candidate_linkedin_url, candidate_id, candidate_full_name")
    .eq("job_id", jobId)
    .eq("status", "active");

  const pipelineEmails = new Set(
    (existingApps || []).map((a: any) => a.candidate_email?.toLowerCase()).filter(Boolean)
  );
  // Normalize pipeline LinkedIn URLs for proper comparison
  const pipelineLinkedIns = new Set(
    (existingApps || []).map((a: any) => {
      if (!a.candidate_linkedin_url) return null;
      return normalizeLinkedIn(a.candidate_linkedin_url);
    }).filter(Boolean)
  );
  const pipelineCandidateIds = new Set(
    (existingApps || []).map((a: any) => a.candidate_id).filter(Boolean)
  );
  // Also build a name set for pipeline fuzzy matching
  const pipelineNames = (existingApps || [])
    .map((a: any) => a.candidate_full_name)
    .filter(Boolean);

  // Also check existing profile LinkedIn URLs in pipeline via candidate_profiles
  const pipelineProfileIds = Array.from(pipelineCandidateIds);
  let pipelineProfileLinkedIns = new Set<string>();
  if (pipelineProfileIds.length > 0) {
    const { data: pipelineProfiles } = await supabase
      .from("candidate_profiles")
      .select("id, linkedin_url")
      .in("id", pipelineProfileIds)
      .not("linkedin_url", "is", null);

    (pipelineProfiles || []).forEach((p: any) => {
      if (p.linkedin_url) {
        pipelineProfileLinkedIns.add(normalizeLinkedIn(p.linkedin_url));
      }
    });
  }

  enriched.forEach((c) => {
    if (c.match_type === 'batch_duplicate') return;

    const normalizedLinkedin = c.linkedin_url ? normalizeLinkedIn(c.linkedin_url) : null;

    const inPipeline =
      (c.email && pipelineEmails.has(c.email.toLowerCase())) ||
      (normalizedLinkedin && pipelineLinkedIns.has(normalizedLinkedin)) ||
      (normalizedLinkedin && pipelineProfileLinkedIns.has(normalizedLinkedin)) ||
      (c.existing_profile_id && pipelineCandidateIds.has(c.existing_profile_id)) ||
      // Fuzzy name match against pipeline
      (c.full_name && pipelineNames.some((pn: string) => fuzzyNameMatch(c.full_name, pn)));

    if (inPipeline) {
      c.match_type = 'in_pipeline';
      c.duplicate_of = 'pipeline';
      c.match_details = 'Already in this job\'s pipeline';
      c.selected = false;
    }
  });

  return enriched;
}
