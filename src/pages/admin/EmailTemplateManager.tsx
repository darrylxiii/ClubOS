import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Edit2, Loader2 } from "lucide-react";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string;
  category: string;
  subject_template: string;
  content_template: any;
  variables: any;
  is_enabled: boolean;
  edge_function: string;
  last_modified_at: string;
}

export default function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState("member_requests");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const categorizedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const categories = [
    { key: 'member_requests', label: 'Member Requests' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'system', label: 'System' },
  ];

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCloseEditor = () => {
    setSelectedTemplate(null);
    fetchTemplates();
  };

  if (selectedTemplate) {
    return (
      <EmailTemplateEditor
        template={selectedTemplate}
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Email Template Manager</h1>
          <p className="text-muted-foreground mt-2">
            View, edit, and preview all email templates sent by The Quantum Club
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList>
              {categories.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key}>
                  {cat.label}
                  <Badge variant="secondary" className="ml-2">
                    {categorizedTemplates[cat.key]?.length || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(cat => (
              <TabsContent key={cat.key} value={cat.key} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedTemplates[cat.key]?.map(template => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <Badge variant={template.is_enabled ? "default" : "secondary"}>
                            {template.is_enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            <strong>Subject:</strong> {template.subject_template}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <strong>Function:</strong> {template.edge_function}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {(!categorizedTemplates[cat.key] || categorizedTemplates[cat.key].length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    No email templates found in this category
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
