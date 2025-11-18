import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";

const categories = [
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing' },
  { value: 'account', label: 'Account' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'low', label: 'Low - General question', color: 'text-gray-500' },
  { value: 'medium', label: 'Medium - Not blocking work', color: 'text-blue-500' },
  { value: 'high', label: 'High - Blocking some work', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgent - Blocking all work', color: 'text-red-500' },
];

export default function SupportTicketNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    priority: 'medium',
    subject: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.subject || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const metadata = {
        browser: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase.functions.invoke('create-support-ticket', {
        body: {
          user_id: user?.id,
          email: user?.email,
          ...formData,
          metadata,
        },
      });

      if (error) throw error;

      toast({
        title: "Ticket Created",
        description: `Your ticket ${data.ticket.ticket_number} has been created. We'll respond within ${data.ticket.sla_target_response_minutes || 120} minutes.`,
      });

      navigate(`/support/tickets/${data.ticket.id}`);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedResponseTime = formData.priority === 'urgent' ? '30 minutes' :
    formData.priority === 'high' ? '2 hours' :
    formData.priority === 'medium' ? '4 hours' : '24 hours';

  return (
    <AppLayout>
      <div className="container max-w-3xl py-8">
        <Breadcrumb items={[
          { label: 'Home', path: '/home' },
          { label: 'Support', path: '/support/tickets' },
          { label: 'New Ticket' }
        ]} />
      
      <Button
        variant="ghost"
        onClick={() => navigate('/support/tickets')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tickets
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Support Ticket</h1>
        <p className="text-muted-foreground">
          Describe your issue and we'll get back to you as soon as possible
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((pri) => (
                    <SelectItem key={pri.value} value={pri.value}>
                      <span className={pri.color}>{pri.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Estimated response time: <span className="font-medium">{estimatedResponseTime}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Subject <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Please provide as much detail as possible..."
                rows={8}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted/50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Before submitting:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check our <a href="/help" className="text-primary hover:underline">Knowledge Base</a> for instant answers</li>
                <li>Include error messages or screenshots if applicable</li>
                <li>Describe steps to reproduce the issue</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Ticket'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/support/tickets')}
          >
            Cancel
          </Button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}
