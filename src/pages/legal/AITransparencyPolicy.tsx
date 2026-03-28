import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Sparkles, Settings2, ShieldCheck, Scale, Cpu } from "lucide-react";

export default function AITransparencyPolicy() {
  const { t } = useTranslation('common');
  const lastUpdated = "March 28, 2026";
  
  const sections = [
    { id: "1-purpose", title: "1. Purpose and Scope" },
    { id: "2-our-ai", title: "2. How Club OS Uses AI" },
    { id: "3-high-risk", title: "3. Classification as a High-Risk AI System" },
    { id: "4-human-oversight", title: "4. Human Oversight & Intervention" },
    { id: "5-data-privacy", title: "5. Data Privacy in AI Training" },
    { id: "6-fairness", title: "6. Fairness and Bias Mitigation" },
    { id: "7-user-rights", title: "7. User Rights & Explanation" },
    { id: "8-contact", title: "8. AI Ethics Contact" },
  ];

  return (
    <>
      <Helmet>
        <title>{t('legalPages.aITransparencyPolicy', 'AI Transparency & Ethics Policy')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.aITransparencyPolicyDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
        title={t('legalPages.aITransparencyPolicy', 'AI Transparency & Ethics Policy')}
        lastUpdated={lastUpdated}
        sections={sections}
      >
      <div className="space-y-8">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Sparkles className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Committed to Ethical AI</h3>
              <p className="text-muted-foreground">
                At The Quantum Club B.V. ("TQC"), Artificial Intelligence (AI) powers our ability to match top-tier talent with pioneering companies globally. This AI Transparency Policy explains how we utilize AI algorithms within Club OS, the safeguards we have implemented, and how we comply with the <strong>European Union Artificial Intelligence Act (EU AI Act)</strong> requirements for employment algorithms.
              </p>
            </div>
          </div>
        </Card>

        {/* 1. Purpose */}
        <LegalSection id="1-purpose" title="1. Purpose and Scope">
          <p className="text-muted-foreground">
            Transparency is central to trust. This policy provides clear information about the capabilities and limitations of our AI systems, notably "Club AI." It applies to all users (Candidates, Partners, and internal Strategists) leveraging the generative and predictive features of Club OS.
          </p>
        </LegalSection>

        {/* 2. Our AI */}
        <LegalSection id="2-our-ai" title="2. How Club OS Uses AI">
          <p className="text-muted-foreground mb-4">Our AI systems serve several critical functions on the Platform:</p>
          <div className="grid gap-4 mt-4">
            <Card className="p-4 border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">Candidate Matching & Scoring</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                We use predictive language models to analyze Candidate CVs, project histories, and skills against Partner job descriptions. The output is a compatibility "score" indicating potential alignment.
              </p>
            </Card>
            <Card className="p-4 border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold">Club AI Advisory & Interview Prep</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                We provide candidates with a conversational AI agent (Club AI) to rewrite resumes, simulate mock interviews, and optimize public profiles. Partners utilize Club AI to draft compelling job descriptions and suggested interview questions.
              </p>
            </Card>
            <Card className="p-4 border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h4 className="font-semibold">Meeting Intelligence</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                With explicit consent, integrated AI engines transcribe video meetings to provide automated summaries, action items, and sentiment analysis for recruitment evaluation.
              </p>
            </Card>
          </div>
        </LegalSection>

        {/* 3. High Risk */}
        <LegalSection id="3-high-risk" title="3. Classification as a High-Risk AI System">
          <p className="text-muted-foreground">
            Under <strong>Annex III, Section 4 of the EU AI Act</strong>, AI systems intended to be used for the recruitment or selection of natural persons—notably for placing targeted job advertisements, analyzing and filtering applications, and evaluating candidates—are classified as <strong>High-Risk AI Systems</strong>.
          </p>
          <p className="text-muted-foreground mt-4">
            Consequently, TQC actively manages these models through a defined risk management system, maintains technical documentation, enforces robust data governance, and demands high degrees of accuracy and cybersecurity.
          </p>
          <p className="text-muted-foreground mt-4">
            <strong>Third-Party B2B Algorithmic Audit Rights:</strong> To achieve maximum compliance with the supply-chain transparency mandates of the EU AI Act, Enterprise Partners retain the right to request comprehensive compliance attestations. Upon formal inquiry, TQC provides Enterprise Partners with algorithmic oversight documentation, data quality logging, and bias mitigation testing results to fulfill their own regulatory obligations.
          </p>
        </LegalSection>

        {/* 4. Human Oversight */}
        <LegalSection id="4-human-oversight" title="4. Human Oversight & Intervention (Human-in-the-Loop)">
          <div className="p-4 bg-primary/5 rounded-md border border-primary/20 mb-4">
            <div className="flex items-center gap-2 font-semibold text-primary mb-2">
              <ShieldCheck className="w-5 h-5" />
              Our Commitment
            </div>
            <p className="text-sm text-foreground">
              We prohibit our AI from making autonomous, legally binding hiring or rejection decisions on behalf of employers without human adjudication.
            </p>
          </div>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Match scores are advisory.</strong> AI scores function as a sorting tool for TQC Strategists and Hiring Managers but represent merely one data point in recruitment.</li>
            <li><strong>Human Review Required.</strong> Final candidate shortlisting for dossiers, and all hiring, offer, or rejection outcomes ultimately result from a human manager's review.</li>
            <li><strong>Veto Power.</strong> Strategists possess the ability to manually override AI scores or matching suggestions if contextual nuances (e.g., untracked soft skills) are missed by the algorithm.</li>
          </ul>
        </LegalSection>

        {/* 5. Data Privacy */}
        <LegalSection id="5-data-privacy" title="5. Data Privacy in AI Processing">
          <p className="text-muted-foreground">
            The foundation of ethical AI is data privacy. We employ foundation models from strict Enterprise API providers (such as OpenAI API and Google cloud computing services).
          </p>
          <p className="font-semibold text-foreground mt-4 mb-2">ZERO DATA TRAINING GUARANTEE:</p>
          <p className="text-muted-foreground">
            TQC maintains enterprise agreements guaranteeing that <strong>your private data, CVs, interview notes, and meeting transcripts are NEVER utilized to train, retrain, or improve the public foundation models of our third-party LLM providers.</strong> TQC only uses internal, anonymized telemetry strictly to calibrate our proprietary prompt structures locally.
          </p>
        </LegalSection>

        {/* 6. Fairness */}
        <LegalSection id="6-fairness" title="6. Fairness and Bias Mitigation">
          <div className="flex items-start gap-3 mt-4">
            <Scale className="w-6 h-6 text-primary flex-shrink-0" />
            <p className="text-muted-foreground">
              We architect our assessment schemas specifically to measure competencies strictly vital to the job description. TQC systematically filters out or obfuscates highly protected demographic identifiers (such as age vectors, ethnicity markers, or familial status metadata) out of the vector databases that power our matching queries, mitigating historical systemic bias prevalent in automated assessment generation. 
            </p>
          </div>
        </LegalSection>

        {/* 7. User Rights */}
        <LegalSection id="7-user-rights" title="7. User Rights & AI Explanation">
          <p className="text-muted-foreground mb-2">As an individual evaluated by our systems, you retain specific rights:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Right to the Logic Involved:</strong> The right to obtain a meaningful explanation of the main parameters our AI utilizes (e.g., skillset overlap, tenure requirements) to generate a match score.</li>
            <li><strong>Right to Object:</strong> The right to halt AI profiling entirely, which may be enacted by deactivating your profile from active matchmaking via Account Settings.</li>
            <li><strong>Contesting Decisions:</strong> The right to request human intervention to express your point of view or contest a perceived AI-driven exclusion from a hiring pool. You can request this review from your designated TQC Strategist.</li>
          </ul>
        </LegalSection>

        {/* 8. Contact */}
        <LegalSection id="8-contact" title="8. AI Ethics Contact">
          <p className="text-muted-foreground">
            If you have concerns about potential bias, algorithm transparency, or how AI has pertained to your recruitment journey, please reach out to our compliance leadership.
          </p>
          <div className="mt-4 space-y-2 text-foreground">
            <p><strong>Email:</strong> <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">info@thequantumclub.com</a></p>
            <p><strong>Mail:</strong> The Quantum Club B.V.<br />Attn: AI Compliance Desk<br />Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands</p>
          </div>
        </LegalSection>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} The Quantum Club B.V. All rights reserved.
          </p>
        </div>
      </div>
    </LegalPageLayout>
    </>
  );
}
