import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Upload, CheckCircle2 } from "lucide-react";

interface EthicsReportFormProps {
  className?: string;
}

export function EthicsReportForm({ className }: EthicsReportFormProps) {
  const { t } = useTranslation("common");

  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const generateReferenceNumber = useCallback(() => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WB-${timestamp}-${random}`;
  }, []);

  // TODO: Wire this to a Supabase Edge Function or database table to persist reports.
  // Currently client-only — generates a reference number but does not save the report
  // or uploaded evidence. Needs: insert into ethics_reports table, upload file to Storage.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !severity || !description.trim()) return;
    const ref = generateReferenceNumber();
    setReferenceNumber(ref);
    setSubmitted(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  if (submitted) {
    return (
      <Card className={`p-8 text-center ${className ?? ""}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold">
            {t("whistleblower.form.successTitle", "Report Submitted Successfully")}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {t(
              "whistleblower.form.successMessage",
              "Your report has been received and will be reviewed by our ethics team. You will receive acknowledgment within 7 days."
            )}
          </p>
          <div className="mt-2 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-1">
              {t("whistleblower.form.referenceLabel", "Your Reference Number")}
            </p>
            <p className="text-lg font-mono font-bold text-primary">{referenceNumber}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm">
            {t(
              "whistleblower.form.saveReference",
              "Please save this reference number. You may need it to follow up on your report."
            )}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 md:p-8 ${className ?? ""}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {t("whistleblower.form.title", "Submit an Ethics Report")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              "whistleblower.form.subtitle",
              "All reports are protected under the EU Whistleblower Directive (2019/1937)"
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Anonymous toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div>
            <Label htmlFor="anonymous-toggle" className="font-medium">
              {t("whistleblower.form.anonymousLabel", "Submit anonymously")}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "whistleblower.form.anonymousHint",
                "Your identity will not be recorded or stored"
              )}
            </p>
          </div>
          <Switch
            id="anonymous-toggle"
            checked={anonymous}
            onCheckedChange={setAnonymous}
          />
        </div>

        {/* Name & Email (hidden when anonymous) */}
        {!anonymous && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reporter-name">
                {t("whistleblower.form.nameLabel", "Name")}
                <span className="text-xs text-muted-foreground ml-1">
                  ({t("whistleblower.form.optional", "optional")})
                </span>
              </Label>
              <Input
                id="reporter-name"
                placeholder={t("whistleblower.form.namePlaceholder", "Your name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporter-email">
                {t("whistleblower.form.emailLabel", "Email")}
                <span className="text-xs text-muted-foreground ml-1">
                  ({t("whistleblower.form.optional", "optional")})
                </span>
              </Label>
              <Input
                id="reporter-email"
                type="email"
                placeholder={t("whistleblower.form.emailPlaceholder", "your@email.com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="report-category">
            {t("whistleblower.form.categoryLabel", "Category")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="report-category">
              <SelectValue
                placeholder={t("whistleblower.form.categoryPlaceholder", "Select a category")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fraud">
                {t("whistleblower.form.categoryFraud", "Fraud")}
              </SelectItem>
              <SelectItem value="data-breach">
                {t("whistleblower.form.categoryDataBreach", "Data Breach")}
              </SelectItem>
              <SelectItem value="discrimination">
                {t("whistleblower.form.categoryDiscrimination", "Discrimination")}
              </SelectItem>
              <SelectItem value="harassment">
                {t("whistleblower.form.categoryHarassment", "Harassment")}
              </SelectItem>
              <SelectItem value="safety">
                {t("whistleblower.form.categorySafety", "Safety Violation")}
              </SelectItem>
              <SelectItem value="legal-violation">
                {t("whistleblower.form.categoryLegalViolation", "Legal Violation")}
              </SelectItem>
              <SelectItem value="other">
                {t("whistleblower.form.categoryOther", "Other")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <Label htmlFor="report-severity">
            {t("whistleblower.form.severityLabel", "Severity")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger id="report-severity">
              <SelectValue
                placeholder={t("whistleblower.form.severityPlaceholder", "Select severity level")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                {t("whistleblower.form.severityLow", "Low")}
              </SelectItem>
              <SelectItem value="medium">
                {t("whistleblower.form.severityMedium", "Medium")}
              </SelectItem>
              <SelectItem value="high">
                {t("whistleblower.form.severityHigh", "High")}
              </SelectItem>
              <SelectItem value="critical">
                {t("whistleblower.form.severityCritical", "Critical")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="report-description">
            {t("whistleblower.form.descriptionLabel", "Description")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Textarea
            id="report-description"
            placeholder={t(
              "whistleblower.form.descriptionPlaceholder",
              "Please describe the incident or concern in as much detail as possible..."
            )}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* File attachment */}
        <div className="space-y-2">
          <Label htmlFor="report-file">
            {t("whistleblower.form.fileLabel", "Supporting Evidence")}
            <span className="text-xs text-muted-foreground ml-1">
              ({t("whistleblower.form.optional", "optional")})
            </span>
          </Label>
          <div className="flex items-center gap-3">
            <label
              htmlFor="report-file"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t("whistleblower.form.fileButton", "Attach File")}
            </label>
            <input
              id="report-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
            />
            {file && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {file.name}
              </span>
            )}
          </div>
        </div>

        {/* EU Directive notice */}
        <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t(
                "whistleblower.form.protectionNotice",
                "This report is protected under EU Directive 2019/1937 (Whistleblower Protection Directive). You are guaranteed protection against retaliation, and your confidentiality will be maintained throughout the investigation process."
              )}
            </p>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!category || !severity || !description.trim()}
        >
          <Shield className="w-4 h-4 mr-2" />
          {t("whistleblower.form.submitButton", "Submit Protected Report")}
        </Button>
      </form>
    </Card>
  );
}
