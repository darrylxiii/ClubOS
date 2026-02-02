import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Gift, DollarSign, CheckCircle, XCircle, Calendar, HelpCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function ReferralTerms() {
  const lastUpdated = "January 15, 2025";

  const sections = [
    { id: "overview", title: "Program Overview" },
    { id: "eligibility", title: "Eligibility" },
    { id: "qualifying-referrals", title: "Qualifying Referrals" },
    { id: "rewards", title: "Reward Structure" },
    { id: "payment", title: "Payment Terms" },
    { id: "restrictions", title: "Restrictions" },
    { id: "program-changes", title: "Program Changes" },
    { id: "tax", title: "Tax Obligations" },
    { id: "faq", title: "Frequently Asked Questions" },
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
        title="Referral Program Terms"
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Gift className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Earn Rewards for Great Referrals</h3>
                <p className="text-muted-foreground">
                  Our referral program rewards you for introducing exceptional talent to The Quantum Club. 
                  When your referrals get hired, you earn rewards. It's that simple.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="overview" title="Program Overview">
            <p>
              The Quantum Club Referral Program allows members to earn rewards by referring 
              qualified professionals who successfully join through our platform and get hired 
              by a partner company.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Card className="p-4 border-border/50 text-center">
                <div className="text-3xl font-bold text-primary mb-2">1</div>
                <h4 className="font-semibold">Refer</h4>
                <p className="text-sm text-muted-foreground">Share your unique referral link or invite code</p>
              </Card>
              <Card className="p-4 border-border/50 text-center">
                <div className="text-3xl font-bold text-primary mb-2">2</div>
                <h4 className="font-semibold">They Get Hired</h4>
                <p className="text-sm text-muted-foreground">Your referral completes onboarding and gets placed</p>
              </Card>
              <Card className="p-4 border-border/50 text-center">
                <div className="text-3xl font-bold text-primary mb-2">3</div>
                <h4 className="font-semibold">You Earn</h4>
                <p className="text-sm text-muted-foreground">Receive your reward after probation period</p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="eligibility" title="Eligibility">
            <p>To participate in the referral program, you must:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Be an approved member of The Quantum Club (Candidate status)</li>
              <li>Have an active, good-standing account</li>
              <li>Not be an employee or contractor of The Quantum Club B.V.</li>
              <li>Not be the referral's current employer, direct manager, or family member</li>
            </ul>
            <p className="mt-4">
              Partners (hiring companies) and Strategists have separate referral/bonus structures 
              and are not eligible for the standard referral program.
            </p>
          </LegalSection>

          <LegalSection id="qualifying-referrals" title="Qualifying Referrals">
            <p>
              For a referral to qualify for a reward, the following conditions must be met:
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Valid Referral Link/Code</p>
                  <p className="text-sm text-muted-foreground">
                    The referral must use your unique referral link or enter your referral code during 
                    registration. Referrals cannot be retroactively assigned.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Complete Onboarding</p>
                  <p className="text-sm text-muted-foreground">
                    The referral must complete the full onboarding process and be approved as a member.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Successful Placement</p>
                  <p className="text-sm text-muted-foreground">
                    The referral must be hired by a TQC partner company through our platform.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Complete Probation</p>
                  <p className="text-sm text-muted-foreground">
                    The referral must complete their probation period (typically 3-6 months, as specified 
                    in their employment contract).
                  </p>
                </div>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="rewards" title="Reward Structure">
            <div className="flex items-start gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p>Current referral reward tiers:</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Role Level</th>
                    <th className="px-4 py-3 text-left font-semibold">Reward Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3">Junior (0-2 years)</td>
                    <td className="px-4 py-3 font-semibold text-primary">€500</td>
                    <td className="px-4 py-3 text-muted-foreground">Entry-level positions</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Mid-Level (2-5 years)</td>
                    <td className="px-4 py-3 font-semibold text-primary">€1,000</td>
                    <td className="px-4 py-3 text-muted-foreground">Standard professional roles</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Senior (5+ years)</td>
                    <td className="px-4 py-3 font-semibold text-primary">€1,500</td>
                    <td className="px-4 py-3 text-muted-foreground">Senior/Lead positions</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Executive / C-Suite</td>
                    <td className="px-4 py-3 font-semibold text-primary">€2,500</td>
                    <td className="px-4 py-3 text-muted-foreground">Director, VP, C-level</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Reward amounts are subject to change. The reward applicable is the one in effect at the 
              time the referral completes onboarding.
            </p>
          </LegalSection>

          <LegalSection id="payment" title="Payment Terms">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">When You Get Paid</p>
                  <p className="text-sm text-muted-foreground">
                    Rewards are paid within 30 days after the referral completes their probation period. 
                    This ensures the placement is successful.
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Payment Methods</p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Bank transfer (SEPA for EU, SWIFT for international)</li>
                  <li>PayPal (where available)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Required Information</p>
                <p className="text-muted-foreground">
                  To receive payment, you must provide valid payment details and any required tax 
                  documentation (e.g., W-8BEN for non-US persons, or equivalent).
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="restrictions" title="Restrictions">
            <p className="mb-4">The following are NOT eligible for referral rewards:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong>Self-referrals:</strong> You cannot refer yourself</p>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong>Existing members:</strong> Cannot refer someone already in the system</p>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong>Family members:</strong> Immediate family (spouse, parent, child, sibling)</p>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong>Direct reports:</strong> Current manager-subordinate relationships</p>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong>Fraudulent referrals:</strong> Fake profiles, bots, or gaming the system</p>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong>Paid solicitation:</strong> Paying others to sign up with your code</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              We reserve the right to withhold rewards and terminate accounts involved in referral fraud.
            </p>
          </LegalSection>

          <LegalSection id="program-changes" title="Program Changes">
            <p>
              The Quantum Club reserves the right to modify, suspend, or terminate the referral 
              program at any time. This includes:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Adjusting reward amounts</li>
              <li>Changing eligibility requirements</li>
              <li>Modifying payment terms</li>
              <li>Ending the program entirely</li>
            </ul>
            <p className="mt-4">
              We will notify members of material changes via email. Changes do not apply 
              retroactively to referrals already in progress at the time of the change.
            </p>
          </LegalSection>

          <LegalSection id="tax" title="Tax Obligations">
            <p>
              <strong>You are responsible for any taxes owed on referral rewards.</strong>
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Rewards may be considered taxable income in your jurisdiction</li>
              <li>We may be required to report payments to tax authorities</li>
              <li>You may need to provide tax documentation (W-8BEN, etc.)</li>
              <li>Consult a tax professional for advice specific to your situation</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              The Quantum Club B.V. is not responsible for determining your tax obligations.
            </p>
          </LegalSection>

          <LegalSection id="faq" title="Frequently Asked Questions">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Can I see my referral status?</p>
                  <p className="text-sm text-muted-foreground">
                    Yes! Visit your Referrals dashboard to see all referrals, their status, and 
                    projected vs. realized rewards.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">What if my referral leaves during probation?</p>
                  <p className="text-sm text-muted-foreground">
                    If the referral leaves or is terminated before completing probation, the 
                    reward is not paid. The referral status will show as "Not Qualified."
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Is there a limit to how many people I can refer?</p>
                  <p className="text-sm text-muted-foreground">
                    No limit! Refer as many qualified professionals as you like.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Can partners or strategists refer candidates?</p>
                  <p className="text-sm text-muted-foreground">
                    Partners and Strategists have separate incentive structures and are not 
                    eligible for the standard referral program rewards.
                  </p>
                </div>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="contact" title="Contact Us">
            <p>
              Questions about the referral program? Contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>Referral Support:</strong> <a href="mailto:referrals@thequantumclub.com" className="text-primary hover:underline">referrals@thequantumclub.com</a></p>
              <p><strong>General Support:</strong> <a href="mailto:support@thequantumclub.com" className="text-primary hover:underline">support@thequantumclub.com</a></p>
            </div>
          </LegalSection>
        </div>
      </LegalPageLayout>
    </div>
  );
}
