import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Building2, MapPin, Plus, Star, Trash2, Edit2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/ui/country-flag";
import { Separator } from "@/components/ui/separator";
import { EnhancedLocationAutocomplete, type LocationResult } from "@/components/ui/enhanced-location-autocomplete";
import {
  useCompanyOffices,
  useAddCompanyOffice,
  useUpdateCompanyOffice,
  useDeleteCompanyOffice,
  type CompanyOffice,
} from "@/hooks/useCompanyOffices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CompanyOfficeManagerProps {
  companyId: string;
  canManage?: boolean;
}

export function CompanyOfficeManager({ companyId, canManage = true }: CompanyOfficeManagerProps) {
  const { t } = useTranslation('common');
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newLocation, setNewLocation] = useState<LocationResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const { data: offices = [], isLoading } = useCompanyOffices(companyId);
  const addOffice = useAddCompanyOffice();
  const updateOffice = useUpdateCompanyOffice();
  const deleteOffice = useDeleteCompanyOffice();

  const handleAdd = async () => {
    if (!newLocation || !newLabel.trim()) return;

    await addOffice.mutateAsync({
      company_id: companyId,
      label: newLabel.trim(),
      city: newLocation.city,
      country: newLocation.country,
      country_code: newLocation.countryCode,
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      formatted_address: newLocation.formattedAddress,
      is_headquarters: offices.length === 0,
    });

    setNewLabel("");
    setNewLocation(null);
    setAddingNew(false);
  };

  const handleToggleHQ = async (office: CompanyOffice) => {
    if (office.is_headquarters) return; // Can't un-HQ, must set another

    // Remove HQ from current
    const currentHQ = offices.find((o) => o.is_headquarters);
    if (currentHQ) {
      await updateOffice.mutateAsync({ id: currentHQ.id, is_headquarters: false });
    }
    await updateOffice.mutateAsync({ id: office.id, is_headquarters: true });
  };

  const handleSaveLabel = async (officeId: string) => {
    if (!editLabel.trim()) return;
    await updateOffice.mutateAsync({ id: officeId, label: editLabel.trim() });
    setEditingId(null);
  };

  return (
    <Card variant="static">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Office Locations
            </CardTitle>
            <CardDescription>{t("manage_company_offices_used", "Manage company offices used in job postings")}</CardDescription>
          </div>
          {canManage && !addingNew && (
            <Button size="sm" variant="outline" onClick={() => setAddingNew(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Office
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading_offices", "Loading offices...")}</p>
        ) : offices.length === 0 && !addingNew ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("no_office_locations_added", "No office locations added yet")}</p>
            {canManage && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddingNew(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add your first office
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {offices.map((office) => (
              <div
                key={office.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-card/40 group"
              >
                {office.is_headquarters ? (
                  <Star className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {editingId === office.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLabel(office.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveLabel(office.id)}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{office.label}</span>
                      {office.is_headquarters && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">HQ</Badge>
                      )}
                      {office.country_code && (
                        <CountryFlag countryCode={office.country_code} size="sm" />
                      )}
                    </div>
                  )}
                  {editingId !== office.id && (
                    <p className="text-xs text-muted-foreground truncate">
                      {office.formatted_address || office.city || "No address"}
                    </p>
                  )}
                </div>

                {canManage && editingId !== office.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!office.is_headquarters && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleToggleHQ(office)}
                        title={t("set_as_headquarters", "Set as headquarters")}
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(office.id);
                        setEditLabel(office.label);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("remove_office", "Remove office?")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove "{office.label}" from the company's offices. Existing jobs using this location will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteOffice.mutate({ id: office.id, companyId })}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingNew && (
          <>
            <Separator />
            <div className="space-y-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
              <Label className="text-sm font-medium">{t("add_new_office", "Add New Office")}</Label>
              <Input
                placeholder="Office name, e.g. London Office" value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <EnhancedLocationAutocomplete
                value={newLocation}
                onChange={setNewLocation}
                placeholder={t("search_for_address", "Search for address...")}
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingNew(false);
                    setNewLabel("");
                    setNewLocation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAdd}
                  disabled={!newLabel.trim() || !newLocation || addOffice.isPending}
                  loading={addOffice.isPending}
                >
                  Add Office
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
