import { useState } from 'react';
import { AdminTableSkeleton } from "@/components/LoadingSkeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Shield, Languages } from 'lucide-react';
import { useBrandTerms, useCreateBrandTerm, useUpdateBrandTerm, useDeleteBrandTerm, type BrandTerm } from '@/hooks/use-brand-terms';
import { useActiveLanguages } from '@/hooks/use-translation-namespaces';

type LanguageConfig = { code: string; name: string; native_name: string; flag: string; is_active: boolean; is_default: boolean };

export default function BrandTermManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<BrandTerm | null>(null);
  const [formData, setFormData] = useState({ term: '', description: '', never_translate: true, priority: 0, translations: {} as Record<string, string> });
  
  const { data: brandTerms, isLoading } = useBrandTerms();
  const { data: languages } = useActiveLanguages();
  const createTerm = useCreateBrandTerm();
  const updateTerm = useUpdateBrandTerm();
  const deleteTerm = useDeleteBrandTerm();
  
  const handleOpenCreate = () => { setEditingTerm(null); setFormData({ term: '', description: '', never_translate: true, priority: 0, translations: {} }); setIsDialogOpen(true); };
  const handleOpenEdit = (term: BrandTerm) => { setEditingTerm(term); setFormData({ term: term.term, description: term.description || '', never_translate: term.never_translate, priority: term.priority, translations: term.translations }); setIsDialogOpen(true); };
  
  const handleSave = async () => {
    if (!formData.term.trim()) { toast.error('Term is required'); return; }
    try {
      if (editingTerm) { await updateTerm.mutateAsync({ id: editingTerm.id, ...formData }); toast.success('Brand term updated'); }
      else { await createTerm.mutateAsync(formData); toast.success('Brand term created'); }
      setIsDialogOpen(false);
    } catch { toast.error('Failed to save brand term'); }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand term?')) return;
    try { await deleteTerm.mutateAsync(id); toast.success('Brand term deleted'); } catch { toast.error('Failed to delete brand term'); }
  };
  
  const activeLanguages = ((languages || []) as LanguageConfig[]).filter(l => l.is_active && l.code !== 'en');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" />Add Term</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Protected Terms</CardTitle>
          <CardDescription>Terms marked as "never translate" will be preserved as-is in all languages.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <AdminTableSkeleton columns={5} /> : brandTerms?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No brand terms configured yet</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Description</TableHead><TableHead>Protection</TableHead><TableHead>Priority</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {brandTerms?.map(term => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.term}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{term.description || '-'}</TableCell>
                    <TableCell>{term.never_translate ? <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />Never Translate</Badge> : <Badge variant="outline"><Languages className="h-3 w-3 mr-1" />Custom</Badge>}</TableCell>
                    <TableCell><Badge variant="outline">{term.priority}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(term)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(term.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTerm ? 'Edit Brand Term' : 'Add Brand Term'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="term">Term *</Label><Input id="term" value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} placeholder="e.g., The Quantum Club" /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Why this term is protected" /></div>
            <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Never Translate</Label><p className="text-sm text-muted-foreground">Keep this term exactly as-is in all languages</p></div><Switch checked={formData.never_translate} onCheckedChange={(checked) => setFormData({ ...formData, never_translate: checked })} /></div>
            <div className="space-y-2"><Label htmlFor="priority">Priority (higher = processed first)</Label><Input id="priority" type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} /></div>
            {!formData.never_translate && (
              <div className="space-y-3"><Label>Custom Translations</Label><p className="text-sm text-muted-foreground">Provide specific translations for each language</p>
                {activeLanguages.map(lang => (
                  <div key={lang.code} className="flex items-center gap-3"><div className="w-24 flex items-center gap-2"><span>{lang.flag}</span><span className="text-sm">{lang.code.toUpperCase()}</span></div><Input value={formData.translations[lang.code] || ''} onChange={(e) => setFormData({ ...formData, translations: { ...formData.translations, [lang.code]: e.target.value } })} placeholder={`Translation for ${lang.name}`} /></div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={createTerm.isPending || updateTerm.isPending}>{editingTerm ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
