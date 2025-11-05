import { AppLayout } from "@/components/AppLayout";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  const lastUpdated = "January 15, 2025";
  
  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "data-controller", title: "Data Controller Information" },
    { id: "data-collection", title: "What Data We Collect" },
    { id: "how-collect", title: "How We Collect Data" },
    { id: "legal-basis", title: "Legal Basis for Processing" },
    { id: "data-usage", title: "How We Use Your Data" },
    { id: "data-sharing", title: "Data Sharing & Disclosures" },
    { id: "international-transfers", title: "International Data Transfers" },
    { id: "data-retention", title: "Data Retention" },
    { id: "your-rights", title: "Your Rights" },
    { id: "privacy-controls", title: "Privacy Controls & Settings" },
    { id: "security", title: "Security Measures" },
    { id: "cookies", title: "Cookies & Tracking" },
    { id: "children", title: "Children's Privacy" },
    { id: "ai-decisions", title: "AI & Automated Decision-Making" },
    { id: "policy-changes", title: "Changes to This Policy" },
    { id: "contact", title: "Contact & DPO" },
  ];

  return (
    <AppLayout>
      <LegalPageLayout
        title="Privacy Policy" 
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Your Privacy Matters</h3>
                <p className="text-muted-foreground">
                  The Quantum Club is committed to protecting your privacy and handling your data transparently. 
                  This policy explains how we collect, use, and protect your personal information in compliance with GDPR, 
                  UK GDPR, and other applicable privacy regulations.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="introduction" title="Introduction">
            <p>
              Welcome to The Quantum Club B.V. ("TQC", "we", "us", or "our"). This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your personal information when you use our exclusive talent platform and services.
            </p>
            <p className="mt-4">
              By using The Quantum Club platform, you agree to the collection and use of information in accordance with this policy. 
              If you do not agree with our policies and practices, please do not use our services.
            </p>
            <p className="mt-4 font-semibold">
              Effective Date: {lastUpdated}
            </p>
          </LegalSection>

          <LegalSection id="data-controller" title="Data Controller Information">
            <div className="space-y-3">
              <p><strong>Company:</strong> The Quantum Club B.V.</p>
              <p><strong>Registration:</strong> Netherlands Chamber of Commerce</p>
              <p><strong>Location:</strong> Amsterdam, Netherlands</p>
              <p><strong>Email:</strong> privacy@thequantumclub.com</p>
              <p><strong>Data Protection Officer:</strong> Available upon request via privacy@thequantumclub.com</p>
            </div>
            <p className="mt-4">
              For EU users, The Quantum Club B.V. acts as the data controller. We process data in accordance with the 
              General Data Protection Regulation (GDPR) and Dutch data protection laws.
            </p>
          </LegalSection>

          <LegalSection id="data-collection" title="What Data We Collect">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-3">Identity Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Full name, email address, phone number</li>
                  <li>LinkedIn profile URL and professional profile data</li>
                  <li>Profile photo/avatar</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Professional Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>CV/Resume documents</li>
                  <li>Work experience, skills, education, certifications</li>
                  <li>Current job title and employment history</li>
                  <li>Professional achievements and portfolio work</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Career Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Salary expectations (current and target ranges)</li>
                  <li>Notice period and contract end dates</li>
                  <li>Work preferences (remote, location, employment type)</li>
                  <li>Career goals and aspirations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Company Data (For Partners)</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Company name, website, industry</li>
                  <li>Team structure and organizational charts</li>
                  <li>Hiring needs and job descriptions</li>
                  <li>Interview notes and candidate evaluations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Communication Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Messages exchanged with strategists and partners</li>
                  <li>Email communications (via integrations)</li>
                  <li>Meeting transcripts and interview recordings (with explicit consent)</li>
                  <li>AI conversation history (Club AI interactions)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Behavioral Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Application history and job views</li>
                  <li>Search queries and filter preferences</li>
                  <li>Platform engagement metrics (feature usage, session duration)</li>
                  <li>Referral activity and rewards earned</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Technical Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>IP address, device information, browser type</li>
                  <li>Cookies and session identifiers</li>
                  <li>Login timestamps and authentication logs</li>
                  <li>Error logs and diagnostic data</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Financial Data</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Referral reward amounts and payment details</li>
                  <li>Note: Payment processing handled by third-party processors (we do not store full credit card data)</li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="how-collect" title="How We Collect Data">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Direct Input</h4>
                <p className="text-muted-foreground">
                  You provide data directly through onboarding, profile editing, job applications, 
                  and communication on our platform.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Automated Collection</h4>
                <p className="text-muted-foreground">
                  We automatically collect technical data through cookies, analytics tools, and session tracking 
                  to improve platform performance and user experience.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Third-Party Integrations</h4>
                <p className="text-muted-foreground">
                  With your permission, we collect data from LinkedIn OAuth, Google Calendar, Microsoft Calendar, 
                  and Greenhouse ATS integrations.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">AI Processing</h4>
                <p className="text-muted-foreground">
                  When you interact with Club AI features (interview prep, career guidance), we process your 
                  prompts and conversations to provide personalized assistance.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="legal-basis" title="Legal Basis for Processing (GDPR Article 6)">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Consent (Article 6(1)(a))</h4>
                <p className="text-muted-foreground">
                  We rely on your explicit consent for: marketing communications, stealth mode settings, 
                  data sharing with specific clients, Club Sync auto-applications, and meeting recordings.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Contract Performance (Article 6(1)(b))</h4>
                <p className="text-muted-foreground">
                  Processing necessary to provide our core services: job matching, applications, 
                  candidate-partner connections, and platform functionality.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Legitimate Interest (Article 6(1)(f))</h4>
                <p className="text-muted-foreground">
                  We process data based on legitimate interests for: platform improvement, fraud prevention, 
                  security measures, and analytics (ensuring your rights are protected).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Legal Obligation (Article 6(1)(c))</h4>
                <p className="text-muted-foreground">
                  We process data to comply with: tax regulations, law enforcement requests, 
                  and other legal requirements.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="data-usage" title="How We Use Your Data">
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li><strong>Core Services:</strong> Job matching, application processing, candidate shortlisting, organizational chart placements, profile management</li>
              <li><strong>AI Features:</strong> Club AI career assistance, interview preparation, meeting intelligence, resume parsing, match score generation</li>
              <li><strong>Communication:</strong> Facilitating conversations between candidates, strategists, and partners; system notifications; transactional emails</li>
              <li><strong>Analytics:</strong> Platform usage analysis, feature adoption tracking, A/B testing (anonymized where possible)</li>
              <li><strong>Marketing:</strong> Email campaigns (opt-in only), referral program communications, platform updates</li>
              <li><strong>Security:</strong> Fraud detection, account protection, 2FA/MFA verification, audit logging</li>
              <li><strong>Improvement:</strong> Debugging, performance optimization, user experience enhancements</li>
            </ul>
          </LegalSection>

          <LegalSection id="data-sharing" title="Data Sharing & Disclosures">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Within The Quantum Club</h4>
                <p className="text-muted-foreground">
                  Your data is accessible to: Platform administrators (for support and moderation), assigned strategists 
                  (for personalized service), and finance team (for referral rewards, minimal PII access).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">With Partners/Clients</h4>
                <p className="text-muted-foreground">
                  We share only: Fields you mark as shareable in Privacy Settings, data you consent to share via 
                  Club Sync or dossier approvals. Current employer protection applies—blocked companies never see your data.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Third-Party Service Providers</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                  <li><strong>Hosting & Database:</strong> Supabase (EU region, GDPR-compliant)</li>
                  <li><strong>AI Processing:</strong> Google Gemini and OpenAI GPT models - data processing agreements in place</li>
                  <li><strong>Calendar Sync:</strong> Google Cloud, Microsoft Azure</li>
                  <li><strong>ATS Integration:</strong> Greenhouse (for partner accounts)</li>
                  <li><strong>Email Services:</strong> Transactional email providers (anonymized where possible)</li>
                  <li><strong>Analytics:</strong> Usage analytics providers (anonymized)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Legal Requirements</h4>
                <p className="text-muted-foreground">
                  We may disclose data in response to: Court orders, legal obligations, GDPR data portability requests, 
                  law enforcement inquiries (only when legally required).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Business Transfers</h4>
                <p className="text-muted-foreground">
                  In case of merger, acquisition, or sale: We will notify you via email, your data will be transferred 
                  under the same privacy protections, and you retain all GDPR rights.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="international-transfers" title="International Data Transfers">
            <p>
              <strong>Primary Processing Location:</strong> European Union (Netherlands)
            </p>
            <p className="mt-4 text-muted-foreground">
              Some third-party processors (e.g., AI services) may process data outside the EU. We ensure protection through:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>Standard Contractual Clauses (SCCs) approved by the EU Commission</li>
              <li>GDPR-compliant Data Processing Agreements with all processors</li>
              <li>Adequacy decisions for countries with equivalent data protection</li>
              <li>UK GDPR compliance for UK users (post-Brexit)</li>
            </ul>
          </LegalSection>

          <LegalSection id="data-retention" title="Data Retention">
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Active Candidates</p>
                <p className="text-muted-foreground">Duration of membership + 18 months post-last activity (configurable)</p>
              </div>
              <div>
                <p className="font-semibold">Partners/Clients</p>
                <p className="text-muted-foreground">Duration of partnership + 7 years (financial and legal requirements)</p>
              </div>
              <div>
                <p className="font-semibold">Applications</p>
                <p className="text-muted-foreground">2 years post-application (recruitment regulations)</p>
              </div>
              <div>
                <p className="font-semibold">Backups</p>
                <p className="text-muted-foreground">30-day rolling retention for disaster recovery</p>
              </div>
              <div>
                <p className="font-semibold">Marketing Data</p>
                <p className="text-muted-foreground">Until consent is withdrawn</p>
              </div>
              <div>
                <p className="font-semibold">Right to Request Deletion</p>
                <p className="text-muted-foreground">You can request earlier deletion via Settings → Delete Account or privacy@thequantumclub.com</p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="your-rights" title="Your Rights (GDPR/CCPA/UK GDPR)">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Right to Access</h4>
                <p className="text-muted-foreground">
                  Download all your data via Settings → Privacy → Export Data (JSON format).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Rectification</h4>
                <p className="text-muted-foreground">
                  Edit your profile information anytime through your account settings.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Erasure ("Right to be Forgotten")</h4>
                <p className="text-muted-foreground">
                  Delete your account via Settings → Privacy → Delete Account. Note: Some data may be retained for legal compliance.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Restrict Processing</h4>
                <p className="text-muted-foreground">
                  Limit data usage through granular privacy settings (Settings → Privacy).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Data Portability</h4>
                <p className="text-muted-foreground">
                  Export your data in machine-readable JSON format for transfer to other services.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Object</h4>
                <p className="text-muted-foreground">
                  Opt-out of marketing, profiling, and AI processing at any time through Settings.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Withdraw Consent</h4>
                <p className="text-muted-foreground">
                  Disable stealth mode, revoke Club Sync permissions, or withdraw sharing consent anytime.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Lodge a Complaint</h4>
                <p className="text-muted-foreground">
                  Contact the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) or your local supervisory authority if you believe we've violated your privacy rights.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="privacy-controls" title="Privacy Controls & Settings">
            <p className="mb-4">Access comprehensive privacy controls via Settings → Privacy:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Profile Sharing Toggles:</strong> Granular field-level control (name, email, phone, salary, etc.)</li>
              <li><strong>Stealth Mode:</strong> Hide from current employer, set visibility levels</li>
              <li><strong>Current Employer Protection:</strong> Block specific company domains from viewing your profile</li>
              <li><strong>Club Sync Consent:</strong> Approve auto-applications with full transparency</li>
              <li><strong>Dossier Sharing:</strong> Explicit consent before profile packages are shared</li>
              <li><strong>Communication Preferences:</strong> Control email frequency and notification types</li>
            </ul>
          </LegalSection>

          <LegalSection id="security" title="Security Measures">
            <p className="mb-4">We implement industry-standard security practices:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Encryption:</strong> AES-256 at rest, TLS 1.3 in transit</li>
              <li><strong>Row-Level Security (RLS):</strong> Database policies enforce data access controls</li>
              <li><strong>2FA/MFA:</strong> Multi-factor authentication support</li>
              <li><strong>Signed URLs:</strong> Time-limited, secure file access for documents and resumes</li>
              <li><strong>Audit Logs:</strong> All sensitive data access is logged and monitored</li>
              <li><strong>Watermarked Dossiers:</strong> IP tracking for leak prevention</li>
              <li><strong>Regular Audits:</strong> Penetration testing and security reviews</li>
              <li><strong>Access Controls:</strong> Role-based permissions (candidates, strategists, partners, admins)</li>
            </ul>
          </LegalSection>

          <LegalSection id="cookies" title="Cookies & Tracking">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Strictly Necessary Cookies</h4>
                <p className="text-muted-foreground">
                  Required for authentication, session management, and core platform functionality. Cannot be disabled.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Functional Cookies</h4>
                <p className="text-muted-foreground">
                  Store your preferences (theme, language, saved filters). You can clear these via browser settings.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Analytics Cookies</h4>
                <p className="text-muted-foreground">
                  Anonymized usage data to improve platform performance. You can opt-out via Settings → Privacy.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Third-Party Advertising Cookies</h4>
                <p className="text-muted-foreground">
                  <strong>We do not use third-party advertising cookies.</strong>
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="children" title="Children's Privacy">
            <p>
              The Quantum Club is an <strong>18+ platform</strong> designed for professional career management. 
              We do not knowingly collect data from anyone under 18 years of age.
            </p>
            <p className="mt-4 text-muted-foreground">
              If we discover that we have inadvertently collected data from a minor, we will delete it immediately. 
              If you believe a minor has provided us with personal information, please contact privacy@thequantumclub.com.
            </p>
          </LegalSection>

          <LegalSection id="ai-decisions" title="AI & Automated Decision-Making">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Club AI (QUIN)</h4>
                <p className="text-muted-foreground">
                  Powered by Lovable AI (Google Gemini, OpenAI GPT models). Used for: career guidance, 
                  interview preparation, resume analysis, meeting intelligence. AI outputs are assistive, not definitive.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Matching Algorithm</h4>
                <p className="text-muted-foreground">
                  Combines AI scoring with rule-based matching. <strong>Not fully automated</strong>—all matches 
                  are reviewed by human strategists before shortlisting.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Right to Human Review</h4>
                <p className="text-muted-foreground">
                  You can request manual review of AI-generated match scores or recommendations. 
                  Contact your strategist or privacy@thequantumclub.com.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Explainability</h4>
                <p className="text-muted-foreground">
                  We provide "Why matched" explanations for job recommendations, showing factors like 
                  skills overlap, compensation proximity, and industry fit.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="policy-changes" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, 
              legal requirements, or platform features.
            </p>
            <p className="mt-4 text-muted-foreground">
              <strong>Material changes will be notified via email.</strong> Continued use of the platform 
              after notification constitutes acceptance of the updated policy. You can review historical 
              versions by contacting privacy@thequantumclub.com.
            </p>
            <p className="mt-4 text-muted-foreground">
              The "Last Updated" date at the top of this page reflects the most recent revision.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="Contact & Data Protection Officer">
            <div className="space-y-3">
              <p><strong>For privacy inquiries, data subject requests, or complaints:</strong></p>
              <p><strong>Email:</strong> privacy@thequantumclub.com</p>
              <p><strong>Data Protection Officer:</strong> Available upon request</p>
              <p><strong>Address:</strong> The Quantum Club B.V., Amsterdam, Netherlands</p>
            </div>
            <p className="mt-6 text-muted-foreground">
              <strong>Response Time:</strong> We aim to respond to all privacy inquiries within 30 days 
              (GDPR requirement). Data subject access requests (DSARs) will be fulfilled within the same timeframe.
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

export default PrivacyPolicy;
