import { createHandler } from '../_shared/handler.ts';
import { sendEmail } from '../_shared/resend-client.ts';
import { getAppUrl } from '../_shared/app-config.ts';
import { EMAIL_SENDERS } from '../_shared/email-config.ts';
import { baseEmailTemplate } from '../_shared/email-templates/base-template.ts';
import { Heading, Paragraph, Spacer, Button, Divider } from '../_shared/email-templates/components.ts';
import { z, parseBody, uuidSchema } from '../_shared/validation.ts';

const requestSchema = z.object({
  postId: uuidSchema,
});

const LOG = '[blog-newsletter-send]';

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { postId } = parsed.data;

  const { supabase, corsHeaders } = ctx;

  // Fetch the post
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, meta_description, category, hero_image, author_id')
    .eq('id', postId)
    .eq('status', 'published')
    .single();

  if (postError || !post) {
    throw new Error(`${LOG} Published post not found: ${postError?.message || postId}`);
  }

  // Fetch active subscribers with unsubscribe tokens
  const { data: subscribers, error: subError } = await supabase
    .from('blog_subscribers')
    .select('id, email, unsubscribe_token')
    .is('unsubscribed_at', null);

  if (subError) throw subError;
  if (!subscribers?.length) {
    console.log(`${LOG} No active subscribers for "${post.title}"`);
    return new Response(JSON.stringify({ message: 'No active subscribers', sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const appUrl = getAppUrl();
  const articleUrl = `${appUrl}/blog/${post.category}/${post.slug}`;
  const description = post.meta_description || post.excerpt || '';
  const heroUrl = post.hero_image?.url && post.hero_image.url !== '/placeholder.svg'
    ? post.hero_image.url
    : null;

  let sentCount = 0;
  const errors: string[] = [];

  // Send individually so each email gets a personalized unsubscribe token
  const batchSize = 50;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    // Per RFC 8058, we need per-subscriber tokens — send individually for compliance
    for (const subscriber of batch) {
      const unsubscribeUrl = `${appUrl}/blog?unsubscribe=${subscriber.unsubscribe_token}`;

      const emailHtml = buildNewsletterHtml({
        title: post.title,
        description,
        articleUrl,
        heroUrl,
        category: post.category,
        unsubscribeUrl,
      });

      try {
        await sendEmail({
          from: EMAIL_SENDERS.newsletter,
          to: subscriber.email,
          subject: `New Insight: ${post.title}`,
          html: emailHtml,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: [{ name: 'category', value: 'blog-newsletter' }],
        });
        sentCount++;
      } catch (e) {
        const msg = `${subscriber.email}: ${e instanceof Error ? e.message : 'Unknown error'}`;
        console.error(`${LOG} Send failed:`, msg);
        errors.push(msg);
      }
    }
  }

  console.log(`${LOG} Newsletter sent for "${post.title}": ${sentCount}/${subscribers.length} subscribers`);

  return new Response(JSON.stringify({
    success: true,
    sent: sentCount,
    total: subscribers.length,
    errors: errors.length > 0 ? errors : undefined,
    postTitle: post.title,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));

// ---------------------------------------------------------------------------
// Newsletter email builder using shared template system
// ---------------------------------------------------------------------------

function buildNewsletterHtml(params: {
  title: string;
  description: string;
  articleUrl: string;
  heroUrl: string | null;
  category: string;
  unsubscribeUrl: string;
}): string {
  const { title, description, articleUrl, heroUrl, category, unsubscribeUrl } = params;

  const categoryLabel = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const heroSection = heroUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 0;">
            <img src="${heroUrl}" alt="${title}" width="536" style="width: 100%; max-width: 536px; border-radius: 12px; display: block;" />
          </td>
        </tr>
      </table>
      ${Spacer(24)}
    `
    : '';

  const content = `
    ${Paragraph(categoryLabel, 'muted')}
    ${Spacer(8)}
    ${heroSection}
    ${Heading({ text: title, level: 1 })}
    ${Spacer(8)}
    ${Paragraph(description, 'secondary')}
    ${Spacer(24)}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          ${Button({ url: articleUrl, text: 'Read Full Article', variant: 'primary' })}
        </td>
      </tr>
    </table>
    ${Divider({ spacing: 'large' })}
    ${Paragraph(
      `You're receiving this because you subscribed to The Quantum Club insights.<br/><a href="${unsubscribeUrl}" style="color: #C9A24E; text-decoration: underline;">Unsubscribe</a>`,
      'muted',
    )}
  `;

  return baseEmailTemplate({
    preheader: `New Insight: ${title}`,
    content,
    showHeader: true,
    showFooter: true,
  });
}
