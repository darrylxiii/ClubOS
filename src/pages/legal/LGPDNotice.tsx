import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { MapPin, Shield, Scale, Mail, Globe, FileCheck, Users, Lock, ArrowRightLeft, Clock, Settings } from "lucide-react";

export default function LGPDNotice() {
  const { t } = useTranslation('common');
  const lastUpdated = "March 28, 2026";

  const sections = [
    { id: "1-introduction", title: t('lgpd.section1Title', '1. Introduction') },
    { id: "2-data-controller", title: t('lgpd.section2Title', '2. Data Controller') },
    { id: "3-legal-bases", title: t('lgpd.section3Title', '3. Legal Bases for Processing') },
    { id: "4-your-rights", title: t('lgpd.section4Title', '4. Your Rights under LGPD') },
    { id: "5-international-transfers", title: t('lgpd.section5Title', '5. International Transfers') },
    { id: "6-data-retention", title: t('lgpd.section6Title', '6. Data Retention') },
    { id: "7-exercise-rights", title: t('lgpd.section7Title', '7. How to Exercise Your Rights') },
    { id: "8-anpd-contact", title: t('lgpd.section8Title', '8. ANPD Contact') },
  ];

  return (
    <>
      <Helmet>
        <title>{t('lgpd.pageTitle', 'LGPD Notice (Brazil)')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.lGPDNoticeDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
        title={t('lgpd.pageTitle', 'LGPD Notice (Brazil)')}
        lastUpdated={lastUpdated}
        sections={sections}
      >
      <div className="space-y-8">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t('lgpd.heroTitle', 'Notice to Brazilian Data Subjects')}
              </h3>
              <p className="text-muted-foreground">
                {t('lgpd.heroDescription', 'This LGPD Notice supplements our ')}
                <a href="/privacy" className="text-primary hover:underline">
                  {t('lgpd.globalPrivacyPolicy', 'Global Privacy Policy')}
                </a>
                {t('lgpd.heroDescription2', ' and applies to individuals located in Brazil whose personal data is processed by ClubOS. The Quantum Club B.V. ("TQC", "we") adopts this notice to comply with the Lei Geral de Prote\u00e7\u00e3o de Dados (Law 13.709/2018, "LGPD").')}
              </p>
            </div>
          </div>
        </Card>

        <LegalSection id="1-introduction" title={t('lgpd.section1Title', '1. Introduction')}>
          <p className="text-muted-foreground">
            {t('lgpd.introText', 'ClubOS is committed to compliance with the Lei Geral de Prote\u00e7\u00e3o de Dados (LGPD), Brazil\'s comprehensive data protection law (Law 13.709/2018). This notice explains how we collect, use, store, and share your personal data, and describes the rights you have under the LGPD regarding your personal data processed through our platform.')}
          </p>
        </LegalSection>

        <LegalSection id="2-data-controller" title={t('lgpd.section2Title', '2. Data Controller')}>
          <Card className="p-5 bg-muted/30 border-border/60">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>{t('lgpd.controllerLabel', 'Data Controller:')}</strong>{' '}
                  {t('lgpd.controllerName', 'The Quantum Club B.V.')}
                </p>
                <p>
                  <strong>{t('lgpd.registeredAddress', 'Registered Address:')}</strong>{' '}
                  {t('lgpd.controllerAddress', 'Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands')}
                </p>
                <p>
                  <strong>{t('lgpd.dpoLabel', 'Data Protection Officer (DPO):')}</strong>{' '}
                  <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
                    info@thequantumclub.com
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </LegalSection>

        <LegalSection id="3-legal-bases" title={t('lgpd.section3Title', '3. Legal Bases for Processing')}>
          <p className="text-muted-foreground mb-4">
            {t('lgpd.legalBasesIntro', 'In accordance with LGPD Article 7, we process your personal data based on the following legal bases:')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('lgpd.consent', 'Consent')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('lgpd.consentDesc', 'When you explicitly agree to the processing of your personal data for specific purposes, such as AI-powered career matching and analytics.')}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('lgpd.contractPerformance', 'Contract Performance')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('lgpd.contractDesc', 'Processing necessary to fulfill our contractual obligations to you, including providing recruitment services, managing your account, and facilitating job matching.')}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('lgpd.legitimateInterests', 'Legitimate Interests')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('lgpd.legitimateDesc', 'Processing necessary for our legitimate interests, such as fraud prevention, platform security, service improvement, and analytics, provided these do not override your fundamental rights.')}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('lgpd.legalObligation', 'Legal Obligation')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('lgpd.legalObligationDesc', 'Processing required to comply with legal or regulatory obligations, including tax, labor, and anti-fraud requirements.')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </LegalSection>

        <LegalSection id="4-your-rights" title={t('lgpd.section4Title', '4. Your Rights under LGPD')}>
          <p className="text-muted-foreground mb-4">
            {t('lgpd.rightsIntro', 'Under LGPD Article 18, you have the following rights regarding your personal data:')}
          </p>
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
            <li>
              <strong>{t('lgpd.rightConfirmation', 'Confirmation of Processing:')}</strong>{' '}
              {t('lgpd.rightConfirmationDesc', 'You have the right to confirm whether your personal data is being processed.')}
            </li>
            <li>
              <strong>{t('lgpd.rightAccess', 'Access:')}</strong>{' '}
              {t('lgpd.rightAccessDesc', 'You may request access to the personal data we hold about you.')}
            </li>
            <li>
              <strong>{t('lgpd.rightCorrection', 'Correction:')}</strong>{' '}
              {t('lgpd.rightCorrectionDesc', 'You have the right to request correction of incomplete, inaccurate, or outdated personal data.')}
            </li>
            <li>
              <strong>{t('lgpd.rightAnonymization', 'Anonymization, Blocking, or Deletion:')}</strong>{' '}
              {t('lgpd.rightAnonymizationDesc', 'You may request anonymization, blocking, or deletion of unnecessary or excessive data, or data processed in non-compliance with the LGPD.')}
            </li>
            <li>
              <strong>{t('lgpd.rightPortability', 'Data Portability:')}</strong>{' '}
              {t('lgpd.rightPortabilityDesc', 'You have the right to request portability of your personal data to another service provider, in accordance with ANPD regulations.')}
            </li>
            <li>
              <strong>{t('lgpd.rightSharing', 'Information about Sharing:')}</strong>{' '}
              {t('lgpd.rightSharingDesc', 'You have the right to know which public and private entities your data has been shared with.')}
            </li>
            <li>
              <strong>{t('lgpd.rightRevocation', 'Revocation of Consent:')}</strong>{' '}
              {t('lgpd.rightRevocationDesc', 'You may revoke your consent at any time, free of charge, without affecting the lawfulness of processing carried out prior to revocation.')}
            </li>
            <li>
              <strong>{t('lgpd.rightOpposition', 'Opposition to Processing:')}</strong>{' '}
              {t('lgpd.rightOppositionDesc', 'You may oppose any processing carried out in violation of the LGPD.')}
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="5-international-transfers" title={t('lgpd.section5Title', '5. International Transfers')}>
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <p className="text-muted-foreground">
              {t('lgpd.transfersText', 'As The Quantum Club B.V. is headquartered in the Netherlands, your personal data may be transferred to and processed outside of Brazil. In accordance with LGPD Article 33, we ensure that all international transfers of personal data are conducted with adequate safeguards, including Standard Contractual Clauses (SCCs), and that the receiving jurisdiction provides an adequate level of data protection or that appropriate guarantees are in place.')}
            </p>
          </div>
        </LegalSection>

        <LegalSection id="6-data-retention" title={t('lgpd.section6Title', '6. Data Retention')}>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <p className="text-muted-foreground">
              {t('lgpd.retentionText', 'Your personal data is processed and retained only for as long as necessary to fulfill the purposes for which it was collected, comply with legal obligations, resolve disputes, and enforce our agreements. When your data is no longer needed, it will be securely deleted or anonymized in accordance with the LGPD.')}
            </p>
          </div>
        </LegalSection>

        <LegalSection id="7-exercise-rights" title={t('lgpd.section7Title', '7. How to Exercise Your Rights')}>
          <p className="text-muted-foreground mb-3">
            {t('lgpd.exerciseIntro', 'To exercise any of your rights under the LGPD, you may:')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span>
                  <strong>{t('lgpd.emailLabel', 'Email:')}</strong>{' '}
                  <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
                    info@thequantumclub.com
                  </a>
                  {t('lgpd.emailSubject', ' (Subject: "LGPD Request")')}
                </span>
              </div>
            </li>
            <li>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary flex-shrink-0" />
                <span>
                  <strong>{t('lgpd.inAppLabel', 'In-App:')}</strong>{' '}
                  {t('lgpd.inAppDesc', 'Use the GDPR/privacy controls available in your ')}
                  <a href="/settings" className="text-primary hover:underline">
                    {t('lgpd.settingsLink', 'Settings')}
                  </a>
                  {t('lgpd.inAppDesc2', ' page to manage your data preferences, download your data, or request deletion.')}
                </span>
              </div>
            </li>
          </ul>
          <p className="text-muted-foreground mt-3">
            {t('lgpd.responseTime', 'We will respond to your request within 15 business days, as required by the LGPD.')}
          </p>
        </LegalSection>

        <LegalSection id="8-anpd-contact" title={t('lgpd.section8Title', '8. ANPD Contact')}>
          <Card className="p-5 bg-muted/30 border-border/60">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-muted-foreground">
                <p>
                  {t('lgpd.anpdIntro', 'If you believe your data protection rights have not been adequately addressed, you have the right to file a complaint with the Brazilian National Data Protection Authority:')}
                </p>
                <p>
                  <strong>{t('lgpd.anpdName', 'Autoridade Nacional de Prote\u00e7\u00e3o de Dados (ANPD)')}</strong>
                </p>
                <p>
                  <strong>{t('lgpd.websiteLabel', 'Website:')}</strong>{' '}
                  <a
                    href="https://www.gov.br/anpd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.gov.br/anpd
                  </a>
                </p>
              </div>
            </div>
          </Card>
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
