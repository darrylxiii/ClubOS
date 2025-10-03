import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  industry: string | null;
  created_at: string;
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website_url: "",
    industry: "",
    slug: "",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
      
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            description: formData.description || null,
            website_url: formData.website_url || null,
            industry: formData.industry || null,
            slug,
          })
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast.success("Company updated successfully");
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({
            name: formData.name,
            description: formData.description || null,
            website_url: formData.website_url || null,
            industry: formData.industry || null,
            slug,
          });

        if (error) throw error;
        toast.success("Company created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error("Failed to save company");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Company deleted successfully");
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error("Failed to delete company");
    }
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description || "",
      website_url: company.website_url || "",
      industry: company.industry || "",
      slug: "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      description: "",
      website_url: "",
      industry: "",
      slug: "",
    });
  };

  if (loading) {
    return <div>Loading companies...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Management</CardTitle>
            <CardDescription>Create and manage partner companies</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCompany ? 'Edit' : 'Create'} Company</DialogTitle>
                <DialogDescription>
                  {editingCompany ? 'Update' : 'Add'} company information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingCompany ? 'Update' : 'Create'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Website</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No companies yet. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.industry || '-'}</TableCell>
                  <TableCell>
                    {company.website_url ? (
                      <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Visit
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(company)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(company.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
