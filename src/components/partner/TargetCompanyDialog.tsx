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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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
  });
  const [jobSpecs, setJobSpecs] = useState<string[]>([]);
  const [newJobSpec, setNewJobSpec] = useState("");

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
      });
      setJobSpecs(
        Array.isArray(targetCompany.job_specifications)
          ? targetCompany.job_specifications
          : []
      );
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
      });
      setJobSpecs([]);
    }
  }, [targetCompany, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        job_specifications: jobSpecs,
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

  const addJobSpec = () => {
    if (newJobSpec.trim() && !jobSpecs.includes(newJobSpec.trim())) {
      setJobSpecs([...jobSpecs, newJobSpec.trim()]);
      setNewJobSpec("");
    }
  };

  const removeJobSpec = (spec: string) => {
    setJobSpecs(jobSpecs.filter((s) => s !== spec));
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
          <div className="grid gap-4 md:grid-cols-2">
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

            <div className="space-y-2">
              <Label htmlFor="industry">Industrie</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="bijv. Fashion, Tech, Health"
              />
            </div>

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
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
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
            <Label>Functie Specificaties</Label>
            <div className="flex gap-2">
              <Input
                value={newJobSpec}
                onChange={(e) => setNewJobSpec(e.target.value)}
                placeholder="bijv. Retail Manager, E-Commerce Lead"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addJobSpec();
                  }
                }}
              />
              <Button type="button" onClick={addJobSpec} variant="secondary">
                Toevoegen
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {jobSpecs.map((spec) => (
                <Badge key={spec} variant="secondary" className="gap-1">
                  {spec}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeJobSpec(spec)}
                  />
                </Badge>
              ))}
            </div>
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