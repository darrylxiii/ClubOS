import { useState } from "react";
import { useTranslation } from 'react-i18next';
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
import { migrateToast as toast } from "@/lib/notify";
import { Breadcrumb } from "@/components/Breadcrumb";

const getCategoryLabels = (t: (key: string) => string) => [
  { value: 'technical', label: t('support.categories.technical') },
  { value: 'billing', label: t('support.categories.billing') },
  { value: 'account', label: t('support.categories.account') },
  { value: 'feature_request', label: t('support.categories.featureRequest') },
  { value: 'bug', label: t('support.categories.bug') },
  { value: 'other', label: t('support.categories.other') },
];

const getPriorityLabels = (t: (key: string) => string) => [
  { value: 'low', label: t('support.priorities.low'), color: 'text-gray-500' },
  { value: 'medium', label: t('support.priorities.medium'), color: 'text-blue-500' },
  { value: 'high', label: t('support.priorities.high'), color: 'text-orange-500' },
  { value: 'urgent', label: t('support.priorities.urgent'), color: 'text-red-500' },
];

export default function SupportTicketNew() {
  const { t } = useTranslation('common');
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
        title: t('support.missingInfo'),
        description: t('support.fillRequired'),
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
        title: t('support.ticketCreated'),
        description: t('support.ticketCreatedDesc', { number: data.ticket.ticket_number, minutes: data.ticket.sla_target_response_minutes || 120 }),
      });

      navigate(`/support/tickets/${data.ticket.id}`);
    } catch (error: unknown) {
      console.error('Error creating ticket:', error);
      toast({
        title: t('common.error'),
        description: t('support.createError'),
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
        {t('support.backToTickets')}
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('support.createTicket')}</h1>
        <p className="text-muted-foreground">
          {t('support.createDesc')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('support.category')} <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('support.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {getCategoryLabels(t).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('support.priority')}</label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPriorityLabels(t).map((pri) => (
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
                {t('support.subject')} <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder={t('support.subjectPlaceholder')}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('support.description')} <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder={t('support.descriptionPlaceholder')}
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
              <p className="font-medium mb-1">{t('support.beforeSubmitting')}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{t('support.checkKb')} <a href="/help" className="text-primary hover:underline">{t('support.knowledgeBase')}</a></li>
                <li>{t('support.includeErrors')}</li>
                <li>{t('support.describeSteps')}</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? t('support.creating') : t('support.createTicket')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/support/tickets')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
