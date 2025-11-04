import { AppLayout } from "@/components/AppLayout";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

const TermsOfService = () => {
  const lastUpdated = "January 15, 2025";
  
  const sections = [
    { id: "agreement", title: "Agreement to Terms" },
    { id: "definitions", title: "Definitions" },
    { id: "accounts", title: "User Accounts" },
    { id: "acceptable-use", title: "Acceptable Use Policy" },
    { id: "intellectual-property", title: "Intellectual Property" },
    { id: "services", title: "Services Provided" },
    { id: "no-cure-no-pay", title: "No Cure, No Pay Model" },
    { id: "club-sync", title: "Club Sync (Auto-Application)" },
    { id: "dossier-sharing", title: "Dossier Sharing & Confidentiality" },
    { id: "referral-program", title: "Referral Program" },
    { id: "payment-terms", title: "Payment Terms (Partners)" },
    { id: "warranties", title: "Disclaimer of Warranties" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "indemnification", title: "Indemnification" },
    { id: "termination", title: "Termination" },
    { id: "governing-law", title: "Governing Law & Jurisdiction" },
    { id: "dispute-resolution", title: "Dispute Resolution" },
    { id: "force-majeure", title: "Force Majeure" },
    { id: "amendments", title: "Amendments" },
    { id: "miscellaneous", title: "Miscellaneous" },
    { id: "contact", title: "Contact" },
  ];

  return (
    <AppLayout>
      <LegalPageLayout
        title="Terms of Service" 
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">User Agreement</h3>
                <p className="text-muted-foreground">
                  These Terms of Service constitute a legally binding agreement between you and The Quantum Club B.V. 
                  Please read them carefully before using our platform.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="agreement" title="Agreement to Terms">
            <p>
              By accessing or using The Quantum Club platform ("Platform", "Service"), you agree to be bound by 
              these Terms of Service ("Terms") and all applicable laws and regulations.
            </p>
            <p className="mt-4">
              If you do not agree with any of these terms, you are prohibited from using or accessing this site. 
              The materials contained in this Platform are protected by applicable copyright and trademark law.
            </p>
            <p className="mt-4">
              <strong>Minimum Age:</strong> You must be at least 18 years old to use The Quantum Club.
            </p>
            <p className="mt-4 font-semibold">
              Effective Date: {lastUpdated}
            </p>
          </LegalSection>

          <LegalSection id="definitions" title="Definitions">
            <div className="space-y-3">
              <p><strong>"Platform" / "Service":</strong> The Quantum Club web application and all related services</p>
              <p><strong>"User":</strong> Any individual or entity using the Platform (Candidate, Partner, or Admin)</p>
              <p><strong>"Candidate":</strong> Talent professionals seeking career opportunities through TQC</p>
              <p><strong>"Partner" / "Client":</strong> Companies hiring through The Quantum Club</p>
              <p><strong>"Strategist":</strong> TQC employee facilitating candidate-partner placements</p>
              <p><strong>"Club AI" / "QUIN":</strong> AI assistant features powered by Lovable AI</p>
              <p><strong>"Club Sync":</strong> Auto-application feature that applies to matching roles on your behalf</p>
              <p><strong>"Dossier":</strong> Candidate profile package shared with partners (with consent)</p>
              <p><strong>"Club Pilot":</strong> Intelligent task prioritization and scheduling system</p>
              <p><strong>"TQC", "we", "us", "our":</strong> The Quantum Club B.V.</p>
            </div>
          </LegalSection>

          <LegalSection id="accounts" title="User Accounts">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Registration</h4>
                <p className="text-muted-foreground">
                  The Quantum Club is <strong>invite-only</strong>. Access requires a valid invitation code. 
                  You must provide accurate, complete, and current information during registration.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Security</h4>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the confidentiality of your password and account. 
                  We strongly recommend enabling 2FA/MFA. Notify us immediately of any unauthorized access 
                  via privacy@thequantumclub.com.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Sharing</h4>
                <p className="text-muted-foreground">
                  <strong>Prohibited.</strong> Each account is for individual use only. Sharing credentials 
                  violates these Terms and may result in account termination.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Verification</h4>
                <p className="text-muted-foreground">
                  Email verification is required. Phone verification is optional but recommended for enhanced security 
                  and feature access.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Types</h4>
                <p className="text-muted-foreground">
                  Candidate, Partner, Strategist, and Admin accounts have different rights, obligations, and features.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="acceptable-use" title="Acceptable Use Policy">
            <div className="space-y-4">
              <h4 className="font-semibold">Prohibited Activities</h4>
              <p className="text-muted-foreground mb-3">You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Submit fraudulent applications or misrepresent your qualifications</li>
                <li>Scrape, data mine, or use automated bots on the Platform</li>
                <li>Upload malware, viruses, or malicious code</li>
                <li>Impersonate others or create fake profiles</li>
                <li>Engage in harassment, discrimination, or hate speech</li>
                <li>Spam other users with unsolicited messages</li>
                <li>Circumvent security measures or access controls</li>
                <li>Reverse-engineer or attempt to extract source code</li>
                <li>Use the Platform for illegal purposes</li>
                <li>Share confidential candidate information without consent (Partners)</li>
              </ul>

              <div className="mt-6">
                <h4 className="font-semibold mb-2">Professional Conduct</h4>
                <p className="text-muted-foreground">
                  All interactions must be respectful and professional. Offensive, abusive, or inappropriate 
                  behavior will result in warnings or account termination.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="intellectual-property" title="Intellectual Property">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">TQC Intellectual Property</h4>
                <p className="text-muted-foreground">
                  All platform code, design, branding, AI models, algorithms, and trademarks (including "QUIN" 
                  and "Club Pilot") are the exclusive property of The Quantum Club B.V. Unauthorized use is prohibited.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">User Content Ownership</h4>
                <p className="text-muted-foreground">
                  You retain ownership of your CV, profile data, messages, and uploaded content.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">License Grant to TQC</h4>
                <p className="text-muted-foreground">
                  By uploading content, you grant The Quantum Club a non-exclusive, worldwide, royalty-free license 
                  to use, display, and process your content solely for service delivery (job matching, applications, 
                  profile display to consented partners).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Portfolio & Work Samples</h4>
                <p className="text-muted-foreground">
                  Any portfolio items or work samples you upload remain your property. They are shared only with 
                  your explicit consent and only to partners you approve.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="services" title="Services Provided">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-3">For Candidates</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Job discovery and AI-powered matching</li>
                  <li>Application submission and tracking</li>
                  <li>Career profile and CV hosting</li>
                  <li>Club AI career guidance and interview preparation</li>
                  <li>Stealth mode and current employer protection</li>
                  <li>Referral rewards program</li>
                  <li>Meeting scheduling and intelligence</li>
                  <li>Secure messaging with strategists and partners</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">For Partners</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Candidate sourcing and shortlisting</li>
                  <li>Dossier creation and secure sharing</li>
                  <li>Applicant tracking integration (Greenhouse)</li>
                  <li>Organizational chart and team management</li>
                  <li>Interview scheduling and meeting intelligence</li>
                  <li>Analytics and hiring insights</li>
                  <li>Dedicated strategist support</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">For All Users</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Secure messaging and communication tools</li>
                  <li>Calendar integration (Google, Microsoft)</li>
                  <li>Document management and secure file sharing</li>
                  <li>Mobile-responsive design</li>
                  <li>Dark/light theme support</li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="no-cure-no-pay" title="No Cure, No Pay Model (Partners)">
            <p>
              The Quantum Club operates on a <strong>success-based fee model</strong> for partners:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Partners pay <strong>only when a candidate is successfully hired</strong></li>
              <li>Fee structure: <strong>20% of first-year salary</strong> (or as specified in commercial agreement)</li>
              <li>No upfront costs for sourcing, shortlisting, or candidate access</li>
              <li>No retainers or subscription fees</li>
              <li>Payment typically due upon candidate start date or completion of probation period (as per contract)</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Detailed fee terms are outlined in separate commercial agreements signed between TQC and each partner.
            </p>
          </LegalSection>

          <LegalSection id="club-sync" title="Club Sync (Auto-Application)">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How It Works</h4>
                <p className="text-muted-foreground">
                  Club Sync is an AI-powered feature that automatically applies to matching job roles on your behalf, 
                  saving you time and maximizing your opportunities.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Candidate Consent Required</h4>
                <p className="text-muted-foreground">
                  <strong>Explicit opt-in required.</strong> Club Sync is disabled by default. You must enable it 
                  in Settings → Privacy and approve which data is shared.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Strategist Review Process</h4>
                <p className="text-muted-foreground">
                  Before submission, a TQC strategist reviews the match to ensure quality and appropriateness. 
                  You can view all Club Sync applications in your Applications dashboard.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Opt-Out Anytime</h4>
                <p className="text-muted-foreground">
                  You can disable Club Sync at any time in Settings → Privacy. Already-submitted applications 
                  will remain active unless withdrawn individually.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">No Guarantee</h4>
                <p className="text-muted-foreground">
                  Club Sync does not guarantee interviews or job offers. It simply streamlines the application 
                  process for relevant opportunities.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="dossier-sharing" title="Dossier Sharing & Confidentiality">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Candidate Approval Required</h4>
                <p className="text-muted-foreground">
                  Dossiers (comprehensive candidate profile packages) are shared with partners <strong>only after 
                  you explicitly approve</strong> via a consent modal or Club Sync approval.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">72-Hour Expiring Links</h4>
                <p className="text-muted-foreground">
                  Dossier access links expire after 72 hours for security. Dossiers include watermarks (viewer IP, 
                  email, timestamp) to prevent unauthorized sharing.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Domain Restrictions</h4>
                <p className="text-muted-foreground">
                  Access is limited to partner-approved company domains. Your current employer protection settings 
                  ensure blocked companies never receive your dossier.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Non-Disclosure Agreement (NDA)</h4>
                <p className="text-muted-foreground">
                  For sensitive or confidential searches, partners must sign an NDA before accessing candidate dossiers.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="referral-program" title="Referral Program">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How It Works</h4>
                <p className="text-muted-foreground">
                  Earn rewards for referring qualified candidates who successfully get hired through The Quantum Club.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Payout Conditions</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                  <li>Referred candidate must complete probation period (typically 3-6 months)</li>
                  <li>Referral must be documented in the system before hire</li>
                  <li>One reward per successful placement</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Transparent Ledger</h4>
                <p className="text-muted-foreground">
                  Track all your referrals, statuses, and rewards in your Referrals dashboard. 
                  "Projected Rewards" show potential earnings; "Realized Rewards" are confirmed payouts.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Tax Compliance</h4>
                <p className="text-muted-foreground">
                  Referral reward recipients are responsible for reporting income to tax authorities. 
                  TQC will provide necessary documentation upon request.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Reward Amounts</h4>
                <p className="text-muted-foreground">
                  Published in the referral program terms (accessible in your Referrals page). 
                  Typically a percentage of the placement fee.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="payment-terms" title="Payment Terms (Partners)">
            <div className="space-y-3">
              <p><strong>Invoice Timing:</strong> Success fees invoiced after candidate start date (or per agreement)</p>
              <p><strong>Payment Due:</strong> Within 30 days of invoice date</p>
              <p><strong>Late Payment:</strong> Interest applies per Dutch commercial law</p>
              <p><strong>Disputes:</strong> Must be raised within 14 days of invoice receipt</p>
              <p><strong>Currency:</strong> EUR unless otherwise specified in commercial agreement</p>
            </div>
          </LegalSection>

          <LegalSection id="warranties" title="Disclaimer of Warranties">
            <p className="font-semibold mb-3">THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
            <p className="text-muted-foreground mb-4">We expressly disclaim:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No guarantee of job placement for candidates</li>
              <li>No guarantee of candidate quality or fit for partners (though we use good-faith matching)</li>
              <li>AI outputs (Club AI, match scores) are assistive tools, not definitive assessments</li>
              <li>Third-party integrations (LinkedIn, Greenhouse, Calendar) are subject to their own terms and availability</li>
              <li>No warranty of uninterrupted or error-free service</li>
              <li>No warranty that defects will be corrected immediately</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We strive for accuracy and reliability but do not guarantee outcomes.
            </p>
          </LegalSection>

          <LegalSection id="liability" title="Limitation of Liability">
            <p className="mb-4">
              <strong>TO THE FULLEST EXTENT PERMITTED BY LAW:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>TQC is not liable for indirect, incidental, consequential, special, or punitive damages</li>
              <li>Maximum liability capped at: <strong>Amount paid to TQC in the last 12 months</strong> (or €100 for candidates)</li>
              <li>Not liable for third-party actions (e.g., partner breaches, LinkedIn outages)</li>
              <li>Not liable for losses due to unauthorized account access if you failed to secure your credentials</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              <strong>Exceptions (Dutch law):</strong> This limitation does not apply to liability for gross negligence, 
              willful misconduct, fraud, or death/personal injury.
            </p>
          </LegalSection>

          <LegalSection id="indemnification" title="Indemnification">
            <p className="mb-4">
              You agree to indemnify, defend, and hold harmless The Quantum Club B.V., its officers, employees, 
              strategists, and partners from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your breach of these Terms</li>
              <li>Your violation of any law or third-party rights</li>
              <li>User content you provide (e.g., copyright infringement in uploaded CV)</li>
              <li>Misuse of the Platform</li>
              <li>Unauthorized disclosure of confidential information (Partners)</li>
            </ul>
          </LegalSection>

          <LegalSection id="termination" title="Termination">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">By User</h4>
                <p className="text-muted-foreground">
                  You can delete your account anytime via Settings → Privacy → Delete Account. 
                  This will initiate the data deletion process per our Privacy Policy.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">By TQC</h4>
                <p className="text-muted-foreground">
                  We may suspend or terminate your account for: violation of these Terms, fraudulent activity, 
                  illegal conduct, abusive behavior, or non-payment (Partners).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Effect of Termination</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                  <li>Access revoked immediately</li>
                  <li>Data retained per our retention policy (see Privacy Policy)</li>
                  <li>Pending referral rewards honored if earned pre-termination</li>
                  <li>Partners remain liable for fees accrued before termination</li>
                  <li>No refunds for services already rendered</li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="governing-law" title="Governing Law & Jurisdiction">
            <p className="mb-4">
              These Terms are governed by the laws of <strong>the Netherlands</strong>, excluding conflict-of-law principles.
            </p>
            <p className="text-muted-foreground mb-4">
              Any disputes shall be resolved in the courts of <strong>Amsterdam, Netherlands</strong>.
            </p>
            <p className="text-muted-foreground">
              <strong>EU Consumer Protection:</strong> If you are an EU consumer, mandatory consumer protection laws 
              of your country of residence may apply (where they offer greater protection than Dutch law).
            </p>
          </LegalSection>

          <LegalSection id="dispute-resolution" title="Dispute Resolution">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Good-Faith Negotiation</h4>
                <p className="text-muted-foreground">
                  Before formal proceedings, parties agree to attempt resolution through good-faith discussions.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Mediation</h4>
                <p className="text-muted-foreground">
                  Recommended before litigation. We are willing to engage in mediation via a neutral third party.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Arbitration (Optional)</h4>
                <p className="text-muted-foreground">
                  Parties may agree to binding arbitration via the Dutch Arbitration Institute (Nederlands Arbitrage Instituut).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Litigation</h4>
                <p className="text-muted-foreground">
                  If resolution fails, disputes proceed to the competent courts in Amsterdam, Netherlands.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="force-majeure" title="Force Majeure">
            <p>
              The Quantum Club is not liable for failure to perform obligations due to events beyond our reasonable control, including:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>Natural disasters (earthquakes, floods, pandemics)</li>
              <li>Wars, terrorism, or civil unrest</li>
              <li>Internet outages or infrastructure failures</li>
              <li>Third-party service provider failures (e.g., Supabase, Lovable AI outages)</li>
              <li>Government actions or legal restrictions</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              We will make reasonable efforts to restore services as quickly as possible.
            </p>
          </LegalSection>

          <LegalSection id="amendments" title="Amendments">
            <p>
              The Quantum Club reserves the right to update these Terms at any time. 
              <strong> Material changes will be notified via email</strong> at least 30 days before taking effect.
            </p>
            <p className="mt-4 text-muted-foreground">
              Continued use of the Platform after notification constitutes acceptance of the updated Terms. 
              If you disagree with changes, you may terminate your account before the effective date.
            </p>
            <p className="mt-4 text-muted-foreground">
              The "Last Updated" date reflects the most recent revision.
            </p>
          </LegalSection>

          <LegalSection id="miscellaneous" title="Miscellaneous">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Severability</h4>
                <p className="text-muted-foreground">
                  If any provision is found invalid or unenforceable, the remainder of these Terms remains in full effect.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">No Waiver</h4>
                <p className="text-muted-foreground">
                  Our failure to enforce any right or provision does not constitute a waiver of that right.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Entire Agreement</h4>
                <p className="text-muted-foreground">
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and TQC. 
                  They supersede all prior agreements, understandings, or representations.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Assignment</h4>
                <p className="text-muted-foreground">
                  You may not assign or transfer your account or these Terms without our written consent. 
                  TQC may assign these Terms in connection with a merger, acquisition, or sale of assets.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Language</h4>
                <p className="text-muted-foreground">
                  These Terms are provided in English. If translated, the English version prevails in case of conflict.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="contact" title="Contact">
            <div className="space-y-3">
              <p><strong>For legal inquiries or questions about these Terms:</strong></p>
              <p><strong>Email:</strong> legal@thequantumclub.com</p>
              <p><strong>Privacy matters:</strong> privacy@thequantumclub.com</p>
              <p><strong>Address:</strong> The Quantum Club B.V., Amsterdam, Netherlands</p>
            </div>
            <p className="mt-6 text-muted-foreground">
              <strong>Response Time:</strong> We aim to respond to all inquiries within 5-7 business days.
            </p>
          </LegalSection>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              © 2025 The Quantum Club B.V. All rights reserved. | Amsterdam, Netherlands
            </p>
          </div>
        </div>
      </LegalPageLayout>
    </AppLayout>
  );
};

export default TermsOfService;
