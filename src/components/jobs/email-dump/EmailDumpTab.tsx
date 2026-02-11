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
    // Extract the path part after linkedin.com/in/
    const match = lower.match(/linkedin\.com\/in\/([^/?#]+)/);
    return match ? match[1] : lower;
  } catch {
    return url.toLowerCase().trim();
  }
}

async function checkDuplicates(
  candidates: ExtractedCandidate[],
  jobId: string
): Promise<ExtractedCandidate[]> {
  // Ensure every candidate has the new fields
  const enriched: ExtractedCandidate[] = candidates.map((c) => ({
    ...c,
    match_type: 'new' as DuplicateMatchType,
    existing_profile_id: null,
    match_details: null,
    duplicate_of: null,
    selected: true,
  }));

  // === Layer 1: Within-batch dedup ===
  const emailSeen = new Map<string, number>(); // normalized email -> first index
  const linkedinSeen = new Map<string, number>(); // normalized linkedin -> first index

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
  });

  // Collect lookup values (only for non-batch-dupes)
  const emails = enriched
    .filter((c) => c.match_type === 'new' && c.email)
    .map((c) => c.email.toLowerCase().trim());
  const linkedinUrls = enriched
    .filter((c) => c.match_type === 'new' && c.linkedin_url)
    .map((c) => c.linkedin_url.toLowerCase().trim());
  const nameOnlyCandidates = enriched.filter(
    (c) => c.match_type === 'new' && !c.email && !c.linkedin_url && c.full_name
  );

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

  if (linkedinUrls.length > 0) {
    const { data: linkedinMatches } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, linkedin_url")
      .in("linkedin_url", linkedinUrls);

    (linkedinMatches || []).forEach((p: any) => {
      if (p.linkedin_url) profilesByLinkedIn.set(p.linkedin_url.toLowerCase().trim(), { id: p.id, full_name: p.full_name });
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
        // Keep selected — we'll link to existing profile during import
        return;
      }
    }
    if (c.linkedin_url) {
      const match = profilesByLinkedIn.get(c.linkedin_url.toLowerCase().trim());
      if (match) {
        c.match_type = 'existing_profile';
        c.existing_profile_id = match.id;
        c.match_details = `Existing profile: ${match.full_name}`;
        return;
      }
    }
  });

  // === Layer 2b: Name-based fuzzy matching for candidates without email/LinkedIn ===
  for (const c of nameOnlyCandidates) {
    if (c.match_type !== 'new') continue;

    const { data: nameMatches } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, email")
      .ilike("full_name", c.full_name.trim())
      .limit(3);

    if (nameMatches && nameMatches.length > 0) {
      const best = nameMatches[0];
      c.match_type = 'name_match';
      c.existing_profile_id = best.id;
      c.match_details = `Possible match: ${best.full_name}${best.email ? ` (${best.email})` : ''}`;
      // Keep selected — user decides whether to confirm name match
    }
  }

  // === Layer 3: Job-specific application check ===
  const { data: existingApps } = await supabase
    .from("applications")
    .select("candidate_email, candidate_linkedin_url, candidate_id")
    .eq("job_id", jobId)
    .eq("status", "active");

  const pipelineEmails = new Set(
    (existingApps || []).map((a: any) => a.candidate_email?.toLowerCase()).filter(Boolean)
  );
  const pipelineLinkedIns = new Set(
    (existingApps || []).map((a: any) => a.candidate_linkedin_url?.toLowerCase()).filter(Boolean)
  );
  const pipelineCandidateIds = new Set(
    (existingApps || []).map((a: any) => a.candidate_id).filter(Boolean)
  );

  enriched.forEach((c) => {
    // If already marked as batch_duplicate, skip
    if (c.match_type === 'batch_duplicate') return;

    const inPipeline =
      (c.email && pipelineEmails.has(c.email.toLowerCase())) ||
      (c.linkedin_url && pipelineLinkedIns.has(c.linkedin_url.toLowerCase())) ||
      (c.existing_profile_id && pipelineCandidateIds.has(c.existing_profile_id));

    if (inPipeline) {
      c.match_type = 'in_pipeline';
      c.duplicate_of = 'pipeline';
      c.match_details = 'Already in this job\'s pipeline';
      c.selected = false;
    }
  });

  return enriched;
}
