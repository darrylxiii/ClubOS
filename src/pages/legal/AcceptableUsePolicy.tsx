import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Scale, AlertTriangle, ShieldCheck, Ban, Flag } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function AcceptableUsePolicy() {
  const lastUpdated = "January 15, 2025";

  const sections = [
    { id: "purpose", title: "Purpose" },
    { id: "scope", title: "Scope" },
    { id: "prohibited-content", title: "Prohibited Content" },
    { id: "prohibited-activities", title: "Prohibited Activities" },
    { id: "account-usage", title: "Account Usage Rules" },
    { id: "professional-conduct", title: "Professional Conduct" },
    { id: "data-integrity", title: "Data Integrity" },
    { id: "enforcement", title: "Enforcement" },
    { id: "reporting", title: "Reporting Violations" },
    { id: "contact", title: "Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/legal" className="flex items-center">
            <img 
              src={quantumLogoDark} 
              alt="Quantum Club" 
              className="h-12 w-auto dark:hidden"
            />
            <img 
              src={quantumLogoLight} 
              alt="Quantum Club" 
              className="h-12 w-auto hidden dark:block"
            />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <LegalPageLayout
        title="Acceptable Use Policy"
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Scale className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Fair Use Guidelines</h3>
                <p className="text-muted-foreground">
                  This Acceptable Use Policy outlines the rules and guidelines for using The Quantum Club 
                  platform. These policies help us maintain a professional, safe, and trustworthy 
                  environment for all members.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="purpose" title="Purpose">
            <p>
              The Quantum Club is a professional talent platform connecting exceptional candidates 
              with leading companies. This Acceptable Use Policy ("AUP") establishes clear guidelines 
              to ensure all users can benefit from a safe, professional, and trustworthy environment.
            </p>
            <p className="mt-4">
              By using our platform, you agree to comply with this policy. Violations may result in 
              warnings, account suspension, or permanent termination.
            </p>
          </LegalSection>

          <LegalSection id="scope" title="Scope">
            <p>This policy applies to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>All registered users (Candidates, Partners, Strategists, Admins)</li>
              <li>All platform features (messaging, applications, profiles, meetings)</li>
              <li>All content uploaded or shared on the platform</li>
              <li>All communications conducted through TQC channels</li>
              <li>External actions that affect the TQC community</li>
            </ul>
          </LegalSection>

          <LegalSection id="prohibited-content" title="Prohibited Content">
            <div className="flex items-start gap-3 mb-4">
              <Ban className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
              <p className="font-semibold">You may NOT upload, share, or distribute:</p>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Fraudulent information:</strong> Fake credentials, fabricated work history, or misrepresented qualifications</li>
              <li><strong>Malicious content:</strong> Viruses, malware, spyware, or other harmful software</li>
              <li><strong>Offensive material:</strong> Content that is discriminatory, harassing, threatening, or hateful</li>
              <li><strong>Illegal content:</strong> Material that violates any applicable law or regulation</li>
              <li><strong>Confidential data:</strong> Trade secrets, proprietary information, or data you don't have rights to share</li>
              <li><strong>Spam:</strong> Unsolicited bulk messages, promotional content, or chain letters</li>
              <li><strong>Impersonation:</strong> Content falsely claiming to be from another person or organization</li>
              <li><strong>Adult content:</strong> Sexually explicit or pornographic material</li>
            </ul>
          </LegalSection>

          <LegalSection id="prohibited-activities" title="Prohibited Activities">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
              <p className="font-semibold">The following activities are strictly prohibited:</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Security Violations</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Attempting to access accounts, systems, or data without authorization</li>
                  <li>Circumventing security measures, authentication, or access controls</li>
                  <li>Reverse engineering, decompiling, or extracting source code</li>
                  <li>Exploiting vulnerabilities instead of responsibly disclosing them</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Misuse</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Scraping, data mining, or using automated bots to extract data</li>
                  <li>Harvesting email addresses or contact information</li>
                  <li>Using candidate data for purposes outside of hiring (marketing, resale, etc.)</li>
                  <li>Sharing candidate dossiers with unauthorized parties</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Platform Abuse</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Creating multiple accounts to circumvent restrictions</li>
                  <li>Using the platform for non-intended purposes</li>
                  <li>Interfering with other users' ability to use the platform</li>
                  <li>Overloading systems with excessive requests (DoS-like behavior)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Fraud & Deception</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Submitting fraudulent job applications</li>
                  <li>Misrepresenting your identity, qualifications, or intentions</li>
                  <li>Engaging in referral fraud or gaming the rewards system</li>
                  <li>Posting fake job listings or fake company profiles</li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="account-usage" title="Account Usage Rules">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">One Account Per Person</h4>
                <p className="text-muted-foreground">
                  Each individual may only have one active account. Creating duplicate accounts 
                  to circumvent restrictions or boost referral metrics is prohibited.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">No Account Sharing</h4>
                <p className="text-muted-foreground">
                  Accounts are for individual use only. Sharing login credentials with others, 
                  including colleagues, is strictly prohibited.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Accurate Information</h4>
                <p className="text-muted-foreground">
                  You must provide and maintain accurate, current, and complete account information. 
                  This includes your name, email, professional credentials, and work history.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Security</h4>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the security of your account. Use strong, 
                  unique passwords and enable two-factor authentication (2FA) where available.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="professional-conduct" title="Professional Conduct">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
              <p className="font-semibold">We expect all users to maintain professional standards:</p>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Respectful communication:</strong> Treat all users with dignity and respect</li>
              <li><strong>Timely responses:</strong> Respond to messages and requests in a reasonable timeframe</li>
              <li><strong>Honest representation:</strong> Be truthful in all platform interactions</li>
              <li><strong>Confidentiality:</strong> Respect the confidential nature of hiring processes</li>
              <li><strong>Non-discrimination:</strong> Do not discriminate based on protected characteristics</li>
              <li><strong>Constructive feedback:</strong> Provide helpful, professional feedback when requested</li>
            </ul>
          </LegalSection>

          <LegalSection id="data-integrity" title="Data Integrity">
            <p>
              The value of our platform depends on accurate, high-quality data. All users must:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Provide truthful information in profiles and applications</li>
              <li>Keep professional information up-to-date</li>
              <li>Only upload documents you have the right to share</li>
              <li>Report inaccuracies you discover in platform data</li>
              <li>Respect data access permissions and visibility settings</li>
            </ul>
          </LegalSection>

          <LegalSection id="enforcement" title="Enforcement">
            <p>
              Violations of this Acceptable Use Policy may result in:
            </p>
            <div className="mt-4 space-y-4">
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400">Warning</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  First-time minor violations may result in a formal warning. We'll explain the 
                  issue and how to avoid future violations.
                </p>
              </Card>
              <Card className="p-4 border-orange-500/30 bg-orange-500/5">
                <h4 className="font-semibold text-orange-600 dark:text-orange-400">Temporary Suspension</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Repeated violations or moderate infractions may result in temporary account 
                  suspension (typically 7-30 days).
                </p>
              </Card>
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <h4 className="font-semibold text-destructive">Permanent Termination</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Severe violations, repeated offenses, or fraud will result in permanent account 
                  termination and may be reported to relevant authorities.
                </p>
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              We reserve the right to take immediate action without prior warning for severe 
              violations that threaten platform security or user safety.
            </p>
          </LegalSection>

          <LegalSection id="reporting" title="Reporting Violations">
            <div className="flex items-start gap-3 mb-4">
              <Flag className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p className="font-semibold">Help us maintain a safe platform by reporting violations:</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How to Report</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Use the "Report" button available on messages, profiles, and listings</li>
                  <li>Email: <a href="mailto:trust@thequantumclub.com" className="text-primary hover:underline">trust@thequantumclub.com</a></li>
                  <li>For security issues: <a href="mailto:security@thequantumclub.com" className="text-primary hover:underline">security@thequantumclub.com</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What to Include</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Description of the violation</li>
                  <li>User or content involved (username, URL, or ID)</li>
                  <li>Screenshots or evidence if available</li>
                  <li>Date and time of the incident</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Reports are confidential. We do not share reporter information with accused parties.
              </p>
            </div>
          </LegalSection>

          <LegalSection id="contact" title="Contact Us">
            <p>
              If you have questions about this Acceptable Use Policy, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>General Inquiries:</strong> <a href="mailto:support@thequantumclub.com" className="text-primary hover:underline">support@thequantumclub.com</a></p>
              <p><strong>Trust & Safety:</strong> <a href="mailto:trust@thequantumclub.com" className="text-primary hover:underline">trust@thequantumclub.com</a></p>
              <p><strong>Security:</strong> <a href="mailto:security@thequantumclub.com" className="text-primary hover:underline">security@thequantumclub.com</a></p>
            </div>
          </LegalSection>
        </div>
      </LegalPageLayout>
    </div>
  );
}
