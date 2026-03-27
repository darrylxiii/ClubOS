import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Columns3, Plus, Pencil, Trash2, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface CustomField {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[];
  is_required: boolean;
  is_searchable: boolean;
  is_visible_in_list: boolean;
  display_order: number;
  section: string;
  placeholder: string;
  help_text: string;
  created_at: string;
}

const ENTITY_TYPES = ["candidate", "job", "company", "application"];
const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "phone", label: "Phone" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "file", label: "File Upload" },
];

export default function CustomFieldsManager() {
  const { t } = useTranslation('pages');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeEntity, setActiveEntity] = useState("candidate");
  const [form, setForm] = useState({
    entity_type: "candidate", field_name: "", field_label: "", field_type: "text",
    options: "", is_required: false, is_searchable: true, is_visible_in_list: false,
    section: "Custom Fields", placeholder: "", help_text: "",
  });

  useEffect(() => { fetchFields(); }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from("custom_field_definitions").select("*").order("entity_type, display_order");
    if (data) setFields(data);
    setLoading(false);
  };

  const entityFields = fields.filter(f => f.entity_type === activeEntity);

  const saveField = async () => {
    const payload = {
      entity_type: form.entity_type,
      field_name: form.field_name.toLowerCase().replace(/\s+/g, '_'),
      field_label: form.field_label,
      field_type: form.field_type,
      options: form.options ? form.options.split(',').map(s => s.trim()) : [],
      is_required: form.is_required,
      is_searchable: form.is_searchable,
      is_visible_in_list: form.is_visible_in_list,
      section: form.section,
      placeholder: form.placeholder,
      help_text: form.help_text,
      display_order: entityFields.length,
    };

    const { error } = await supabase.from("custom_field_definitions").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(t('toast.customFieldCreated', 'Custom field created'));
    setDialogOpen(false);
    setForm({ entity_type: activeEntity, field_name: "", field_label: "", field_type: "text", options: "", is_required: false, is_searchable: true, is_visible_in_list: false, section: "Custom Fields", placeholder: "", help_text: "" });
    fetchFields();
  };

  const deleteField = async (id: string) => {
    await supabase.from("custom_field_definitions").delete().eq("id", id);
    toast.success(t('toast.fieldDeleted', 'Field deleted'));
    fetchFields();
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Columns3 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('customFields', 'CUSTOM FIELDS')}</h1>
            </div>
            <p className="text-muted-foreground">{t('defineCustomDataFieldsFor', 'Define custom data fields for candidates, jobs, companies, and applications')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('addField', 'Add Field')}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('addCustomField', 'Add Custom Field')}</DialogTitle>
                <DialogDescription>Create a new custom field for {activeEntity} entities</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('entityType', 'Entity Type')}</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm(p => ({...p, entity_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>{t('fieldLabel', 'Field Label')}</Label><Input value={form.field_label} onChange={e => setForm(p => ({...p, field_label: e.target.value, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_')}))} placeholder={t('placeholder.securityClearance', 'Security Clearance')} /></div>
                  <div>
                    <Label>{t('fieldType', 'Field Type')}</Label>
                    <Select value={form.field_type} onValueChange={v => setForm(p => ({...p, field_type: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {(form.field_type === "select" || form.field_type === "multiselect") && (
                  <div><Label>{t("options_commaseparated", "Options (comma-separated)")}</Label><Input value={form.options} onChange={e => setForm(p => ({...p, options: e.target.value}))} placeholder={t('placeholder.option1Option2Option', 'Option 1, Option 2, Option 3')} /></div>
                )}
                <div><Label>{t("placeholder", "Placeholder")}</Label><Input value={form.placeholder} onChange={e => setForm(p => ({...p, placeholder: e.target.value}))} /></div>
                <div><Label>{t('helpText', 'Help Text')}</Label><Input value={form.help_text} onChange={e => setForm(p => ({...p, help_text: e.target.value}))} /></div>
                <div><Label>{t("section", "Section")}</Label><Input value={form.section} onChange={e => setForm(p => ({...p, section: e.target.value}))} /></div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2"><Switch checked={form.is_required} onCheckedChange={v => setForm(p => ({...p, is_required: v}))} /><span className="text-sm">{t("required", "Required")}</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_searchable} onCheckedChange={v => setForm(p => ({...p, is_searchable: v}))} /><span className="text-sm">{t("searchable", "Searchable")}</span></label>
                  <label className="flex items-center gap-2"><Switch checked={form.is_visible_in_list} onCheckedChange={v => setForm(p => ({...p, is_visible_in_list: v}))} /><span className="text-sm">{t('showInList', 'Show in List')}</span></label>
                </div>
              </div>
              <DialogFooter><Button onClick={saveField} disabled={!form.field_label}>{t('createField', 'Create Field')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {ENTITY_TYPES.map(entity => (
            <Card key={entity} className={activeEntity === entity ? "border-primary" : "cursor-pointer hover:border-primary/50"} onClick={() => setActiveEntity(entity)}>
              <CardHeader className="pb-2">
                <CardDescription className="capitalize">{entity} Fields</CardDescription>
                <CardTitle className="text-2xl">{fields.filter(f => f.entity_type === entity).length}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{activeEntity} Custom Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("label", "Label")}</TableHead>
                  <TableHead>{t('fieldName', 'Field Name')}</TableHead>
                  <TableHead>{t("type", "Type")}</TableHead>
                  <TableHead>{t("required", "Required")}</TableHead>
                  <TableHead>{t("searchable", "Searchable")}</TableHead>
                  <TableHead>{t("section", "Section")}</TableHead>
                  <TableHead>{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityFields.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.field_label}</TableCell>
                    <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                    <TableCell><Badge variant="outline">{f.field_type}</Badge></TableCell>
                    <TableCell>{f.is_required ? <Badge className="bg-red-600 text-xs">{t("required", "Required")}</Badge> : <span className="text-muted-foreground text-sm">{t("optional", "Optional")}</span>}</TableCell>
                    <TableCell>{f.is_searchable ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-sm">{f.section}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost"><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteField(f.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {entityFields.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No custom fields for {activeEntity}s yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
