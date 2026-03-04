import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PRODUCTION_DOMAIN = 'https://os.thequantumclub.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId } = await req.json();
    if (!postId) throw new Error('postId is required');

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, meta_description, category, hero_image, author_id')
      .eq('id', postId)
      .eq('status', 'published')
      .single();

    if (postError || !post) {
      throw new Error(`Published post not found: ${postError?.message || postId}`);
    }

    // Fetch active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from('blog_subscribers')
      .select('id, email')
      .is('unsubscribed_at', null);

    if (subError) throw subError;
    if (!subscribers?.length) {
      return new Response(JSON.stringify({ message: 'No active subscribers', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const articleUrl = `${PRODUCTION_DOMAIN}/blog/${post.slug}`;
    const description = post.meta_description || post.excerpt || '';
    const heroUrl = post.hero_image?.url && post.hero_image.url !== '/placeholder.svg'
      ? post.hero_image.url
      : null;

    // Build email HTML
    const emailHtml = buildEmailHtml({
      title: post.title,
      description,
      articleUrl,
      heroUrl,
      category: post.category,
    });

    // Send via Supabase Auth admin (or Resend if configured)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let sentCount = 0;
    const errors: string[] = [];

    if (resendKey) {
      // Batch send via Resend
      const batchSize = 50;
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const bccList = batch.map((s: any) => s.email);

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'The Quantum Club <insights@mail.thequantumclub.com>',
              to: 'insights@thequantumclub.com',
              bcc: bccList,
              subject: `New Insight: ${post.title}`,
              html: emailHtml,
              tags: [{ name: 'category', value: 'blog-newsletter' }],
            }),
          });

          const resBody = await res.text();
          if (res.ok) {
            sentCount += batch.length;
          } else {
            errors.push(`Batch ${i / batchSize}: ${resBody}`);
          }
        } catch (e) {
          errors.push(`Batch ${i / batchSize}: ${e.message}`);
        }
      }
    } else {
      // No email provider configured
      return new Response(JSON.stringify({
        error: 'No email provider configured. Add RESEND_API_KEY secret to enable newsletter sending.',
        subscriberCount: subscribers.length,
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Newsletter sent for "${post.title}": ${sentCount}/${subscribers.length} subscribers`);

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
      postTitle: post.title,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmailHtml(params: {
  title: string;
  description: string;
  articleUrl: string;
  heroUrl: string | null;
  category: string;
}): string {
  const { title, description, articleUrl, heroUrl, category } = params;
  const unsubscribeUrl = `${PRODUCTION_DOMAIN}/blog?unsubscribe=true`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0E0E10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E0E10;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1e;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 16px;text-align:center;">
          <span style="color:#C9A24E;font-size:12px;letter-spacing:2px;text-transform:uppercase;">The Quantum Club · ${category.replace(/-/g, ' ')}</span>
        </td></tr>

        ${heroUrl ? `<tr><td style="padding:0 32px;">
          <img src="${heroUrl}" alt="${title}" style="width:100%;border-radius:8px;display:block;" />
        </td></tr>` : ''}

        <!-- Content -->
        <tr><td style="padding:24px 32px;">
          <h1 style="color:#F5F4EF;font-size:22px;line-height:1.3;margin:0 0 16px;">${title}</h1>
          <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 24px;">${description}</p>
          <a href="${articleUrl}" style="display:inline-block;background:#C9A24E;color:#0E0E10;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Read the Full Article</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #2a2a2e;text-align:center;">
          <p style="color:#666;font-size:11px;margin:0;">
            You're receiving this because you subscribed to The Quantum Club insights.<br/>
            <a href="${unsubscribeUrl}" style="color:#C9A24E;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
