import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Domains to exclude from matching (common email providers, etc.)
const EXCLUDED_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'yahoo.nl', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'tutanota.com', 'fastmail.com',
  'aol.com', 'msn.com', 'mail.com', 'zoho.com',
  'github.com', 'linkedin.com', 'facebook.com', 'twitter.com',
  'greenhouse.io', 'lever.co', 'workday.com', 'bamboohr.com',
  'slack.com', 'notion.so', 'figma.com', 'google.com',
  'thequantumclub.com', 'quantumclub.nl', // Our own domains
]);

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    // Handle URLs without protocol
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const urlObj = new URL(cleanUrl);
    let domain = urlObj.hostname.toLowerCase();
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch {
    return null;
  }
}

function extractEmailDomain(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1]?.toLowerCase() || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      domainsExtracted: 0,
      contactsCreated: 0,
      emailsMatched: 0,
      companiesAggregated: 0,
      errors: [] as string[],
    };

    console.log('Starting email intelligence population...');

    // Step 1: Extract domains from company websites
    console.log('Step 1: Extracting domains from companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, website_url')
      .not('website_url', 'is', null);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      results.errors.push(`Companies fetch error: ${companiesError.message}`);
    } else if (companies) {
      for (const company of companies) {
        const domain = extractDomain(company.website_url);
        if (domain && !EXCLUDED_DOMAINS.has(domain)) {
          // Check if domain already exists
          const { data: existing } = await supabase
            .from('company_domains')
            .select('id')
            .eq('company_id', company.id)
            .eq('domain', domain)
            .single();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('company_domains')
              .insert({
                company_id: company.id,
                domain,
                is_primary: true,
                verified: true,
              });

            if (!insertError) {
              results.domainsExtracted++;
              console.log(`Extracted domain ${domain} for ${company.name}`);
            }
          }
        }
      }
    }

    // Step 2: Auto-create contacts from profiles with company_id
    console.log('Step 2: Creating contacts from profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id, role')
      .not('company_id', 'is', null)
      .not('email', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      results.errors.push(`Profiles fetch error: ${profilesError.message}`);
    } else if (profiles) {
      for (const profile of profiles) {
        // Check if contact already exists
        const { data: existingContact } = await supabase
          .from('company_contacts')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('email', profile.email)
          .single();

        if (!existingContact) {
          const { error: insertError } = await supabase
            .from('company_contacts')
            .insert({
              company_id: profile.company_id,
              name: profile.full_name || 'Unknown',
              email: profile.email,
              role: profile.role || 'member',
              source: 'profile',
              is_primary: false,
            });

          if (!insertError) {
            results.contactsCreated++;
            console.log(`Created contact for ${profile.email}`);
          }
        }
      }
    }

    // Step 3: Get all domains for matching
    console.log('Step 3: Fetching domains for email matching...');
    const { data: allDomains, error: domainsError } = await supabase
      .from('company_domains')
      .select('domain, company_id');

    if (domainsError) {
      console.error('Error fetching domains:', domainsError);
      results.errors.push(`Domains fetch error: ${domainsError.message}`);
    }

    // Create domain to company mapping
    const domainToCompany = new Map<string, string>();
    if (allDomains) {
      for (const d of allDomains) {
        domainToCompany.set(d.domain, d.company_id);
      }
    }

    // Step 4: Match emails to companies
    console.log('Step 4: Matching emails to companies...');
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('id, from_email, to_emails, subject, sentiment_score')
      .order('received_at', { ascending: false })
      .limit(1000); // Process in batches

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
      results.errors.push(`Emails fetch error: ${emailsError.message}`);
    } else if (emails) {
      for (const email of emails) {
        // Try to match from_email domain
        const fromDomain = extractEmailDomain(email.from_email);
        let matchedCompanyId: string | null = null;
        let matchSource = 'from';

        if (fromDomain && domainToCompany.has(fromDomain)) {
          matchedCompanyId = domainToCompany.get(fromDomain)!;
        }

        // If no match from from_email, try to_emails
        if (!matchedCompanyId && email.to_emails) {
          const toEmails = Array.isArray(email.to_emails) ? email.to_emails : [email.to_emails];
          for (const toEmail of toEmails) {
            const toDomain = extractEmailDomain(toEmail);
            if (toDomain && domainToCompany.has(toDomain)) {
              matchedCompanyId = domainToCompany.get(toDomain)!;
              matchSource = 'to';
              break;
            }
          }
        }

        if (matchedCompanyId) {
          // Check if match already exists
          const { data: existingMatch } = await supabase
            .from('email_contact_matches')
            .select('id')
            .eq('email_id', email.id)
            .eq('company_id', matchedCompanyId)
            .single();

          if (!existingMatch) {
            // Try to find matching contact
            let contactId: string | null = null;
            const emailToMatch = matchSource === 'from' ? email.from_email : 
              (Array.isArray(email.to_emails) ? email.to_emails[0] : email.to_emails);

            const { data: contact } = await supabase
              .from('company_contacts')
              .select('id')
              .eq('company_id', matchedCompanyId)
              .eq('email', emailToMatch)
              .single();

            if (contact) {
              contactId = contact.id;
            }

            const { error: matchError } = await supabase
              .from('email_contact_matches')
              .insert({
                email_id: email.id,
                company_id: matchedCompanyId,
                contact_id: contactId,
                match_confidence: 0.9,
                match_source: 'domain',
              });

            if (!matchError) {
              results.emailsMatched++;
            }
          }
        }
      }
    }

    // Step 5: Aggregate sentiment per company
    console.log('Step 5: Aggregating company sentiment...');
    const { data: matchedCompanies, error: matchedError } = await supabase
      .from('email_contact_matches')
      .select('company_id')
      .limit(100);

    if (matchedError) {
      console.error('Error fetching matched companies:', matchedError);
    } else if (matchedCompanies) {
      const uniqueCompanyIds = [...new Set(matchedCompanies.map(m => m.company_id))];

      for (const companyId of uniqueCompanyIds) {
        // Get all matched emails for this company
        const { data: companyMatches } = await supabase
          .from('email_contact_matches')
          .select(`
            email_id,
            emails!inner(
              sentiment_score,
              sentiment_label,
              received_at,
              from_email
            )
          `)
          .eq('company_id', companyId);

        if (companyMatches && companyMatches.length > 0) {
          const emailData = companyMatches.map(m => m.emails).filter(Boolean);
          const totalEmails = emailData.length;
          
          // Calculate sentiment breakdown
          let positive = 0, neutral = 0, negative = 0;
          let totalScore = 0;
          let scoredCount = 0;

          for (const e of emailData) {
            const email = e as any;
            if (email.sentiment_label === 'positive') positive++;
            else if (email.sentiment_label === 'negative') negative++;
            else neutral++;

            if (email.sentiment_score !== null) {
              totalScore += email.sentiment_score;
              scoredCount++;
            }
          }

          const avgScore = scoredCount > 0 ? totalScore / scoredCount : 0.5;
          
          // Calculate health score (0-100)
          const positiveRatio = totalEmails > 0 ? positive / totalEmails : 0;
          const negativeRatio = totalEmails > 0 ? negative / totalEmails : 0;
          const healthScore = Math.round((positiveRatio * 100) - (negativeRatio * 50) + 50);

          // Upsert company sentiment
          const { error: upsertError } = await supabase
            .from('company_email_sentiment')
            .upsert({
              company_id: companyId,
              total_emails: totalEmails,
              avg_sentiment_score: avgScore,
              sentiment_breakdown: { positive, neutral, negative },
              health_score: Math.max(0, Math.min(100, healthScore)),
              last_calculated_at: new Date().toISOString(),
            }, {
              onConflict: 'company_id',
            });

          if (!upsertError) {
            results.companiesAggregated++;
            console.log(`Aggregated sentiment for company ${companyId}: ${totalEmails} emails, health: ${healthScore}`);
          }
        }
      }
    }

    console.log('Email intelligence population complete:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in populate-email-intelligence:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
