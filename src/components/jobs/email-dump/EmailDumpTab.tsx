import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Sparkles, Loader2, History, ClipboardPaste } from "lucide-react";
import { ExtractedCandidatesPreview } from "./ExtractedCandidatesPreview";
import { EmailDumpHistory } from "./EmailDumpHistory";
import { RoleGate } from "@/components/RoleGate";

interface EmailDumpTabProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  onCandidatesImported?: () => void;
}

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
}

export function EmailDumpTab({ jobId, jobTitle, companyName, onCandidatesImported }: EmailDumpTabProps) {
  const [rawContent, setRawContent] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedCandidate[]>([]);
  const [currentDumpId, setCurrentDumpId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("paste");

  const handleExtract = async () => {
    if (!rawContent.trim()) {
      toast.error("Paste email content first");
      return;
    }

    setExtracting(true);
    try {
      // Create the dump record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: dump, error: dumpError } = await supabase
        .from("job_email_dumps" as any)
        .insert({
          job_id: jobId,
          raw_content: rawContent,
          created_by: user.id,
          import_status: "pending",
        } as any)
        .select()
        .single();

      if (dumpError) throw dumpError;

      const dumpId = (dump as any).id;
      setCurrentDumpId(dumpId);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("parse-email-candidates", {
        body: { raw_content: rawContent, job_id: jobId, dump_id: dumpId },
      });

      if (error) throw error;

      if (data?.candidates?.length > 0) {
        // Check for duplicates against existing candidates
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
    setExtractedCandidates([]);
    setCurrentDumpId(null);
  };

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
                    Paste forwarded emails or candidate lists. QUIN will extract all candidates automatically.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Paste email content here... You can paste multiple emails at once."
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    className="min-h-[240px] font-mono text-xs bg-background/40 border-border/30 resize-y"
                    disabled={extracting}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {rawContent.length > 0 ? `${rawContent.length.toLocaleString()} characters` : "No content"}
                    </span>
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

async function checkDuplicates(
  candidates: ExtractedCandidate[],
  jobId: string
): Promise<ExtractedCandidate[]> {
  // Get existing candidates' emails and linkedin urls for this job
  const { data: existingApps } = await supabase
    .from("applications")
    .select("candidate_email, candidate_linkedin_url, candidate_full_name")
    .eq("job_id", jobId)
    .eq("status", "active");

  const existingEmails = new Set(
    (existingApps || [])
      .map((a) => a.candidate_email?.toLowerCase())
      .filter(Boolean)
  );
  const existingLinkedIns = new Set(
    (existingApps || [])
      .map((a) => a.candidate_linkedin_url?.toLowerCase())
      .filter(Boolean)
  );

  return candidates.map((c) => {
    let duplicate_of: string | null = null;

    if (c.email && existingEmails.has(c.email.toLowerCase())) {
      duplicate_of = "email";
    } else if (c.linkedin_url && existingLinkedIns.has(c.linkedin_url.toLowerCase())) {
      duplicate_of = "linkedin";
    }

    return { ...c, duplicate_of, selected: !duplicate_of };
  });
}
