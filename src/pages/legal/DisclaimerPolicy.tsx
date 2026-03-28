import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function DisclaimerPolicy() {
  const { t } = useTranslation('common');
  const lastUpdated = "March 28, 2026";
  
  const sections = [
    { id: "1-general-disclaimer", title: "1. General Information Disclaimer" },
    { id: "2-ai-disclaimer", title: "2. AI Content & Generative Models" },
    { id: "3-career-salary", title: "3. Career, Salary, & Employment Advice" },
    { id: "4-financial-investor", title: "4. Financial & Investment Disclaimers" },
    { id: "5-third-party", title: "5. Third-Party Links & Integrations" },
    { id: "6-limitation", title: "6. Limitation of Liability" }
  ];

  return (
    <>
      <Helmet>
        <title>{t('legalPages.disclaimerPolicy', 'Platform Disclaimers')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.disclaimerPolicyDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
        title={t('legalPages.disclaimerPolicy', 'Platform Disclaimers')}
        lastUpdated={lastUpdated}
        sections={sections}
      >
      <div className="space-y-8">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Notice to All Users</h3>
              <p className="text-muted-foreground">
                The information provided by The Quantum Club B.V. ("TQC", "we", "us", or "our") on Club OS (the "Platform") is for general informational purposes only. While we strive to provide excellent matchmaking and AI-augmented career tools, all information on the Platform is provided in good faith without any representation or warranty of any kind regarding accuracy, validity, reliability, or completeness.
              </p>
            </div>
          </div>
        </Card>

        {/* 1. General */}
        <LegalSection id="1-general-disclaimer" title="1. General Information Disclaimer">
          <p className="text-muted-foreground">
            The use of Club OS, our matchmaking services, and our project marketplaces is strictly at your own risk. TQC acts as a venue/intermediary connecting Candidates and Partners, and unless acting under a specific payroll/EOR agreement, TQC is <strong>not</strong> the employer, is <strong>not</strong> responsible for hiring decisions, and does <strong>not</strong> guarantee employment placement, specific salaries, or project completion.
          </p>
        </LegalSection>

        {/* 2. AI Disclaimer */}
        <LegalSection id="2-ai-disclaimer" title="2. AI Content & Generative Models">
          <p className="text-muted-foreground mb-2">Club OS utilizes advanced generative Artificial Intelligence (Club AI). Understand the inherent limitations:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Hallucinations & Inaccuracies:</strong> Generative models (e.g., Gemini, OpenAI) may occasionally produce "hallucinations"—information that sounds highly plausible but is factually incorrect, illogical, or entirely fabricated.</li>
            <li><strong>No Legal or Professional Advice:</strong> If an AI within the Platform gives advice on contract negotiation, visa sponsorship, or labor law, it does so based on pattern recognition from broad datasets, <strong>not</strong> as a licensed attorney. You must verify AI-generated advice with a human professional.</li>
            <li><strong>Drafting Resumes & Job Descriptions:</strong> When you use Club AI to optimize a resume or write a job description, you accept full accountability for the truthfulness and accuracy of the final, submitted document.</li>
          </ul>
        </LegalSection>

        {/* 3. Career & Salary */}
        <LegalSection id="3-career-salary" title="3. Career, Salary, & Employment Advice">
          <p className="text-muted-foreground">
            Information regarding "Market Rates," "Salary Insights," "Career Pathways," or predictive earning potentials are aggregated estimates derived from internal data, Partner feedback, and historical market trends. These are <strong>guidelines only</strong>.
          </p>
          <p className="text-muted-foreground mt-2">
            Salaries and offers highly fluctuate based on geography, equity structures, negotiation skills, timing, and specific corporate budgeting constraints. TQC makes no warranty that a Candidate will command the salaries projected by our analytics tools.
          </p>
        </LegalSection>

        {/* 4. Financial & Investors */}
        <LegalSection id="4-financial-investor" title="4. Financial & Investment Disclaimers">
          <p className="text-muted-foreground">
            If you access the <strong>Investor Portal</strong>, equity compensation tools, or pitch materials on the Platform: 
            <strong> WE ARE NOT PROVIDING FINANCIAL, TAX, OR INVESTMENT ADVICE.</strong>
          </p>
          <p className="text-muted-foreground mt-2">
            Startups and high-growth companies carry extreme investment risks. Any discussion of equity, stock options, valuation, or projected ROI on the Platform is speculative. You should consult a licensed financial advisor or accountant prior to making investment decisions or accepting equity compensation in lieu of cash salary. TQC is not registered as an investment advisor or broker-dealer in the Netherlands, the United States, or any other jurisdiction.
          </p>
        </LegalSection>

        {/* 5. Third Party */}
        <LegalSection id="5-third-party" title="5. Third-Party Links & Integrations">
          <p className="text-muted-foreground">
            The Platform aggregates job postings, company profiles, and external SaaS tools (like Applicant Tracking Systems, Assessment Providers, or OAuth providers). We have no control over the content, privacy policies, or stability of external websites and integrations. TQC explicitly disclaims liability for damages or losses incurred by interacting with linked third-party environments.
          </p>
        </LegalSection>

        {/* 6. Limitation */}
        <LegalSection id="6-limitation" title="6. Final Limitation">
          <p className="text-muted-foreground font-semibold">
            Under no circumstance shall TQC have any liability to you for any loss or damage of any kind incurred as a result of the use of the platform or reliance on any AI-generated insight, match score, or salary projection provided on the platform. Your reliance on any information on the platform is solely at your own risk.
          </p>
        </LegalSection>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Please review our full <a href="/terms" className="text-primary hover:underline">Terms of Service</a> for legally binding stipulations regarding liability.
          </p>
        </div>
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
