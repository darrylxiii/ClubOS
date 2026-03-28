import { useTranslation } from 'react-i18next';
import { EmailInbox } from "@/components/email/EmailInbox";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Mail } from "lucide-react";

export default function Inbox() {
  const { t } = useTranslation('messages');

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: t('inbox.breadcrumb.home', 'Home'), path: '/home' },
          { label: t('inbox.breadcrumb.inbox', 'Inbox') }
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('inbox.title', 'Inbox')}</h1>
          <p className="text-sm text-muted-foreground">{t('inbox.description', 'Manage your email communications and notifications')}</p>
        </div>
      </div>

      {/* Email Client */}
      <EmailInbox />
    </div>
  );
}
