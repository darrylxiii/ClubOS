import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect } from "react";
import { Building2, MapPin, Plus, Save, Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { EnhancedLocationAutocomplete, type LocationResult } from "@/components/ui/enhanced-location-autocomplete";
import { useCompanyOffices, useAddCompanyOffice, type CompanyOffice } from "@/hooks/useCompanyOffices";
import { Separator } from "@/components/ui/separator";

interface CompanyOfficeLocationPickerProps {
  companyId: string;
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  disabled?: boolean;
  className?: string;
}

export function CompanyOfficeLocationPicker({  companyId,
  value,
  onChange,
  disabled,
  className,
}: CompanyOfficeLocationPickerProps) {
const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [saveAsOffice, setSaveAsOffice] = useState(false);
  const [officeLabel, setOfficeLabel] = useState("");
  const [newLocation, setNewLocation] = useState<LocationResult | null>(null);

  const { data: offices = [], isLoading } = useCompanyOffices(companyId);
  const addOfficeMutation = useAddCompanyOffice();

  const hqOffices = useMemo(() => offices.filter((o) => o.is_headquarters), [offices]);
  const otherOffices = useMemo(() => offices.filter((o) => !o.is_headquarters), [offices]);

  // Auto-enter add mode when no offices exist
  useEffect(() => {
    if (!isLoading && offices.length === 0) {
      setAddingNew(true);
    }
  }, [isLoading, offices.length]);

  const handleSelectOffice = (office: CompanyOffice) => {
    const locationResult: LocationResult = {
      displayName: office.formatted_address || `${office.city || ""}, ${office.country || ""}`.trim(),
      city: office.city,
      country: office.country || "",
      countryCode: office.country_code || "",
      latitude: office.latitude || 0,
      longitude: office.longitude || 0,
      formattedAddress: office.formatted_address || "",
    };
    onChange(locationResult);
    setOpen(false);
    setAddingNew(false);
  };

  const handleNewLocationSelected = (location: LocationResult | null) => {
    setNewLocation(location);
    if (location && !saveAsOffice) {
      onChange(location);
      setAddingNew(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!newLocation) return;

    if (saveAsOffice && officeLabel.trim()) {
      await addOfficeMutation.mutateAsync({
        company_id: companyId,
        label: officeLabel.trim(),
        city: newLocation.city,
        country: newLocation.country,
        country_code: newLocation.countryCode,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        formatted_address: newLocation.formattedAddress,
        is_headquarters: false,
      });
    }

    onChange(newLocation);
    setAddingNew(false);
    setSaveAsOffice(false);
    setOfficeLabel("");
    setNewLocation(null);
  };

  const handleStartAddNew = () => {
    setOpen(false); // Close popover first
    setAddingNew(true);
  };

  const handleCancelAdd = () => {
    setAddingNew(false);
    setNewLocation(null);
    setSaveAsOffice(false);
    setOfficeLabel("");
  };

  const displayValue = value
    ? value.city
      ? `${value.city}, ${value.country}`
      : value.displayName
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Trigger button — opens popover only when NOT in add mode */}
      {!addingNew ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between h-11 min-h-[44px] font-normal text-sm",
                !displayValue && "text-muted-foreground"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
                {displayValue || "Select office location..."}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandList>
                {isLoading ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">{t("loading_offices", "Loading offices...")}</div>
                ) : offices.length === 0 ? (
                  <CommandEmpty>{t("no_offices_saved_yet", "No offices saved yet")}</CommandEmpty>
                ) : (
                  <>
                    {hqOffices.length > 0 && (
                      <CommandGroup heading="Headquarters">
                        {hqOffices.map((office) => (
                          <OfficeItem key={office.id} office={office} onSelect={handleSelectOffice} />
                        ))}
                      </CommandGroup>
                    )}
                    {otherOffices.length > 0 && (
                      <CommandGroup heading="Offices">
                        {otherOffices.map((office) => (
                          <OfficeItem key={office.id} office={office} onSelect={handleSelectOffice} />
                        ))}
                      </CommandGroup>
                    )}
                  </>
                )}
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleStartAddNew}
                    className="cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-primary font-medium">{t("add_new_location", "Add new location")}</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        /* Inline add-new form — rendered OUTSIDE the Popover so autocomplete dropdown works */
        <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {offices.length === 0
                ? "No offices yet — search for a location"
                : "Search for a location"}
            </Label>
            {offices.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
                className="h-7 text-xs"
              >
                Back
              </Button>
            )}
          </div>

          <EnhancedLocationAutocomplete
            value={newLocation}
            onChange={handleNewLocationSelected}
            placeholder={t("eg_amsterdam_netherlands", "e.g. Amsterdam, Netherlands")}
          />

          {newLocation && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="save-office"
                    checked={saveAsOffice}
                    onCheckedChange={(checked) => setSaveAsOffice(checked === true)}
                  />
                  <label htmlFor="save-office" className="text-sm cursor-pointer">
                    Save as company office
                  </label>
                </div>

                {saveAsOffice && (
                  <Input
                    placeholder="e.g. Berlin Office" value={officeLabel}
                    onChange={(e) => setOfficeLabel(e.target.value)}
                    className="h-9"
                  />
                )}

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleConfirmSave}
                  disabled={saveAsOffice && !officeLabel.trim()}
                  className="w-full"
                >
                  {saveAsOffice ? (
                    <>
                      <Save className="w-3 h-3 mr-1" /> Use & Save Office
                    </>
                  ) : (
                    "Use this location"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OfficeItem({
  office,
  onSelect,
}: {
  office: CompanyOffice;
  onSelect: (office: CompanyOffice) => void;
}) {
  return (
    <CommandItem
      onSelect={() => onSelect(office)}
      className="cursor-pointer"
    >
      <div className="flex items-center gap-2 w-full">
        {office.is_headquarters ? (
          <Star className="w-4 h-4 text-primary shrink-0" />
        ) : (
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{office.label}</span>
            {office.country_code && (
              <CountryFlag countryCode={office.country_code} size="sm" showTooltip={false} />
            )}
          </div>
          {office.city && (
            <p className="text-xs text-muted-foreground truncate">
              {office.city}{office.country ? `, ${office.country}` : ""}
            </p>
          )}
        </div>
      </div>
    </CommandItem>
  );
}
