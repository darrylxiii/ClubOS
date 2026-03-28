import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { MapPin, EyeOff } from "lucide-react";

export default function CCPANotice() {
  const { t } = useTranslation('common');
  const lastUpdated = "March 28, 2026";
  
  const sections = [
    { id: "1-overview", title: "1. Overview & Applicability" },
    { id: "2-categories", title: "2. Categories of Personal Information Collected" },
    { id: "3-sources", title: "3. Sources of Personal Information" },
    { id: "4-purposes", title: "4. Business/Commercial Purposes" },
    { id: "5-disclosure", title: "5. Disclosure of Personal Information" },
    { id: "6-sale-share", title: "6. 'Selling' and 'Sharing' Under CCPA" },
    { id: "7-consumer-rights", title: "7. Your California Privacy Rights" },
    { id: "8-exercising", title: "8. How to Exercise Your Rights" },
    { id: "9-financial-incentive", title: "9. Notice of Financial Incentive" }
  ];

  return (
    <>
      <Helmet>
        <title>{t('legalPages.cCPANotice', 'California Privacy Rights Notice (CCPA/CPRA)')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.cCPANoticeDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
        title={t('legalPages.cCPANotice', 'California Privacy Rights Notice (CCPA/CPRA)')}
        lastUpdated={lastUpdated}
        sections={sections}
      >
      <div className="space-y-8">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Notice to California Residents</h3>
              <p className="text-muted-foreground">
                This California Privacy Notice supplements our <a href="/privacy" className="text-primary hover:underline">Global Privacy Policy</a> and applies solely to visitors, users, and others who reside in the State of California ("consumers" or "you"). The Quantum Club B.V. ("TQC", "we") adopts this notice to comply with the California Consumer Privacy Act of 2018 (CCPA) as amended by the California Privacy Rights Act of 2020 (CPRA).
              </p>
            </div>
          </div>
        </Card>

        <LegalSection id="1-overview" title="1. Overview & Applicability">
          <p className="text-muted-foreground">
            Any terms defined in the CCPA/CPRA have the same meaning when used in this notice. 
            This notice details the Personal Information we have collected, disclosed, "sold," or "shared" over the past 12 months, and explains your rights.
          </p>
        </LegalSection>

        <LegalSection id="2-categories" title="2. Categories of Personal Information Collected">
          <p className="text-muted-foreground mb-4">Within the last twelve (12) months, TQC has collected the following categories of Personal Information from consumers:</p>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Category</th>
                  <th className="text-left p-3 font-semibold">Examples</th>
                  <th className="text-left p-3 font-semibold">Collected?</th>
                </tr>
              </thead>
              <tbody className="divide-y text-muted-foreground">
                <tr>
                  <td className="p-3 font-medium">A. Identifiers</td>
                  <td className="p-3">Real name, alias, postal address, unique personal identifier, IP address, email address, account name.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">B. Personal information categories (Cal. Civ. Code § 1798.80)</td>
                  <td className="p-3">Name, signature, education, employment, employment history, bank account, credit card.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">C. Protected classification characteristics</td>
                  <td className="p-3">Age, race, gender, veteran/military status (if voluntarily provided via CV or questionnaire).</td>
                  <td className="p-3"><strong>YES</strong> (Voluntary)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">D. Commercial information</td>
                  <td className="p-3">Records of platform subscriptions, Connects purchased.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">E. Internet or network activity</td>
                  <td className="p-3">Browsing history, search history, interaction with the platform or AI chatbots.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">F. Geolocation data</td>
                  <td className="p-3">City or country location derived from IP, or provided on profile.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">G. Audio, electronic, visual data</td>
                  <td className="p-3">Profile avatars, video conference recordings, interview voice recordings.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">H. Professional/Employment data</td>
                  <td className="p-3">Current employer, job history, salary history, performance evaluations.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">I. Inferences drawn</td>
                  <td className="p-3">Profile "Match Score", "Club AI" performance insights, behavior profiling.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
                <tr className="bg-primary/5">
                  <td className="p-3 font-medium text-primary">L. Sensitive Personal Info</td>
                  <td className="p-3">Account login with password, racial/ethnic origin (if provided), contents of mail/messages.</td>
                  <td className="p-3"><strong>YES</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSection>

        <LegalSection id="3-sources" title="3. Sources of Personal Information">
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
            <li>Directly from you (e.g., when linking accounts, filling forms, uploading CVs).</li>
            <li>Indirectly from you (e.g., observing your actions natively on the Platform).</li>
            <li>From Third Parties (e.g., LinkedIn API, Google/Microsoft Auth, background check integrators).</li>
          </ul>
        </LegalSection>

        <LegalSection id="4-purposes" title="4. Business & Commercial Purposes">
          <p className="text-muted-foreground">We use your Personal Information to operate the recruitment matchmaking platform, power Club AI, audit interactions, debug errors, process transactions, perform fraud prevention, and improve platform models. (See our Global Privacy Policy for exhaustive details).</p>
        </LegalSection>

        <LegalSection id="5-disclosure" title="5. Disclosure to Third Parties">
          <p className="text-muted-foreground">In the last 12 months, TQC disclosed categories A, B, E, H, and I for a business purpose to our service providers (data hosts like Supabase, Payment processors, AI processors like OpenAI/Google under strict "no-training" B2B contracts).</p>
        </LegalSection>

        {/* 6. Sale / Share */}
        <LegalSection id="6-sale-share" title="6. 'Selling' and 'Sharing' Under CCPA">
          <div className="p-4 bg-primary/5 rounded-md border border-primary/20 mb-4">
            <div className="flex items-center gap-2 font-semibold text-primary mb-2">
              <EyeOff className="w-5 h-5" />
              "Do Not Sell My Personal Information"
            </div>
            <p className="text-sm text-foreground">
              <strong>TQC does NOT sell your personal information to traditional data brokers.</strong>
            </p>
          </div>
          <p className="text-muted-foreground">
            The core definition of our business involves matching your profile (Dossier) with prospective Corporate Partners/Employers. Passing your CV/profile to an Employer at your request (Club Sync) or with your explicit consent is an exemption to the definition of a "Sale" under the CCPA.
          </p>
          <p className="text-muted-foreground mt-2">
            <strong>"Sharing":</strong> TQC uses analytics (PostHog). Under the CPRA, the passage of analytics data for cross-context behavioral tracking may be considered "sharing". We do not use third-party advertising pixels to retarget you across the internet. However, you may opt-out of all non-essential analytical cookies via the Cookie Preference Center on our Platform.
          </p>
        </LegalSection>

        <LegalSection id="7-consumer-rights" title="7. Your California Privacy Rights">
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground mt-2">
            <li><strong>Right to Know & Access:</strong> You have the right to request disclosure of specific pieces of PI we collected about you over the past 12 months, the categories of sources, the business purpose, and categories of third parties shared with.</li>
            <li><strong>Right to Deletion:</strong> You have the right to request deletion of your PI, subject to certain exceptions (e.g., completing a transaction, detecting security incidents, complying with legal obligations).</li>
            <li><strong>Right to Correct:</strong> The right to correct inaccurate PI.</li>
            <li><strong>Right to Limit Use of Sensitive PI:</strong> You can request we restrict the usage of your sensitive PI (like exact location or racial data) only to what is necessary to perform the recruitment service.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not deny you goods/services or charge different prices if you exercise your CCPA rights.</li>
          </ul>
        </LegalSection>

        <LegalSection id="8-exercising" title="8. How to Exercise Your Rights">
          <p className="text-muted-foreground">To exercise these rights, submit a verifiable consumer request via:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
            <li><strong>Email:</strong> <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">info@thequantumclub.com</a> (Subject: "CCPA Request")</li>
            <li><strong>In-App:</strong> via the "Privacy Settings" tab in your Candidate/Partner Dashboard.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Only you, or an authorized agent registered with the California Secretary of State that you authorize to act on your behalf, may make a request. We will verify your request by matching identifying information you provide via your registered email address securely. We strive to respond within 45 days.
          </p>
        </LegalSection>

        <LegalSection id="9-financial-incentive" title="9. Notice of Financial Incentive">
          <div className="p-4 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">
              TQC offers a <strong>Referral Platform & Connects Rewards</strong>. You may receive digital currency (Connects) or financial payouts by providing the Personal Information of yourself or a referred technical candidate (email address, name, resume). This is considered a financial incentive program under California law. You opt-in by submitting a referral form. You may opt-out at any time by ceasing referrals. The value of the incentive correlates directly to the business value TQC derives from the successful placement of a recruited candidate.
            </p>
          </div>
        </LegalSection>
        <div className="mt-12 p-6 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} The Quantum Club B.V. All rights reserved. | Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands | KvK: 93498871
          </p>
        </div>

      </div>
    </LegalPageLayout>
    </>
  );
}
