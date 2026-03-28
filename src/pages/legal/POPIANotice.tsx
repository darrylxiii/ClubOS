import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { MapPin, Shield, Scale, Mail, Globe, Users, ArrowRightLeft, Megaphone, CheckCircle } from "lucide-react";

export default function POPIANotice() {
  const { t } = useTranslation('common');
  const lastUpdated = "March 28, 2026";

  const sections = [
    { id: "1-introduction", title: t('popia.section1Title', '1. Introduction') },
    { id: "2-responsible-party", title: t('popia.section2Title', '2. Responsible Party') },
    { id: "3-purpose", title: t('popia.section3Title', '3. Purpose of Processing') },
    { id: "4-your-rights", title: t('popia.section4Title', '4. Your Rights under POPIA') },
    { id: "5-conditions", title: t('popia.section5Title', '5. Conditions for Lawful Processing') },
    { id: "6-cross-border", title: t('popia.section6Title', '6. Cross-Border Transfers') },
    { id: "7-direct-marketing", title: t('popia.section7Title', '7. Direct Marketing') },
    { id: "8-regulator", title: t('popia.section8Title', '8. Information Regulator Contact') },
  ];

  return (
    <Helmet>
        <title>{t('popia.pageTitle', 'POPIA Notice (South Africa)')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.pOPIANoticeDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
      title={t('popia.pageTitle', 'POPIA Notice (South Africa)')}
      lastUpdated={lastUpdated}
      sections={sections}
    >
      <div className="space-y-8">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t('popia.heroTitle', 'Notice to South African Data Subjects')}
              </h3>
              <p className="text-muted-foreground">
                {t('popia.heroDescription', 'This POPIA Notice supplements our ')}
                <a href="/privacy" className="text-primary hover:underline">
                  {t('popia.globalPrivacyPolicy', 'Global Privacy Policy')}
                </a>
                {t('popia.heroDescription2', ' and applies to individuals located in South Africa whose personal information is processed by ClubOS. The Quantum Club B.V. ("TQC", "we") adopts this notice to comply with the Protection of Personal Information Act 4 of 2013 ("POPIA").')}
              </p>
            </div>
          </div>
        </Card>

        <LegalSection id="1-introduction" title={t('popia.section1Title', '1. Introduction')}>
          <p className="text-muted-foreground">
            {t('popia.introText', 'ClubOS is committed to compliance with the Protection of Personal Information Act 4 of 2013 (POPIA), South Africa\'s data protection legislation. This notice explains how we process your personal information, the purposes for which it is used, and the rights available to you as a data subject under POPIA.')}
          </p>
        </LegalSection>

        <LegalSection id="2-responsible-party" title={t('popia.section2Title', '2. Responsible Party')}>
          <Card className="p-5 bg-muted/30 border-border/60">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>{t('popia.responsiblePartyLabel', 'Responsible Party:')}</strong>{' '}
                  {t('popia.responsiblePartyName', 'The Quantum Club B.V.')}
                </p>
                <p>
                  <strong>{t('popia.registeredAddress', 'Registered Address:')}</strong>{' '}
                  {t('popia.responsiblePartyAddress', 'Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands')}
                </p>
                <p>
                  <strong>{t('popia.informationOfficer', 'Information Officer:')}</strong>{' '}
                  <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
                    info@thequantumclub.com
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </LegalSection>

        <LegalSection id="3-purpose" title={t('popia.section3Title', '3. Purpose of Processing')}>
          <p className="text-muted-foreground mb-4">
            {t('popia.purposeIntro', 'In accordance with POPIA Section 13, we process your personal information for the following specific, explicitly defined, and lawful purposes:')}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('popia.recruitmentMatching', 'Recruitment Matching')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('popia.recruitmentMatchingDesc', 'Connecting candidates with suitable employment opportunities through our AI-powered platform and matching algorithms.')}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('popia.aiAnalysis', 'AI Analysis')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('popia.aiAnalysisDesc', 'Utilizing artificial intelligence to analyze profiles, generate match scores, provide career insights, and improve recruitment outcomes.')}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{t('popia.communications', 'Communications')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('popia.communicationsDesc', 'Sending service-related notifications, updates about job opportunities, platform announcements, and transactional communications.')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </LegalSection>

        <LegalSection id="4-your-rights" title={t('popia.section4Title', '4. Your Rights under POPIA')}>
          <p className="text-muted-foreground mb-4">
            {t('popia.rightsIntro', 'Under POPIA Sections 23-25, you have the following rights as a data subject:')}
          </p>
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
            <li>
              <strong>{t('popia.rightAccess', 'Access:')}</strong>{' '}
              {t('popia.rightAccessDesc', 'You have the right to request access to the personal information we hold about you, including confirmation of whether we process your data and a record of such information.')}
            </li>
            <li>
              <strong>{t('popia.rightCorrection', 'Correction:')}</strong>{' '}
              {t('popia.rightCorrectionDesc', 'You may request correction or deletion of personal information that is inaccurate, irrelevant, excessive, out of date, incomplete, misleading, or obtained unlawfully.')}
            </li>
            <li>
              <strong>{t('popia.rightDeletion', 'Deletion:')}</strong>{' '}
              {t('popia.rightDeletionDesc', 'You have the right to request the destruction or deletion of your personal information that we are no longer authorized to retain.')}
            </li>
            <li>
              <strong>{t('popia.rightObject', 'Object to Processing:')}</strong>{' '}
              {t('popia.rightObjectDesc', 'You may object, on reasonable grounds relating to your particular situation, to the processing of your personal information.')}
            </li>
            <li>
              <strong>{t('popia.rightObjectMarketing', 'Object to Direct Marketing:')}</strong>{' '}
              {t('popia.rightObjectMarketingDesc', 'You have the right to object to the processing of your personal information for direct marketing purposes at any time.')}
            </li>
            <li>
              <strong>{t('popia.rightComplaint', 'Complaint to Regulator:')}</strong>{' '}
              {t('popia.rightComplaintDesc', 'If you are not satisfied with how we handle your personal information, you have the right to lodge a complaint with the Information Regulator.')}
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="5-conditions" title={t('popia.section5Title', '5. Conditions for Lawful Processing')}>
          <p className="text-muted-foreground mb-4">
            {t('popia.conditionsIntro', 'We adhere to all 8 conditions for lawful processing as set out in POPIA:')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { num: '1', label: t('popia.condition1', 'Accountability'), desc: t('popia.condition1Desc', 'We take responsibility for complying with all POPIA conditions.') },
              { num: '2', label: t('popia.condition2', 'Processing Limitation'), desc: t('popia.condition2Desc', 'Personal information is processed lawfully, minimally, and with consent or justification.') },
              { num: '3', label: t('popia.condition3', 'Purpose Specification'), desc: t('popia.condition3Desc', 'Data is collected for specific, explicitly defined, and lawful purposes.') },
              { num: '4', label: t('popia.condition4', 'Further Processing Limitation'), desc: t('popia.condition4Desc', 'Further processing is compatible with the original purpose of collection.') },
              { num: '5', label: t('popia.condition5', 'Information Quality'), desc: t('popia.condition5Desc', 'We take reasonable steps to ensure personal information is complete, accurate, and up to date.') },
              { num: '6', label: t('popia.condition6', 'Openness'), desc: t('popia.condition6Desc', 'We are transparent about how personal information is processed.') },
              { num: '7', label: t('popia.condition7', 'Security Safeguards'), desc: t('popia.condition7Desc', 'We implement appropriate technical and organizational measures to protect personal information.') },
              { num: '8', label: t('popia.condition8', 'Data Subject Participation'), desc: t('popia.condition8Desc', 'Data subjects can access and request correction of their personal information.') },
            ].map((condition) => (
              <Card key={condition.num} className="p-3 bg-muted/30 border-border/60">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{condition.num}. {condition.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{condition.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </LegalSection>

        <LegalSection id="6-cross-border" title={t('popia.section6Title', '6. Cross-Border Transfers')}>
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <p className="text-muted-foreground">
              {t('popia.crossBorderText', 'As The Quantum Club B.V. is headquartered in the Netherlands, your personal information may be transferred to and processed outside of South Africa. In accordance with POPIA Section 72, we ensure that any cross-border transfer of personal information is only made to a recipient in a jurisdiction that has an adequate level of protection, or where appropriate safeguards (such as binding agreements) are in place to protect your personal information.')}
            </p>
          </div>
        </LegalSection>

        <LegalSection id="7-direct-marketing" title={t('popia.section7Title', '7. Direct Marketing')}>
          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-muted-foreground">
                <p>
                  {t('popia.directMarketingText', 'In compliance with POPIA, we will only send you direct marketing communications on an opt-in basis. You will not receive marketing messages unless you have expressly consented to receive them.')}
                </p>
                <p>
                  {t('popia.directMarketingWithdraw', 'You may withdraw your consent to direct marketing at any time by:')}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>{t('popia.unsubscribeLink', 'Clicking the "unsubscribe" link in any marketing email')}</li>
                  <li>{t('popia.settingsOption', 'Updating your notification preferences in your account settings')}</li>
                  <li>
                    {t('popia.emailOption', 'Emailing ')}{' '}
                    <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
                      info@thequantumclub.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </LegalSection>

        <LegalSection id="8-regulator" title={t('popia.section8Title', '8. Information Regulator Contact')}>
          <Card className="p-5 bg-muted/30 border-border/60">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-muted-foreground">
                <p>
                  {t('popia.regulatorIntro', 'If you believe your rights under POPIA have been infringed, you have the right to lodge a complaint with the Information Regulator of South Africa:')}
                </p>
                <p>
                  <strong>{t('popia.regulatorName', 'Information Regulator (South Africa)')}</strong>
                </p>
                <p>
                  <strong>{t('popia.websiteLabel', 'Website:')}</strong>{' '}
                  <a
                    href="https://inforeg.org.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    inforeg.org.za
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
  );
}
