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
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const [contactRoles, setContactRoles] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newContact, setNewContact] = useState({
    name: "",
    role_id: "",
    custom_role: "",
    email: "",
    phone: "",
    linkedin_url: "",
    notes: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    status: "new",
    priority: 5,
    location: "",
    website_url: "",
    notes: "",
    job_id: "",
  });

  useEffect(() => {
    loadOpenJobs();
    loadContactRoles();
    if (targetCompany?.id) {
      loadContacts();
    }
  }, [companyId, targetCompany?.id]);

  useEffect(() => {
    if (targetCompany) {
      setFormData({
        name: targetCompany.name || "",
        status: targetCompany.status || "new",
        priority: targetCompany.priority || 5,
        location: targetCompany.location || "",
        website_url: targetCompany.website_url || "",
        notes: targetCompany.notes || "",
        job_id: targetCompany.job_id || "",
      });
    } else {
      setFormData({
        name: "",
        status: "new",
        priority: 5,
        location: "",
        website_url: "",
        notes: "",
        job_id: "",
      });
      setContacts([]);
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

  const loadContactRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_roles")
        .select("*")
        .order("name");

      if (error) throw error;
      setContactRoles(data || []);
    } catch (error) {
      console.error("Error loading contact roles:", error);
    }
  };

  const loadContacts = async () => {
    if (!targetCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("target_company_contacts")
        .select("*, contact_roles(name)")
        .eq("target_company_id", targetCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const handleCompanySelect = async (company: { name: string; domain?: string; logo?: string; id?: string }) => {
    // Check if this is from our companies database
    let sourceCompanyId = null;
    let enrichmentSource: 'database' | 'clearbit' | 'manual' = 'manual';
    let logoUrl = '';

    if (company.id) {
      // Selected from companies database
      sourceCompanyId = company.id;
      enrichmentSource = 'database';
      
      // Fetch full company details
      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('logo_url, website_url, headquarters_location')
          .eq('id', company.id)
          .single();
        
        if (companyData) {
          logoUrl = companyData.logo_url || '';
          setFormData(prev => ({
            ...prev,
            name: company.name,
            website_url: companyData.website_url || prev.website_url,
            location: companyData.headquarters_location || prev.location,
          }));
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
      }
    } else {
      // Manual entry or external API result
      enrichmentSource = company.logo ? 'clearbit' : 'manual';
      logoUrl = company.logo || '';
      
      setFormData(prev => ({
        ...prev,
        name: company.name,
        website_url: company.domain ? `https://${company.domain}` : prev.website_url,
      }));
    }

    // Store enrichment metadata temporarily (will be saved on submit)
    (window as any).__tempEnrichmentData = {
      source_company_id: sourceCompanyId,
      enrichment_source: enrichmentSource,
      logo_url: logoUrl,
    };
  };

  const handleAddContact = async () => {
    if (!newContact.name) {
      toast.error("Vul minimaal een naam in");
      return;
    }

    if (!targetCompany) {
      // Store temporarily for new target company
      setContacts([...contacts, { ...newContact, id: Date.now().toString(), temp: true }]);
      setNewContact({
        name: "",
        role_id: "",
        custom_role: "",
        email: "",
        phone: "",
        linkedin_url: "",
        notes: "",
      });
      toast.success("Contact toegevoegd");
      return;
    }

    // Save to database for existing target company
    try {
      const { error } = await supabase
        .from("target_company_contacts")
        .insert({
          ...newContact,
          target_company_id: targetCompany.id,
          created_by: user!.id,
        });

      if (error) throw error;
      
      await loadContacts();
      setNewContact({
        name: "",
        role_id: "",
        custom_role: "",
        email: "",
        phone: "",
        linkedin_url: "",
        notes: "",
      });
      toast.success("Contact toegevoegd");
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Fout bij toevoegen contact");
    }
  };

  const handleDeleteContact = async (contactId: string, isTemp: boolean) => {
    if (isTemp) {
      setContacts(contacts.filter(c => c.id !== contactId));
      return;
    }

    try {
      const { error } = await supabase
        .from("target_company_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
      await loadContacts();
      toast.success("Contact verwijderd");
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Fout bij verwijderen contact");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Get enrichment data from temporary storage
      const enrichmentData = (window as any).__tempEnrichmentData || {};
      
      const data = {
        ...formData,
        job_id: formData.job_id || null,
        company_id: companyId,
        created_by: user.id,
        enrichment_source: enrichmentData.enrichment_source || 'manual',
        source_company_id: enrichmentData.source_company_id || null,
        logo_url: enrichmentData.logo_url || null,
      };

      if (targetCompany) {
        const { error } = await supabase
          .from("target_companies")
          .update(data)
          .eq("id", targetCompany.id);

        if (error) throw error;
        toast.success("Bedrijf bijgewerkt");
      } else {
        const { data: newCompany, error } = await supabase
          .from("target_companies")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        // Save temporary contacts
        if (contacts.length > 0) {
          const contactsToInsert = contacts.map(c => ({
            target_company_id: newCompany.id,
            name: c.name,
            role_id: c.role_id || null,
            custom_role: c.custom_role || null,
            email: c.email || null,
            phone: c.phone || null,
            linkedin_url: c.linkedin_url || null,
            notes: c.notes || null,
            created_by: user.id,
          }));

          const { error: contactsError } = await supabase
            .from("target_company_contacts")
            .insert(contactsToInsert);

          if (contactsError) throw contactsError;
        }

        toast.success("Bedrijf toegevoegd");
      }

      // Clear temporary enrichment data
      delete (window as any).__tempEnrichmentData;

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
              <div className="space-y-2">
                <Label htmlFor="name">Bedrijfsnaam *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={!!targetCompany}
                />
              </div>

              {targetCompany && (
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
                <Label htmlFor="notes">Notities</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Aanvullende opmerkingen, strategie, etc."
                  rows={4}
                />
              </div>

              {/* Company Insiders Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Company Insiders</Label>
                </div>

                {/* Existing Contacts */}
                {contacts.length > 0 && (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <Card key={contact.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="font-medium">{contact.name}</div>
                            {(contact.contact_roles?.name || contact.custom_role) && (
                              <div className="text-sm text-muted-foreground">
                                {contact.contact_roles?.name || contact.custom_role}
                              </div>
                            )}
                            {contact.email && (
                              <div className="text-xs text-muted-foreground">{contact.email}</div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteContact(contact.id, contact.temp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Add New Contact */}
                <Card className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Naam *</Label>
                    <Input
                      id="contact-name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="Naam contact"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="contact-role">Rol</Label>
                      <Select
                        value={newContact.role_id}
                        onValueChange={(value) => setNewContact({ ...newContact, role_id: value, custom_role: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {contactRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-role">Of Custom Rol</Label>
                      <Input
                        id="custom-role"
                        value={newContact.custom_role}
                        onChange={(e) => setNewContact({ ...newContact, custom_role: e.target.value, role_id: "" })}
                        placeholder="Andere rol"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        placeholder="email@bedrijf.nl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Telefoon</Label>
                      <Input
                        id="contact-phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        placeholder="+31 6 12345678"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-linkedin">LinkedIn URL</Label>
                    <Input
                      id="contact-linkedin"
                      value={newContact.linkedin_url}
                      onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-notes">Notities</Label>
                    <Textarea
                      id="contact-notes"
                      value={newContact.notes}
                      onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                      placeholder="Extra informatie over contact"
                      rows={2}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddContact}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Contact Toevoegen
                  </Button>
                </Card>
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
