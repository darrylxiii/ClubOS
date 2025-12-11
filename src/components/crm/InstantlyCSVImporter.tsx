import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  csvField: string;
  crmField: string;
}

const CRM_FIELDS = [
  { value: "company_name", label: "Company Name", required: true },
  { value: "full_name", label: "Full Name", required: true },
  { value: "first_name", label: "First Name", required: false },
  { value: "last_name", label: "Last Name", required: false },
  { value: "email", label: "Email", required: true },
  { value: "phone", label: "Phone", required: false },
  { value: "job_title", label: "Job Title", required: false },
  { value: "linkedin_url", label: "LinkedIn URL", required: false },
  { value: "company_domain", label: "Company Domain", required: false },
  { value: "notes", label: "Notes", required: false },
  { value: "skip", label: "Skip this field", required: false },
];

export function InstantlyCSVImporter() {
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "complete">("upload");
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const [fileName, setFileName] = useState("");

  const parseCSV = (text: string): { headers: string[]; rows: CSVRow[] } => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCSVHeaders(headers);
      setCSVData(rows);
      
      const autoMappings: FieldMapping[] = headers.map(header => {
        const lowerHeader = header.toLowerCase();
        let crmField = "skip";
        
        if (lowerHeader.includes("company") && lowerHeader.includes("name")) {
          crmField = "company_name";
        } else if (lowerHeader === "name" || lowerHeader === "full name" || lowerHeader === "fullname") {
          crmField = "full_name";
        } else if (lowerHeader.includes("first") && lowerHeader.includes("name")) {
          crmField = "first_name";
        } else if (lowerHeader.includes("last") && lowerHeader.includes("name")) {
          crmField = "last_name";
        } else if (lowerHeader.includes("email")) {
          crmField = "email";
        } else if (lowerHeader.includes("phone")) {
          crmField = "phone";
        } else if (lowerHeader.includes("title") || lowerHeader.includes("position") || lowerHeader.includes("job")) {
          crmField = "job_title";
        } else if (lowerHeader.includes("linkedin")) {
          crmField = "linkedin_url";
        } else if (lowerHeader.includes("domain") || lowerHeader.includes("website")) {
          crmField = "company_domain";
        } else if (lowerHeader.includes("note")) {
          crmField = "notes";
        } else if (lowerHeader.includes("company") || lowerHeader.includes("organization")) {
          crmField = "company_name";
        }
        
        return { csvField: header, crmField };
      });
      
      setFieldMappings(autoMappings);
      setStep("mapping");
    };
    reader.readAsText(file);
  }, []);

  const updateMapping = (csvField: string, crmField: string) => {
    setFieldMappings(prev => prev.map(m => m.csvField === csvField ? { ...m, crmField } : m));
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to import prospects");
      return;
    }

    let success = 0;
    let failed = 0;
    const total = csvData.length;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const prospect: Record<string, string> = {};

      fieldMappings.forEach(mapping => {
        if (mapping.crmField !== "skip" && row[mapping.csvField]) {
          prospect[mapping.crmField] = row[mapping.csvField];
        }
      });

      if (!prospect.email) {
        failed++;
        continue;
      }

      // Ensure full_name is set
      const fullName = prospect.full_name || 
        [prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || 
        prospect.email.split('@')[0];

      const { error } = await supabase
        .from("crm_prospects")
        .insert({
          company_name: prospect.company_name || null,
          first_name: prospect.first_name || null,
          last_name: prospect.last_name || null,
          full_name: fullName,
          email: prospect.email,
          phone: prospect.phone || null,
          job_title: prospect.job_title || null,
          linkedin_url: prospect.linkedin_url || null,
          company_domain: prospect.company_domain || null,
          notes: prospect.notes || null,
          owner_id: user.id,
          stage: "new",
          lead_score: 50,
          source: "instantly_import",
        });

      if (error) {
        failed++;
      } else {
        success++;
      }

      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    setImportResults({ success, failed });
    setStep("complete");
    toast.success(`Imported ${success} prospects successfully`);
  };

  const reset = () => {
    setStep("upload");
    setCSVData([]);
    setCSVHeaders([]);
    setFieldMappings([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    setFileName("");
  };

  const requiredFieldsMapped = fieldMappings.some(m => m.crmField === "email") &&
                               (fieldMappings.some(m => m.crmField === "full_name") || 
                                fieldMappings.some(m => m.crmField === "first_name"));

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Instantly.ai CSV Import
        </CardTitle>
        <CardDescription>Import prospects from your Instantly.ai campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Drop your CSV here or click to browse</p>
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <Button variant="outline" asChild><span>Select CSV File</span></Button>
                </Label>
                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </div>
            </motion.div>
          )}

          {step === "mapping" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">File: {fileName}</p>
                  <p className="text-sm text-muted-foreground">{csvData.length} rows found</p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {fieldMappings.map((mapping) => (
                  <div key={mapping.csvField} className="flex items-center gap-3">
                    <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 text-sm">{mapping.csvField}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select value={mapping.crmField} onValueChange={(value) => updateMapping(mapping.csvField, value)}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRM_FIELDS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {!requiredFieldsMapped && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />Map Company Name and Email to continue
                </div>
              )}

              <Button onClick={handleImport} disabled={!requiredFieldsMapped} className="w-full">
                Import {csvData.length} Prospects
              </Button>
            </motion.div>
          )}

          {step === "importing" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 text-center py-8">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Importing prospects...</p>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 text-center py-8">
              <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <div className="flex justify-center gap-4">
                <Badge variant="outline" className="bg-green-500/10 text-green-500">{importResults.success} Imported</Badge>
                {importResults.failed > 0 && <Badge variant="outline" className="bg-red-500/10 text-red-500">{importResults.failed} Failed</Badge>}
              </div>
              <Button onClick={reset} variant="outline">Import Another File</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
