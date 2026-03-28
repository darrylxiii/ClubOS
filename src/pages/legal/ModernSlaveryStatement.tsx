import { Helmet } from 'react-helmet-async';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Users, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

export default function ModernSlaveryStatement() {
  const lastUpdated = "March 28, 2026";
  
  const sections = [
    { id: "1-introduction", title: "1. Policy Statement & Introduction" },
    { id: "2-our-structure", title: "2. Our Structure and Supply Chain" },
    { id: "3-our-policies", title: "3. Organizational Policies" },
    { id: "4-due-diligence", title: "4. Due Diligence Processes" },
    { id: "5-assessing-risk", title: "5. Risk Assessment & Management" },
    { id: "6-training", title: "6. Training and Awareness" },
    { id: "7-approval", title: "7. Approval and Review" }
  ];

  return (
    <Helmet>
        <title>{t('legalPages.modernSlaveryStatement', 'Anti-Slavery & Human Trafficking Statement')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.modernSlaveryStatementDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
      title={t('legalPages.modernSlaveryStatement', 'Anti-Slavery & Human Trafficking Statement')}
      lastUpdated={lastUpdated}
      sections={sections}
    >
      <div className="space-y-8">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Users className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Zero-Tolerance Policy</h3>
              <p className="text-muted-foreground">
                This statement, published by The Quantum Club B.V. ("TQC", "we", or "our"), sets out our 
                actions and commitment to understanding all potential modern slavery risks related to our 
                business and to ensure that there is no slavery or human trafficking in our own business 
                and our supply chains.
              </p>
              <p className="text-muted-foreground mt-2 text-sm italic">
                This statement is made pursuant to Section 54(1) of the UK Modern Slavery Act 2015, and other 
                relevant international frameworks regarding ethical labor supply, for the financial year ending 2026.
              </p>
            </div>
          </div>
        </Card>

        <LegalSection id="1-introduction" title="1. Policy Statement">
          <p className="text-muted-foreground">
            Modern slavery is a crime and a violation of fundamental human rights. It takes various forms, such as slavery, 
            servitude, forced and compulsory labor, and human trafficking, all of which have in common the deprivation of a 
            person's liberty by another in order to exploit them for personal or commercial gain.
          </p>
          <p className="text-muted-foreground mt-2">
            The Quantum Club has a zero-tolerance approach to modern slavery, and we are committed to acting ethically and with integrity in all our business dealings and relationships. As an elite tech recruitment and career development platform, we hold a unique responsibility in the global labor market to champion ethical hiring practices globally.
          </p>
        </LegalSection>

        <LegalSection id="2-our-structure" title="2. Our Structure, Business, and Supply Chain">
          <p className="text-muted-foreground">
            TQC is an AI-augmented talent platform headquartered in Amsterdam, Netherlands. We provide Software-as-a-Service (SaaS) matching tools interconnecting tech professionals (ranging from junior developers to executives) with Partners globally.
          </p>
          <p className="text-muted-foreground mt-2">
            Given the nature of our business—providing digital algorithms, recruiting services, and networking software—we assess the risk of modern slavery within our direct business operations as <strong>low</strong>.
          </p>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Our Supply Chain</h4>
            <p className="text-muted-foreground mb-2">Our supply chains are primarily comprised of:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Cloud computing providers (e.g., AWS, Supabase, Cloudflare)</li>
              <li>Software application providers (e.g., OpenAI, Google, Stripe, PostHog)</li>
              <li>Professional services (legal, accounting, strategic advisory)</li>
              <li>Digital marketing and consulting agencies</li>
            </ul>
          </div>
        </LegalSection>

        <LegalSection id="3-our-policies" title="3. Organizational Policies">
          <p className="text-muted-foreground">We operate several internal policies to ensure we conduct business in an ethical and transparent manner. These include:</p>
          <div className="grid gap-4 mt-4">
            <Card className="p-4 border-border/50 flex gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Anti-Slavery Policy</h4>
                <p className="text-xs text-muted-foreground">This statement embodies our overarching stance.</p>
              </div>
            </Card>
            <Card className="p-4 border-border/50 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Whistleblowing Policy</h4>
                <p className="text-xs text-muted-foreground">Ensuring all employees know that they can raise concerns about how colleagues are being treated without fear of reprisal.</p>
              </div>
            </Card>
            <Card className="p-4 border-border/50 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Supplier Code of Conduct</h4>
                <p className="text-xs text-muted-foreground">Outlining the standards we expect from to our direct partners and enterprise service providers.</p>
              </div>
            </Card>
          </div>
        </LegalSection>

        <LegalSection id="4-due-diligence" title="4. Due Diligence Processes">
          <p className="text-muted-foreground">While we consider our industry low-risk, as part of our initiative to identify and mitigate risk, we:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
            <li>Identify and assess potential risk areas in our supply chains before onboarding major digital vendors.</li>
            <li>Incorporate anti-slavery clauses in our contracts with high-volume enterprise Partners, demanding ethical hiring standards.</li>
            <li>Maintain an internal protocol to flag Partners (Employers) suspected of exploitative practices (e.g., withholding passports, "bait-and-switch" visa scams) and ban them from Club OS instantly.</li>
          </ul>
        </LegalSection>

        <LegalSection id="5-assessing-risk" title="5. Risk Assessment & Management">
          <p className="text-muted-foreground">
            The greatest risk of modern slavery interaction falls upon the Partner/Applicant ecosystem rather than our direct digital supply chain. Specifically concerning cross-border "gig work" or freelance deployments. TQC mitigates this risk by requiring identity verifications, maintaining transparent "No Cure, No Pay" fee models, and ensuring all platform users confirm our Acceptable Use Policy which explicitly bans forced labor recruitment.
          </p>
        </LegalSection>

        <LegalSection id="6-training" title="6. Training and Awareness">
          <p className="text-muted-foreground">
            To ensure a high level of understanding of the risks of modern slavery and human trafficking in our supply chains and our business, we provide training to our staff. TQC Strategists are specifically trained to identify "red flags" during the dossier review and Partner onboarding processes, particularly addressing international visa sponsorships.
          </p>
        </LegalSection>

        <LegalSection id="7-approval" title="7. Approval for this Statement">
          <p className="text-muted-foreground">
            This statement is reviewed annually and signed by the Board of Directors of The Quantum Club B.V.
          </p>
          <p className="text-muted-foreground mt-4 font-semibold italic">Approved by the Board of Directors — March 28, 2026</p>
        </LegalSection>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            For inquiries regarding our supply chain ethics, please contact <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">info@thequantumclub.com</a>.
          </p>
        </div>
        <div className="mt-12 p-6 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} The Quantum Club B.V. All rights reserved. | Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands | KvK: 93498871
          </p>
        </div>

      </div>
    </LegalPageLayout>
  );
}
