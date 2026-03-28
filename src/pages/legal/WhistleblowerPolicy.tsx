import { Helmet } from 'react-helmet-async';
import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Shield, Mail, Phone, FileText } from "lucide-react";
import { EthicsReportForm } from "@/components/legal/EthicsReportForm";

export default function WhistleblowerPolicy() {
  const { t } = useTranslation("common");
  const lastUpdated = "March 28, 2026";

  const sections = [
    { id: "1-purpose", title: t("whistleblower.nav.purpose", "1. Purpose & Scope") },
    { id: "2-what-to-report", title: t("whistleblower.nav.whatToReport", "2. What Can Be Reported") },
    { id: "3-how-to-report", title: t("whistleblower.nav.howToReport", "3. How to Report") },
    { id: "4-protection", title: t("whistleblower.nav.protection", "4. Protection Guarantees") },
    { id: "5-investigation", title: t("whistleblower.nav.investigation", "5. Investigation Process") },
    { id: "6-timeline", title: t("whistleblower.nav.timeline", "6. Response Timeline") },
    { id: "7-submit-report", title: t("whistleblower.nav.submitReport", "7. Submit a Report") },
  ];

  return (
    <Helmet>
        <title>{t("whistleblower.title", "Whistleblower & Ethics Reporting Policy")} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.whistleblowerPolicyDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
      title={t("whistleblower.title", "Whistleblower & Ethics Reporting Policy")}
      lastUpdated={lastUpdated}
      sections={sections}
    >
      <div className="space-y-8">
        {/* Hero card */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t("whistleblower.heroTitle", "Your Voice Matters -- Report in Confidence")}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "whistleblower.heroDescription",
                  "The Quantum Club B.V. (\"TQC\") is committed to the highest standards of ethical conduct, transparency, and accountability. This policy establishes a secure channel for reporting concerns about illegal, unethical, or improper conduct. All reports are handled in compliance with EU Directive 2019/1937 (the Whistleblower Protection Directive) and Dutch whistleblower protection legislation (Wet bescherming klokkenluiders)."
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* 1. Purpose & Scope */}
        <LegalSection id="1-purpose" title={t("whistleblower.purposeTitle", "1. Purpose & Scope")}>
          <p className="text-muted-foreground mb-3">
            {t(
              "whistleblower.purposeText1",
              "This Whistleblower & Ethics Reporting Policy applies to all employees, contractors, freelancers, candidates, partners, suppliers, and any individual who interacts with The Quantum Club's platform or services."
            )}
          </p>
          <p className="text-muted-foreground">
            {t(
              "whistleblower.purposeText2",
              "The purpose of this policy is to provide a safe, confidential, and -- where desired -- anonymous mechanism for reporting concerns about breaches of law, internal policies, or ethical standards, without fear of retaliation or adverse consequences."
            )}
          </p>
        </LegalSection>

        {/* 2. What Can Be Reported */}
        <LegalSection id="2-what-to-report" title={t("whistleblower.whatToReportTitle", "2. What Can Be Reported")}>
          <p className="text-muted-foreground mb-3">
            {t(
              "whistleblower.whatToReportIntro",
              "You may report any suspected or actual misconduct, including but not limited to:"
            )}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>{t("whistleblower.categoryFraud", "Fraud & Financial Misconduct")}</strong> --{" "}
              {t(
                "whistleblower.categoryFraudDesc",
                "Embezzlement, bribery, corruption, money laundering, falsification of financial records, or misuse of company assets."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.categoryDataBreach", "Data Breaches & Privacy Violations")}</strong> --{" "}
              {t(
                "whistleblower.categoryDataBreachDesc",
                "Unauthorized access to personal data, GDPR violations, improper data handling, or failure to report security incidents."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.categoryDiscrimination", "Discrimination")}</strong> --{" "}
              {t(
                "whistleblower.categoryDiscriminationDesc",
                "Discrimination based on race, gender, age, disability, religion, sexual orientation, nationality, or any other protected characteristic."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.categoryHarassment", "Harassment & Bullying")}</strong> --{" "}
              {t(
                "whistleblower.categoryHarassmentDesc",
                "Sexual harassment, workplace bullying, intimidation, hostile work environment, or psychological abuse."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.categorySafety", "Health & Safety Violations")}</strong> --{" "}
              {t(
                "whistleblower.categorySafetyDesc",
                "Unsafe working conditions, failure to comply with health and safety regulations, or environmental violations."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.categoryLegal", "Legal & Regulatory Violations")}</strong> --{" "}
              {t(
                "whistleblower.categoryLegalDesc",
                "Breaches of EU law, Dutch national law, competition law, consumer protection regulations, or any other applicable legislation."
              )}
            </li>
          </ul>
        </LegalSection>

        {/* 3. How to Report */}
        <LegalSection id="3-how-to-report" title={t("whistleblower.howToReportTitle", "3. How to Report")}>
          <p className="text-muted-foreground mb-4">
            {t(
              "whistleblower.howToReportIntro",
              "We provide multiple secure channels for submitting a report. You may choose to remain anonymous."
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">
                  {t("whistleblower.channelForm", "Online Form")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "whistleblower.channelFormDesc",
                  "Use the secure reporting form below. Anonymous submissions are supported."
                )}
              </p>
            </Card>
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">
                  {t("whistleblower.channelEmail", "Email")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "whistleblower.channelEmailDesc",
                  "Send a detailed report to info@thequantumclub.com. Use an anonymous email service if you prefer."
                )}
              </p>
            </Card>
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">
                  {t("whistleblower.channelPhone", "Phone")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "whistleblower.channelPhoneDesc",
                  "Call our confidential ethics hotline at +31 (0) 20 123 4567, available Monday to Friday, 9:00 -- 17:00 CET."
                )}
              </p>
            </Card>
          </div>
        </LegalSection>

        {/* 4. Protection Guarantees */}
        <LegalSection id="4-protection" title={t("whistleblower.protectionTitle", "4. Protection Guarantees")}>
          <p className="text-muted-foreground mb-3">
            {t(
              "whistleblower.protectionIntro",
              "TQC fully complies with EU Directive 2019/1937 and Dutch law (Wet bescherming klokkenluiders). We guarantee the following protections:"
            )}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <span className="font-bold text-destructive">Irreversible Anti-Retaliation Core Doctrine</span> --{" "}
              {t(
                "whistleblower.protectionNoRetaliationDesc",
                "Under zero circumstances will a whistleblower face dismissal, demotion, harassment, or financial penalty for making a good-faith report. This anti-retaliation pledge is an immutable corporate doctrine; any manager or executive found attempting to uncover an anonymous reporter or enacting retaliatory measures will face immediate termination for cause and potential civil liability."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.protectionConfidentiality", "Confidentiality")}</strong> --{" "}
              {t(
                "whistleblower.protectionConfidentialityDesc",
                "Your identity will be kept strictly confidential. Only the designated ethics officer and, where legally required, relevant authorities will have access to your identity. We will never disclose your identity without your explicit consent, except where mandated by law."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.protectionAnonymity", "Anonymity")}</strong> --{" "}
              {t(
                "whistleblower.protectionAnonymityDesc",
                "Anonymous reports are accepted and will be investigated with the same diligence as identified reports. We do not track IP addresses or metadata of anonymous submissions."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.protectionLegalSupport", "Legal Support")}</strong> --{" "}
              {t(
                "whistleblower.protectionLegalSupportDesc",
                "Whistleblowers are entitled to legal aid, interim relief, and full compensation for any damages suffered as a result of retaliation, as provided under the EU Directive."
              )}
            </li>
          </ul>
        </LegalSection>

        {/* 5. Investigation Process */}
        <LegalSection id="5-investigation" title={t("whistleblower.investigationTitle", "5. Investigation Process")}>
          <p className="text-muted-foreground mb-3">
            {t(
              "whistleblower.investigationIntro",
              "All reports are handled by our designated Ethics Officer following a structured investigation process:"
            )}
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>{t("whistleblower.step1", "Receipt & Acknowledgment")}</strong> --{" "}
              {t(
                "whistleblower.step1Desc",
                "Your report is logged in a secure, access-restricted system. You will receive acknowledgment within 7 calendar days."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.step2", "Assessment")}</strong> --{" "}
              {t(
                "whistleblower.step2Desc",
                "The Ethics Officer assesses the report for validity and determines whether a formal investigation is warranted."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.step3", "Investigation")}</strong> --{" "}
              {t(
                "whistleblower.step3Desc",
                "An impartial investigation is conducted. Evidence is gathered, relevant parties may be interviewed, and external experts may be engaged if necessary."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.step4", "Outcome & Remediation")}</strong> --{" "}
              {t(
                "whistleblower.step4Desc",
                "Findings are documented. If misconduct is confirmed, appropriate corrective and disciplinary actions are taken. Systemic issues are addressed through policy or process changes."
              )}
            </li>
            <li>
              <strong>{t("whistleblower.step5", "Feedback")}</strong> --{" "}
              {t(
                "whistleblower.step5Desc",
                "You will be informed of the outcome of the investigation within 3 months from acknowledgment, to the extent permitted by law and confidentiality obligations."
              )}
            </li>
          </ol>
        </LegalSection>

        {/* 6. Response Timeline */}
        <LegalSection id="6-timeline" title={t("whistleblower.timelineTitle", "6. Response Timeline")}>
          <p className="text-muted-foreground mb-3">
            {t(
              "whistleblower.timelineIntro",
              "In accordance with Article 9 of EU Directive 2019/1937, TQC adheres to the following mandatory timelines:"
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4 border-primary/20 bg-primary/5">
              <h4 className="font-semibold text-sm mb-1">
                {t("whistleblower.timeline7Days", "Within 7 Days")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t(
                  "whistleblower.timeline7DaysDesc",
                  "Written acknowledgment of receipt of the report is sent to the reporting person (unless the person has explicitly opted out or acknowledgment would jeopardize confidentiality)."
                )}
              </p>
            </Card>
            <Card className="p-4 border-primary/20 bg-primary/5">
              <h4 className="font-semibold text-sm mb-1">
                {t("whistleblower.timeline3Months", "Within 3 Months")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t(
                  "whistleblower.timeline3MonthsDesc",
                  "Feedback on the investigation outcome is provided to the reporting person. This includes any actions taken or planned as a result of the report."
                )}
              </p>
            </Card>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            {t(
              "whistleblower.timelineExternal",
              "If you are not satisfied with the internal handling of your report, you have the right to report externally to the Dutch Whistleblowers Authority (Huis voor Klokkenluiders) or other competent national authorities."
            )}
          </p>
        </LegalSection>

        {/* 7. Submit a Report */}
        <LegalSection id="7-submit-report" title={t("whistleblower.submitReportTitle", "7. Submit a Report")}>
          <p className="text-muted-foreground mb-6">
            {t(
              "whistleblower.submitReportIntro",
              "Use the secure form below to submit your report. You may choose to remain anonymous. All submissions are encrypted and handled in strict confidence."
            )}
          </p>
          <EthicsReportForm />
        </LegalSection>

        {/* Footer */}
        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            {t(
              "whistleblower.footerText",
              "This policy is reviewed annually and updated as required to maintain compliance with applicable legislation. For questions about this policy, contact"
            )}{" "}
            <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
              info@thequantumclub.com
            </a>
          </p>
        </div>
      </div>
    </LegalPageLayout>
  );
}
