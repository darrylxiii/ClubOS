import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Award, Plus, Trash2, ExternalLink, Loader2, Calendar, Building } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
}

interface FreelanceCertificationsSectionProps {
  userId: string;
  freelanceProfile: any;
  onUpdate: () => void;
}

export function FreelanceCertificationsSection({ userId, freelanceProfile, onUpdate }: FreelanceCertificationsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");

  useEffect(() => {
    if (freelanceProfile?.certifications) {
      setCertifications(freelanceProfile.certifications as Certification[]);
    }
  }, [freelanceProfile]);

  const resetForm = () => {
    setName("");
    setIssuer("");
    setIssueDate("");
    setExpiryDate("");
    setCredentialId("");
    setCredentialUrl("");
    setEditingCert(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (cert: Certification) => {
    setEditingCert(cert);
    setName(cert.name);
    setIssuer(cert.issuer);
    setIssueDate(cert.issue_date || "");
    setExpiryDate(cert.expiry_date || "");
    setCredentialId(cert.credential_id || "");
    setCredentialUrl(cert.credential_url || "");
    setIsDialogOpen(true);
  };

  const handleSaveCert = async () => {
    if (!name.trim() || !issuer.trim()) {
      toast.error("Name and issuer are required");
      return;
    }

    setSaving(true);
    try {
      const newCert: Certification = {
        id: editingCert?.id || crypto.randomUUID(),
        name: name.trim(),
        issuer: issuer.trim(),
        issue_date: issueDate || undefined,
        expiry_date: expiryDate || undefined,
        credential_id: credentialId.trim() || undefined,
        credential_url: credentialUrl.trim() || undefined,
      };

      let updatedCerts: Certification[];
      if (editingCert) {
        updatedCerts = certifications.map(cert => 
          cert.id === editingCert.id ? newCert : cert
        );
      } else {
        updatedCerts = [...certifications, newCert];
      }

      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          certifications: updatedCerts as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      setCertifications(updatedCerts);
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingCert ? "Certification updated" : "Certification added");
      onUpdate();
    } catch (error: unknown) {
      console.error("Error saving certification:", error);
      toast.error("Failed to save certification");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    setSaving(true);
    try {
      const updatedCerts = certifications.filter(cert => cert.id !== certId);

      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          certifications: updatedCerts as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      setCertifications(updatedCerts);
      toast.success("Certification deleted");
      onUpdate();
    } catch (error: unknown) {
      console.error("Error deleting certification:", error);
      toast.error("Failed to delete certification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications & Credentials
            </CardTitle>
            <CardDescription>
              Add professional certifications to boost your credibility
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Certification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCert ? "Edit Certification" : "Add Certification"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cert-name">Certification Name *</Label>
                  <Input
                    id="cert-name"
                    placeholder="AWS Solutions Architect"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-issuer" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Issuing Organization *
                  </Label>
                  <Input
                    id="cert-issuer"
                    placeholder="Amazon Web Services"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-date" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Issue Date
                    </Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry-date">Expiry Date</Label>
                    <Input
                      id="expiry-date"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credential-id">Credential ID</Label>
                  <Input
                    id="credential-id"
                    placeholder="ABC123XYZ"
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credential-url">Credential URL</Label>
                  <Input
                    id="credential-url"
                    type="url"
                    placeholder="https://verify.example.com/..."
                    value={credentialUrl}
                    onChange={(e) => setCredentialUrl(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCert} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {certifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No certifications added yet</p>
            <p className="text-sm">Add certifications to build trust with clients</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{cert.name}</h4>
                    <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                    {cert.issue_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued: {format(new Date(cert.issue_date), 'MMM yyyy')}
                        {cert.expiry_date && ` • Expires: ${format(new Date(cert.expiry_date), 'MMM yyyy')}`}
                      </p>
                    )}
                    {cert.credential_id && (
                      <p className="text-xs text-muted-foreground">
                        Credential ID: {cert.credential_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {cert.credential_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(cert.credential_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(cert)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteCert(cert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
