import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Send } from "lucide-react";
import { EmailTemplatePreview } from "./EmailTemplatePreview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmailTemplateEditorProps {
  template: any;
  onClose: () => void;
}

export function EmailTemplateEditor({ template, onClose }: EmailTemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || '',
    subject_template: template.subject_template,
    content_template: JSON.stringify(template.content_template, null, 2),
    is_enabled: template.is_enabled,
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      let contentJson;
      try {
        contentJson = JSON.parse(formData.content_template);
      } catch (e) {
        toast.error('Invalid JSON in content template');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('email_templates')
        .update({
          name: formData.name,
          description: formData.description,
          subject_template: formData.subject_template,
          content_template: contentJson,
          is_enabled: formData.is_enabled,
        })
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Template updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: {
          templateKey: template.template_key,
          testEmail: testEmail,
        }
      });

      if (error) throw error;

      toast.success(`Test email sent to ${testEmail}`);
      setShowTestDialog(false);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Template</h1>
              <p className="text-muted-foreground">{template.template_key}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={() => setShowTestDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject Template</Label>
                  <Input
                    id="subject"
                    value={formData.subject_template}
                    onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
                  />
                  <Label htmlFor="enabled">Template Enabled</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Template (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.content_template}
                  onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder='{"heading": "...", "intro": "..."}'
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.variables && Object.entries(template.variables).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">{`{${key}}`}</code>
                      <p className="text-muted-foreground mt-1">{value as string}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Category:</strong> {template.category}
                </div>
                <div>
                  <strong>Edge Function:</strong> {template.edge_function}
                </div>
                <div>
                  <strong>Last Modified:</strong>{' '}
                  {new Date(template.last_modified_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview how this email will look to recipients
            </DialogDescription>
          </DialogHeader>
          <EmailTemplatePreview
            template={template}
            contentOverride={formData.content_template}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Enter an email address to receive a test version of this template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest}>
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
