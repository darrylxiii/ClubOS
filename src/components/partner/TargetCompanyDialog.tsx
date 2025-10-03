import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySearch } from "@/components/CompanySearch";
import { toast } from "sonner";

interface TargetCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  targetCompany?: any | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "targetting", label: "Targetting" },
  { value: "hunting", label: "Hunting" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
];

export function TargetCompanyDialog({
  open,
  onOpenChange,
  companyId,
  targetCompany,
  onSuccess,
}: TargetCompanyDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "manual">("search");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    status: "new",
    industry: "",
    priority: 5,
    location: "",
    website_url: "",
    logo_url: "",
    company_insider: "",
    notes: "",
    job_id: "",
  });

  useEffect(() => {
    loadOpenJobs();
  }, [companyId]);

  useEffect(() => {
    if (targetCompany) {
      setFormData({
        name: targetCompany.name || "",
        status: targetCompany.status || "new",
        industry: targetCompany.industry || "",
        priority: targetCompany.priority || 5,
        location: targetCompany.location || "",
        website_url: targetCompany.website_url || "",
        logo_url: targetCompany.logo_url || "",
        company_insider: targetCompany.company_insider || "",
        notes: targetCompany.notes || "",
        job_id: targetCompany.job_id || "",
      });
    } else {
      setFormData({
        name: "",
        status: "new",
        industry: "",
        priority: 5,
        location: "",
        website_url: "",
        logo_url: "",
        company_insider: "",
        notes: "",
        job_id: "",
      });
    }
  }, [targetCompany, open]);

  const loadOpenJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status")
        .eq("company_id", companyId)
        .in("status", ["draft", "published"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpenJobs(data || []);
    } catch (error) {
      console.error("Error loading jobs:", error);
    }
  };

  const handleCompanySelect = async (company: { name: string; domain?: string; logo?: string }) => {
    setFormData(prev => ({
      ...prev,
      name: company.name,
      website_url: company.domain ? `https://${company.domain}` : prev.website_url,
    }));
    setAddMode("manual"); // Switch to manual to show the filled form
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        job_id: formData.job_id || null,
        company_id: companyId,
        created_by: user.id,
      };

      if (targetCompany) {
        const { error } = await supabase
          .from("target_companies")
          .update(data)
          .eq("id", targetCompany.id);

        if (error) throw error;
        toast.success("Bedrijf bijgewerkt");
      } else {
        const { error } = await supabase.from("target_companies").insert(data);

        if (error) throw error;
        toast.success("Bedrijf toegevoegd");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving target company:", error);
      toast.error("Fout bij opslaan van bedrijf");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {targetCompany ? "Bewerk Bedrijf" : "Nieuw Target Bedrijf"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!targetCompany && (
            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "search" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">Zoek in Repository</TabsTrigger>
                <TabsTrigger value="manual">Handmatig Toevoegen</TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Zoek Bedrijf</Label>
                  <CompanySearch
                    value={companySearchQuery}
                    onChange={setCompanySearchQuery}
                    onSelect={handleCompanySelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Zoek bestaande bedrijven - naam en website worden automatisch ingevuld
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bedrijfsnaam *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Naam van het bedrijf"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {(targetCompany || formData.name) && (
            <>
              {!targetCompany && (
                <div className="space-y-2">
                  <Label htmlFor="name-display">Bedrijfsnaam *</Label>
                  <Input
                    id="name-display"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              )}

              {targetCompany && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Bedrijfsnaam *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Locatie</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="bijv. Amsterdam, Nederland"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) =>
                    setFormData({ ...formData, website_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Prioriteit: {formData.priority}</Label>
                <Slider
                  value={[formData.priority]}
                  onValueChange={([value]) => setFormData({ ...formData, priority: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Laag (1)</span>
                  <span>Hoog (10)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_id">Target voor Specifieke Job</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.job_id || undefined}
                    onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een open job (optioneel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {openJobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title} ({job.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.job_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData({ ...formData, job_id: "" })}
                    >
                      ×
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecteer de job waarvoor dit bedrijf getarget wordt, of laat leeg voor alle jobs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_insider">Company Insider</Label>
                <Input
                  id="company_insider"
                  value={formData.company_insider}
                  onChange={(e) =>
                    setFormData({ ...formData, company_insider: e.target.value })
                  }
                  placeholder="Naam van interne contact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notities</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Aanvullende opmerkingen, strategie, etc."
                  rows={4}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Opslaan..." : targetCompany ? "Bijwerken" : "Toevoegen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
