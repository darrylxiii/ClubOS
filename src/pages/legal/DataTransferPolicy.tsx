import { Helmet } from 'react-helmet-async';
import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Shield,
  FileCheck,
  Lock,
  Eye,
  UserCheck,
  Link as LinkIcon,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Scale,
} from "lucide-react";

export default function DataTransferPolicy() {
  const { t } = useTranslation("common");
  const lastUpdated = "March 28, 2026";

  const sections = [
    { id: "1-overview", title: t("dataTransfer.nav.overview", "1. Overview") },
    { id: "2-transfer-mechanisms", title: t("dataTransfer.nav.mechanisms", "2. Transfer Mechanisms") },
    { id: "3-transfer-impact-assessment", title: t("dataTransfer.nav.tia", "3. Transfer Impact Assessment") },
    { id: "4-supplementary-safeguards", title: t("dataTransfer.nav.safeguards", "4. Supplementary Safeguards") },
    { id: "5-your-rights", title: t("dataTransfer.nav.rights", "5. Your Rights") },
    { id: "6-sub-processor-transfers", title: t("dataTransfer.nav.subProcessors", "6. Sub-processor Transfers") },
    { id: "7-updates", title: t("dataTransfer.nav.updates", "7. Updates & Notifications") },
  ];

  const adequacyCountries = [
    "Andorra", "Argentina", "Canada (commercial)", "Faroe Islands", "Guernsey",
    "Isle of Man", "Israel", "Japan", "Jersey", "New Zealand",
    "Republic of Korea", "Switzerland", "United Kingdom", "Uruguay",
  ];

  const tiaRows = [
    {
      destination: t("dataTransfer.tia.us", "United States"),
      legalBasis: t("dataTransfer.tia.sccs", "SCCs (Module 2 & 3)"),
      measures: t("dataTransfer.tia.usMeasures", "AES-256 encryption at rest, TLS 1.3 in transit, strict access controls, data minimization"),
      risk: "medium" as const,
    },
    {
      destination: t("dataTransfer.tia.uk", "United Kingdom"),
      legalBasis: t("dataTransfer.tia.adequacy", "EU Adequacy Decision"),
      measures: t("dataTransfer.tia.ukMeasures", "Standard contractual protections, UK GDPR alignment"),
      risk: "low" as const,
    },
    {
      destination: t("dataTransfer.tia.ch", "Switzerland"),
      legalBasis: t("dataTransfer.tia.adequacy", "EU Adequacy Decision"),
      measures: t("dataTransfer.tia.chMeasures", "Standard contractual protections, FADP compliance"),
      risk: "low" as const,
    },
    {
      destination: t("dataTransfer.tia.jp", "Japan"),
      legalBasis: t("dataTransfer.tia.adequacy", "EU Adequacy Decision"),
      measures: t("dataTransfer.tia.jpMeasures", "APPI supplementary rules, contractual safeguards"),
      risk: "low" as const,
    },
  ];

  const riskBadge = (level: "low" | "medium" | "high") => {
    const config = {
      low: { label: t("dataTransfer.risk.low", "Low"), className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
      medium: { label: t("dataTransfer.risk.medium", "Medium"), className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      high: { label: t("dataTransfer.risk.high", "High"), className: "bg-red-500/10 text-red-600 border-red-500/20" },
    };
    return <Badge variant="outline" className={config[level].className}>{config[level].label}</Badge>;
  };

  return (
    <Helmet>
        <title>{t("dataTransfer.title", "Cross-Border Data Transfer Policy")} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.dataTransferPolicyDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
      title={t("dataTransfer.title", "Cross-Border Data Transfer Policy")}
      lastUpdated={lastUpdated}
      sections={sections}
    >
      <div className="space-y-8">
        {/* Hero notice */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Globe className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t("dataTransfer.notice.title", "Post-Schrems II Compliance")}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "dataTransfer.notice.body",
                  "Following the Court of Justice of the European Union's Schrems II ruling (C-311/18), The Quantum Club B.V. (\"TQC\") has implemented comprehensive safeguards for all cross-border personal data transfers. This policy documents our transfer mechanisms, impact assessments, and supplementary measures in accordance with GDPR Chapter V (Articles 44\u201349)."
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* 1. Overview */}
        <LegalSection id="1-overview" title={t("dataTransfer.overview.title", "1. Overview")}>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t(
                "dataTransfer.overview.p1",
                "The Quantum Club B.V. (\"ClubOS\") is headquartered in Amsterdam, Netherlands, within the European Union. Our primary data processing infrastructure is hosted on Amazon Web Services (AWS) in the Frankfurt region (eu-central-1), ensuring that the majority of personal data remains within the EU/EEA at all times."
              )}
            </p>
            <Card className="p-5 bg-muted/30 border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t("dataTransfer.overview.hqLabel", "Headquarters")}</p>
                    <p className="text-sm text-muted-foreground">{t("dataTransfer.overview.hqValue", "Amsterdam, Netherlands (EU)")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t("dataTransfer.overview.infraLabel", "Primary Infrastructure")}</p>
                    <p className="text-sm text-muted-foreground">{t("dataTransfer.overview.infraValue", "AWS Frankfurt (eu-central-1)")}</p>
                  </div>
                </div>
              </div>
            </Card>
            <p className="text-muted-foreground">
              {t(
                "dataTransfer.overview.p2",
                "Where transfers of personal data to third countries are necessary (e.g., for sub-processor services, CDN delivery, or analytics), we rely exclusively on lawful transfer mechanisms recognized under GDPR and validated post-Schrems II."
              )}
            </p>
          </div>
        </LegalSection>

        {/* 2. Transfer Mechanisms */}
        <LegalSection id="2-transfer-mechanisms" title={t("dataTransfer.mechanisms.title", "2. Transfer Mechanisms")}>
          <p className="text-muted-foreground mb-6">
            {t(
              "dataTransfer.mechanisms.intro",
              "We employ the following legally recognized mechanisms for international data transfers, evaluated on a case-by-case basis:"
            )}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SCCs Card */}
            <Card className="p-6 border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{t("dataTransfer.mechanisms.sccs.title", "Standard Contractual Clauses")}</h4>
                  <Badge variant="secondary" className="text-[10px] mt-1">{t("dataTransfer.mechanisms.sccs.badge", "Primary Mechanism")}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t(
                  "dataTransfer.mechanisms.sccs.desc",
                  "We use the European Commission's updated SCCs (Decision 2021/914) for all transfers to countries without adequacy decisions."
                )}
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong>{t("dataTransfer.mechanisms.sccs.module2", "Module 2:")}</strong> {t("dataTransfer.mechanisms.sccs.module2Desc", "Controller to Processor")}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong>{t("dataTransfer.mechanisms.sccs.module3", "Module 3:")}</strong> {t("dataTransfer.mechanisms.sccs.module3Desc", "Processor to Processor")}
                  </p>
                </div>
              </div>
            </Card>

            {/* Adequacy Decisions Card */}
            <Card className="p-6 border-border/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{t("dataTransfer.mechanisms.adequacy.title", "EU Adequacy Decisions")}</h4>
                  <Badge variant="secondary" className="text-[10px] mt-1">{t("dataTransfer.mechanisms.adequacy.badge", "No Additional Measures")}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t(
                  "dataTransfer.mechanisms.adequacy.desc",
                  "Transfers to countries with a valid EU adequacy decision under Article 45 GDPR require no additional safeguards:"
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {adequacyCountries.map((country) => (
                  <Badge key={country} variant="outline" className="text-[11px] font-normal">
                    {country}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* BCRs Card */}
            <Card className="p-6 border-border/50 opacity-60 hover:opacity-80 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{t("dataTransfer.mechanisms.bcr.title", "Binding Corporate Rules")}</h4>
                  <Badge variant="outline" className="text-[10px] mt-1 text-muted-foreground">{t("dataTransfer.mechanisms.bcr.badge", "Not Applicable")}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "dataTransfer.mechanisms.bcr.desc",
                  "Binding Corporate Rules are not currently applicable to TQC as we do not operate as a multinational corporate group. Should our corporate structure change, we will evaluate and pursue BCR approval where appropriate."
                )}
              </p>
            </Card>
          </div>
        </LegalSection>

        {/* 3. Transfer Impact Assessment */}
        <LegalSection id="3-transfer-impact-assessment" title={t("dataTransfer.tia.title", "3. Transfer Impact Assessment (TIA)")}>
          <p className="text-muted-foreground mb-6">
            {t(
              "dataTransfer.tia.intro",
              "In accordance with EDPB Recommendations 01/2020, we conduct Transfer Impact Assessments for each third-country transfer. Below is a summary of our current assessments:"
            )}
          </p>
          <Card className="overflow-hidden border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="text-left px-5 py-3.5 font-semibold text-foreground">
                      {t("dataTransfer.tia.colDestination", "Destination Country")}
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-foreground">
                      {t("dataTransfer.tia.colLegalBasis", "Legal Basis")}
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-foreground">
                      {t("dataTransfer.tia.colMeasures", "Supplementary Measures")}
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-foreground">
                      {t("dataTransfer.tia.colRisk", "Risk Level")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tiaRows.map((row, idx) => (
                    <tr
                      key={row.destination}
                      className={`border-b border-border/30 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}
                    >
                      <td className="px-5 py-4 font-medium text-foreground">{row.destination}</td>
                      <td className="px-5 py-4 text-muted-foreground">{row.legalBasis}</td>
                      <td className="px-5 py-4 text-muted-foreground">{row.measures}</td>
                      <td className="px-5 py-4">{riskBadge(row.risk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-4 flex items-start gap-2 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t(
                "dataTransfer.tia.usNote",
                "For US transfers: We have assessed the impact of US surveillance laws (FISA 702, EO 12333) and determined that our supplementary technical measures (end-to-end encryption, pseudonymization, contractual obligations) effectively mitigate the risk of unauthorized government access to EU personal data."
              )}
            </p>
          </div>
        </LegalSection>

        {/* 4. Supplementary Safeguards */}
        <LegalSection id="4-supplementary-safeguards" title={t("dataTransfer.safeguards.title", "4. Supplementary Safeguards")}>
          <p className="text-muted-foreground mb-6">
            {t(
              "dataTransfer.safeguards.intro",
              "Beyond our legal transfer mechanisms, we implement the following technical and organizational measures to ensure an essentially equivalent level of protection for transferred data:"
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: <Lock className="w-5 h-5" />,
                title: t("dataTransfer.safeguards.encryption.title", "End-to-End Encryption"),
                desc: t("dataTransfer.safeguards.encryption.desc", "All data in transit is protected with TLS 1.3. Data at rest is encrypted using AES-256 with customer-managed keys where applicable."),
              },
              {
                icon: <UserCheck className="w-5 h-5" />,
                title: t("dataTransfer.safeguards.pseudonymization.title", "Data Pseudonymization"),
                desc: t("dataTransfer.safeguards.pseudonymization.desc", "Where possible, personal data is pseudonymized before transfer to third countries, reducing re-identification risk even in the event of unauthorized access."),
              },
              {
                icon: <Eye className="w-5 h-5" />,
                title: t("dataTransfer.safeguards.logging.title", "Access Logging & Monitoring"),
                desc: t("dataTransfer.safeguards.logging.desc", "All access to personal data is logged and monitored in real-time. Anomalous access patterns trigger automated alerts to our security team."),
              },
              {
                icon: <FileCheck className="w-5 h-5" />,
                title: t("dataTransfer.safeguards.contractual.title", "Contractual Obligations"),
                desc: t("dataTransfer.safeguards.contractual.desc", "All sub-processors are bound by strict data processing agreements that include obligations to resist unlawful government access requests and to notify us of any such requests."),
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: t("dataTransfer.safeguards.audits.title", "Regular Compliance Audits"),
                desc: t("dataTransfer.safeguards.audits.desc", "We conduct annual compliance audits of all sub-processors handling cross-border transfers, including on-site inspections and security assessments where warranted."),
              },
            ].map((item) => (
              <Card key={item.title} className="p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </LegalSection>

        {/* 5. Your Rights */}
        <LegalSection id="5-your-rights" title={t("dataTransfer.rights.title", "5. Your Rights")}>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t(
                "dataTransfer.rights.intro",
                "Under the GDPR, you have specific rights regarding the cross-border transfer of your personal data:"
              )}
            </p>
            <ul className="space-y-3">
              {[
                {
                  title: t("dataTransfer.rights.object.title", "Right to Object"),
                  desc: t("dataTransfer.rights.object.desc", "You may object to specific cross-border transfers of your personal data. We will review your objection and, where feasible, restrict the transfer or provide alternative processing arrangements within the EU/EEA."),
                },
                {
                  title: t("dataTransfer.rights.localization.title", "Data Localization Requests"),
                  desc: t("dataTransfer.rights.localization.desc", "You may request that your personal data be processed exclusively within the EU/EEA. While we will make best efforts to accommodate such requests, certain platform functionality may be limited if third-country sub-processors cannot be avoided."),
                },
                {
                  title: t("dataTransfer.rights.copy.title", "Right to a Copy of Safeguards"),
                  desc: t("dataTransfer.rights.copy.desc", "You may request a copy of the Standard Contractual Clauses or other safeguards under which your data is transferred. Contact our Data Protection Officer to obtain these documents."),
                },
                {
                  title: t("dataTransfer.rights.complaint.title", "Right to Lodge a Complaint"),
                  desc: t("dataTransfer.rights.complaint.desc", "If you believe your data has been transferred unlawfully, you have the right to lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) or your local supervisory authority."),
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Card className="p-5 bg-primary/5 border-primary/20 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>{t("dataTransfer.rights.contact", "Contact:")}</strong>{" "}
                {t(
                  "dataTransfer.rights.contactInfo",
                  "To exercise any of these rights, email our Data Protection Officer at info@thequantumclub.com or use the in-platform privacy request form under Settings > Privacy."
                )}
              </p>
            </Card>
          </div>
        </LegalSection>

        {/* 6. Sub-processor Transfers */}
        <LegalSection id="6-sub-processor-transfers" title={t("dataTransfer.subProcessors.title", "6. Sub-processor Transfers")}>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t(
                "dataTransfer.subProcessors.p1",
                "We maintain a comprehensive list of all sub-processors that receive personal data through cross-border transfers, including the legal basis for each transfer and the categories of data involved."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Card className="p-5 flex-1 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t("dataTransfer.subProcessors.thirdParty.title", "Third-Party Policy")}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("dataTransfer.subProcessors.thirdParty.desc", "Review our complete third-party data sharing practices.")}
                    </p>
                    <a href="/legal/third-party" className="text-sm text-primary hover:underline font-medium">
                      {t("dataTransfer.subProcessors.thirdParty.link", "View Third-Party Policy \u2192")}
                    </a>
                  </div>
                </div>
              </Card>
              <Card className="p-5 flex-1 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{t("dataTransfer.subProcessors.list.title", "Sub-processor List")}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("dataTransfer.subProcessors.list.desc", "Full list of authorized sub-processors with transfer details.")}
                    </p>
                    <a href="/compliance/subprocessors" className="text-sm text-primary hover:underline font-medium">
                      {t("dataTransfer.subProcessors.list.link", "View Sub-processors \u2192")}
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </LegalSection>

        {/* 7. Updates */}
        <LegalSection id="7-updates" title={t("dataTransfer.updates.title", "7. Updates & Notifications")}>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t(
                "dataTransfer.updates.p1",
                "Cross-border data transfer mechanisms are subject to evolving regulatory and judicial developments. We are committed to keeping you informed of any material changes:"
              )}
            </p>
            <ul className="space-y-3">
              {[
                t("dataTransfer.updates.item1", "Material changes to transfer mechanisms will be communicated via email to all registered users at least 30 days before taking effect."),
                t("dataTransfer.updates.item2", "An in-platform notification banner will alert users to updated policies upon their next login."),
                t("dataTransfer.updates.item3", "All previous versions of this policy are archived and available upon request for transparency."),
                t("dataTransfer.updates.item4", "If a transfer mechanism is invalidated by a court or regulatory authority, we will promptly suspend affected transfers and transition to an alternative lawful mechanism."),
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </LegalSection>

        {/* Footer */}
        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {t(
              "dataTransfer.footer.p1",
              "This policy is governed by the laws of the Netherlands and the GDPR. For questions about cross-border data transfers, contact our Data Protection Officer."
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">info@thequantumclub.com</a>
            {" | "}
            <a href="/legal/privacy" className="text-primary hover:underline">{t("dataTransfer.footer.privacyLink", "Privacy Policy")}</a>
            {" | "}
            <a href="/legal/dpa" className="text-primary hover:underline">{t("dataTransfer.footer.dpaLink", "Data Processing Agreement")}</a>
          </p>
        </div>
      </div>
    </LegalPageLayout>
  );
}
