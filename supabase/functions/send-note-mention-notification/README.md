# Note Mention Notification Edge Function

This edge function handles @mention notifications when team members are mentioned in candidate notes.

## Current Functionality

✅ **Implemented:**
- Detects @mentions in note content (format: `@[uuid](Name)`)
- Creates `note_mentions` table records
- Sends in-app notifications to mentioned users
- Triggered automatically by database trigger on note creation/update
- Real-time notification updates via Supabase Realtime

## Future: Email Notifications

📧 **To Enable Email Notifications:**

### 1. Choose Email Service Provider

**Option A: Resend (Recommended)**
- Modern, developer-friendly API
- Generous free tier (3,000 emails/month)
- Great deliverability
- Add secret: `RESEND_API_KEY`
- Sender: `notifications@thequantumclub.com`

**Option B: SendGrid**
- Enterprise-grade
- 100 emails/day free tier
- Add secret: `SENDGRID_API_KEY`
- Configure sender verification

### 2. Add API Key Secret

```bash
# Using Lovable Secrets Manager
1. Go to Project Settings → Secrets
2. Add new secret: RESEND_API_KEY or SENDGRID_API_KEY
3. Enter your API key
```

### 3. Uncomment Email Code

In `send-note-mention-notification/index.ts`, uncomment the email sending section:

```typescript
// Import the email templates
import { sendMentionEmail, generateMentionEmailHTML } from '../_shared/email-notification-templates.ts';

// In the loop where notifications are created:
if (RESEND_API_KEY) {
  await sendMentionEmail({
    recipientName: mentionedUser.full_name,
    recipientEmail: mentionedUser.email,
    mentionedBy: creator?.full_name || 'Someone',
    candidateName: candidateName,
    noteExcerpt: note.content.substring(0, 150) + '...',
    noteUrl: `https://app.thequantumclub.com/candidate/${candidateId}`
  });
}
```

### 4. Add User Preferences

Before sending emails, check user's notification preferences:

```sql
-- Add to profiles or create notification_preferences table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mention_email_enabled BOOLEAN DEFAULT true;
```

Then check preferences before sending:

```typescript
const { data: userPrefs } = await supabase
  .from('profiles')
  .select('mention_email_enabled')
  .eq('id', mentionedUserId)
  .single();

if (userPrefs?.mention_email_enabled) {
  await sendMentionEmail(emailData);
}
```

### 5. Configure Sender Domain

For production, configure proper sender domain:
- Add DNS records (SPF, DKIM, DMARC)
- Verify domain with email provider
- Use branded sender: `notifications@thequantumclub.com`
- Add reply-to: `support@thequantumclub.com`

### 6. Email Best Practices

- ✅ Include unsubscribe link
- ✅ Respect quiet hours (no emails 10pm-8am user's timezone)
- ✅ Batch multiple mentions (don't spam if mentioned 5x in 1 hour)
- ✅ Include plaintext version
- ✅ Mobile-responsive HTML
- ✅ Track open rates (optional)

## Testing

Test the notification flow:

1. **Create a test note with @mention:**
   ```
   Hey @[uuid](John Doe), can you review this candidate?
   ```

2. **Check in-app notification:**
   - Bell icon should show unread count
   - Notification appears in panel
   - Click navigates to candidate profile

3. **Check database records:**
   ```sql
   SELECT * FROM note_mentions WHERE mentioned_user_id = 'uuid';
   SELECT * FROM notifications WHERE type = 'mention';
   ```

4. **Test email (when enabled):**
   - Use test email service (Resend has test mode)
   - Check spam folder
   - Verify links work
   - Test on mobile

## Monitoring

Watch for:
- Email delivery failures
- Bounce rates
- User complaints
- Notification spam (too many mentions)

## Rate Limiting

Consider adding rate limits:
- Max 10 mentions per note
- Max 50 mention emails per user per day
- Batch notifications if user mentioned multiple times in short period
