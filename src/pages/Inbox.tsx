import { useTranslation } from 'react-i18next';
import { EmailInbox } from "@/components/email/EmailInbox";

export default function Inbox() {
  const { t } = useTranslation('messages');
  return <EmailInbox />;
}
