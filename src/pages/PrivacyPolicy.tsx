
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { useTranslation } from 'react-i18next';
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  const { t } = useTranslation('common');
  const lastUpdated = "January 15, 2025";
  
  const sections = [
    { id: "introduction", title: t('text.privacypolicy.introduction', 'Introduction') },
    { id: "data-controller", title: t('text.privacypolicy.dataControllerInformation', 'Data Controller Information') },
    { id: "data-collection", title: t('text.privacypolicy.whatDataWeCollect', 'What Data We Collect') },
    { id: "how-collect", title: t('text.privacypolicy.howWeCollectData', 'How We Collect Data') },
    { id: "legal-basis", title: t('text.privacypolicy.legalBasisForProcessing', 'Legal Basis for Processing') },
    { id: "data-usage", title: t('text.privacypolicy.howWeUseYourData', 'How We Use Your Data') },
    { id: "data-sharing", title: t('text.privacypolicy.dataSharingDisclosures', 'Data Sharing & Disclosures') },
    { id: "international-transfers", title: t('text.privacypolicy.internationalDataTransfers', 'International Data Transfers') },
    { id: "data-retention", title: t('text.privacypolicy.dataRetention', 'Data Retention') },
    { id: "your-rights", title: t('text.privacypolicy.yourRights', 'Your Rights') },
    { id: "privacy-controls", title: t('text.privacypolicy.privacyControlsSettings', 'Privacy Controls & Settings') },
    { id: "security", title: t('text.privacypolicy.securityMeasures', 'Security Measures') },
    { id: "cookies", title: t('text.privacypolicy.cookiesTracking', 'Cookies & Tracking') },
    { id: "children", title: t('text.privacypolicy.childrensPrivacy', 'Children\'s Privacy') },
    { id: "ai-decisions", title: t('text.privacypolicy.aiAutomatedDecisionmaking', 'AI & Automated Decision-Making') },
    { id: "policy-changes", title: t('text.privacypolicy.changesToThisPolicy', 'Changes to This Policy') },
    { id: "contact", title: t('text.privacypolicy.contactDpo', 'Contact & DPO') },
  ];

  return (
    <>
      <LegalPageLayout
        title={t('text.privacypolicy.privacyPolicy', 'Privacy Policy')}
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">{t('privacyPolicy.title')}</h3>
                <p className="text-muted-foreground">
                  The Quantum Club is committed to protecting your privacy and handling your data transparently. 
                  This policy explains how we collect, use, and protect your personal information in compliance with GDPR, 
                  UK GDPR, and other applicable privacy regulations.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="introduction" title={t('text.privacypolicy.introduction', 'Introduction')}>
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

          <LegalSection id="data-controller" title={t('text.privacypolicy.dataControllerInformation', 'Data Controller Information')}>
            <div className="space-y-3">
              <p><strong>{t('text.privacypolicy.company', 'Company:')}</strong>{t('text.privacypolicy.theQuantumClubBv', 'The Quantum Club B.V.')}</p>
              <p><strong>{t('text.privacypolicy.registration', 'Registration:')}</strong>{t('text.privacypolicy.netherlandsChamberOfCommerce', 'Netherlands Chamber of Commerce')}</p>
              <p><strong>{t('text.privacypolicy.location', 'Location:')}</strong>{t('text.privacypolicy.amsterdamNetherlands', 'Amsterdam, Netherlands')}</p>
              <p><strong>{t('text.privacypolicy.email', 'Email:')}</strong>privacy@thequantumclub.com</p>
              <p><strong>{t('text.privacypolicy.dataProtectionOfficer', 'Data Protection Officer:')}</strong>Available upon request via privacy@thequantumclub.com</p>
            </div>
            <p className="mt-4">
              For EU users, The Quantum Club B.V. acts as the data controller. We process data in accordance with the 
              General Data Protection Regulation (GDPR) and Dutch data protection laws.
            </p>
          </LegalSection>

          <LegalSection id="data-collection" title={t('text.privacypolicy.whatDataWeCollect', 'What Data We Collect')}>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.fullNameEmailAddressPhoneNumber', 'Full name, email address, phone number')}</li>
                  <li>{t('text.privacypolicy.linkedinProfileUrlAndProfessionalProfile', 'LinkedIn profile URL and professional profile data')}</li>
                  <li>{t('text.privacypolicy.profilePhotoavatar', 'Profile photo/avatar')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.cvresumeDocuments', 'CV/Resume documents')}</li>
                  <li>{t('text.privacypolicy.workExperienceSkillsEducationCertifications', 'Work experience, skills, education, certifications')}</li>
                  <li>{t('text.privacypolicy.currentJobTitleAndEmploymentHistory', 'Current job title and employment history')}</li>
                  <li>{t('text.privacypolicy.professionalAchievementsAndPortfolioWork', 'Professional achievements and portfolio work')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.salaryExpectationsCurrentAndTargetRanges', 'Salary expectations (current and target ranges)')}</li>
                  <li>{t('text.privacypolicy.noticePeriodAndContractEndDates', 'Notice period and contract end dates')}</li>
                  <li>{t('text.privacypolicy.workPreferencesRemoteLocationEmploymentType', 'Work preferences (remote, location, employment type)')}</li>
                  <li>{t('text.privacypolicy.careerGoalsAndAspirations', 'Career goals and aspirations')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('text.privacypolicy.companyDataForPartners', 'Company Data (For Partners)')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.companyNameWebsiteIndustry', 'Company name, website, industry')}</li>
                  <li>{t('text.privacypolicy.teamStructureAndOrganizationalCharts', 'Team structure and organizational charts')}</li>
                  <li>{t('text.privacypolicy.hiringNeedsAndJobDescriptions', 'Hiring needs and job descriptions')}</li>
                  <li>{t('text.privacypolicy.interviewNotesAndCandidateEvaluations', 'Interview notes and candidate evaluations')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.messagesExchangedWithStrategistsAndPartners', 'Messages exchanged with strategists and partners')}</li>
                  <li>{t('text.privacypolicy.emailCommunicationsViaIntegrations', 'Email communications (via integrations)')}</li>
                  <li>{t('text.privacypolicy.meetingTranscriptsAndInterviewRecordingsWith', 'Meeting transcripts and interview recordings (with explicit consent)')}</li>
                  <li>{t('text.privacypolicy.aiConversationHistoryClubAiInteractions', 'AI conversation history (Club AI interactions)')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.applicationHistoryAndJobViews', 'Application history and job views')}</li>
                  <li>{t('text.privacypolicy.searchQueriesAndFilterPreferences', 'Search queries and filter preferences')}</li>
                  <li>{t('text.privacypolicy.platformEngagementMetricsFeatureUsageSession', 'Platform engagement metrics (feature usage, session duration)')}</li>
                  <li>{t('text.privacypolicy.referralActivityAndRewardsEarned', 'Referral activity and rewards earned')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.ipAddressDeviceInformationBrowserType', 'IP address, device information, browser type')}</li>
                  <li>{t('text.privacypolicy.cookiesAndSessionIdentifiers', 'Cookies and session identifiers')}</li>
                  <li>{t('text.privacypolicy.loginTimestampsAndAuthenticationLogs', 'Login timestamps and authentication logs')}</li>
                  <li>{t('text.privacypolicy.errorLogsAndDiagnosticData', 'Error logs and diagnostic data')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>{t('text.privacypolicy.referralRewardAmountsAndPaymentDetails', 'Referral reward amounts and payment details')}</li>
                  <li>{t('text.privacypolicy.notePaymentProcessingHandledByThirdparty', 'Note: Payment processing handled by third-party processors (we do not store full credit card data)')}</li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="how-collect" title={t('text.privacypolicy.howWeCollectData', 'How We Collect Data')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  You provide data directly through onboarding, profile editing, job applications, 
                  and communication on our platform.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  We automatically collect technical data through cookies, analytics tools, and session tracking 
                  to improve platform performance and user experience.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  With your permission, we collect data from LinkedIn OAuth, Google Calendar, Microsoft Calendar, 
                  and Greenhouse ATS integrations.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  When you interact with Club AI features (interview prep, career guidance), we process your 
                  prompts and conversations to provide personalized assistance.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="legal-basis" title={t('text.privacypolicy.legalBasisForProcessingGdprArticle', 'Legal Basis for Processing (GDPR Article 6)')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('text.privacypolicy.consentArticle61a', 'Consent (Article 6(1)(a))')}</h4>
                <p className="text-muted-foreground">
                  We rely on your explicit consent for: marketing communications, stealth mode settings, 
                  data sharing with specific clients, Club Sync auto-applications, and meeting recordings.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('text.privacypolicy.contractPerformanceArticle61b', 'Contract Performance (Article 6(1)(b))')}</h4>
                <p className="text-muted-foreground">
                  Processing necessary to provide our core services: job matching, applications, 
                  candidate-partner connections, and platform functionality.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('text.privacypolicy.legitimateInterestArticle61f', 'Legitimate Interest (Article 6(1)(f))')}</h4>
                <p className="text-muted-foreground">
                  We process data based on legitimate interests for: platform improvement, fraud prevention, 
                  security measures, and analytics (ensuring your rights are protected).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('text.privacypolicy.legalObligationArticle61c', 'Legal Obligation (Article 6(1)(c))')}</h4>
                <p className="text-muted-foreground">
                  We process data to comply with: tax regulations, law enforcement requests, 
                  and other legal requirements.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="data-usage" title={t('text.privacypolicy.howWeUseYourData', 'How We Use Your Data')}>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li><strong>{t('text.privacypolicy.coreServices', 'Core Services:')}</strong> Job matching, application processing, candidate shortlisting, organizational chart placements, profile management</li>
              <li><strong>{t('text.privacypolicy.aiFeatures', 'AI Features:')}</strong> Club AI career assistance, interview preparation, meeting intelligence, resume parsing, match score generation</li>
              <li><strong>{t('text.privacypolicy.communication', 'Communication:')}</strong> Facilitating conversations between candidates, strategists, and partners; system notifications; transactional emails</li>
              <li><strong>{t('text.privacypolicy.analytics', 'Analytics:')}</strong> Platform usage analysis, feature adoption tracking, A/B testing (anonymized where possible)</li>
              <li><strong>{t('text.privacypolicy.marketing', 'Marketing:')}</strong> {t('text.privacypolicy.emailCampaignsOptinOnlyReferralProgram', 'Email campaigns (opt-in only), referral program communications, platform updates')}</li>
              <li><strong>{t('text.privacypolicy.security', 'Security:')}</strong>Fraud detection, account protection, 2FA/MFA verification, audit logging</li>
              <li><strong>{t('text.privacypolicy.improvement', 'Improvement:')}</strong>{t('text.privacypolicy.debuggingPerformanceOptimizationUserExperienceEnha', 'Debugging, performance optimization, user experience enhancements')}</li>
            </ul>
          </LegalSection>

          <LegalSection id="data-sharing" title={t('text.privacypolicy.dataSharingDisclosures', 'Data Sharing & Disclosures')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  Your data is accessible to: Platform administrators (for support and moderation), assigned strategists 
                  (for personalized service), and finance team (for referral rewards, minimal PII access).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  We share only: Fields you mark as shareable in Privacy Settings, data you consent to share via 
                  Club Sync or dossier approvals. Current employer protection applies—blocked companies never see your data.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                  <li><strong>{t('text.privacypolicy.hostingDatabase', 'Hosting & Database:')}</strong>{t('text.privacypolicy.supabaseEuRegionGdprcompliant', 'Supabase (EU region, GDPR-compliant)')}</li>
                  <li><strong>{t('text.privacypolicy.aiProcessing', 'AI Processing:')}</strong>{t('text.privacypolicy.googleGeminiAndOpenaiGptModels', 'Google Gemini and OpenAI GPT models - data processing agreements in place')}</li>
                  <li><strong>{t('text.privacypolicy.calendarSync', 'Calendar Sync:')}</strong>{t('text.privacypolicy.googleCloudMicrosoftAzure', 'Google Cloud, Microsoft Azure')}</li>
                  <li><strong>{t('text.privacypolicy.atsIntegration', 'ATS Integration:')}</strong>{t('text.privacypolicy.greenhouseForPartnerAccounts', 'Greenhouse (for partner accounts)')}</li>
                  <li><strong>{t('text.privacypolicy.emailServices', 'Email Services:')}</strong>{t('text.privacypolicy.transactionalEmailProvidersAnonymizedWherePossible', 'Transactional email providers (anonymized where possible)')}</li>
                  <li><strong>{t('text.privacypolicy.analytics', 'Analytics:')}</strong>{t('text.privacypolicy.usageAnalyticsProvidersAnonymized', 'Usage analytics providers (anonymized)')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  We may disclose data in response to: Court orders, legal obligations, GDPR data portability requests, 
                  law enforcement inquiries (only when legally required).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  In case of merger, acquisition, or sale: We will notify you via email, your data will be transferred 
                  under the same privacy protections, and you retain all GDPR rights.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="international-transfers" title={t('text.privacypolicy.internationalDataTransfers', 'International Data Transfers')}>
            <p>
              <strong>{t('text.privacypolicy.primaryProcessingLocation', 'Primary Processing Location:')}</strong> {t('text.privacypolicy.europeanUnionNetherlands', 'European Union (Netherlands)')}
            </p>
            <p className="mt-4 text-muted-foreground">{t('privacyPolicy.desc')}</p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
              <li>{t('text.privacypolicy.standardContractualClausesSccsApprovedBy', 'Standard Contractual Clauses (SCCs) approved by the EU Commission')}</li>
              <li>{t('text.privacypolicy.gdprcompliantDataProcessingAgreementsWithAll', 'GDPR-compliant Data Processing Agreements with all processors')}</li>
              <li>{t('text.privacypolicy.adequacyDecisionsForCountriesWithEquivalent', 'Adequacy decisions for countries with equivalent data protection')}</li>
              <li>{t('text.privacypolicy.ukGdprComplianceForUkUsers', 'UK GDPR compliance for UK users (post-Brexit)')}</li>
            </ul>
          </LegalSection>

          <LegalSection id="data-retention" title={t('text.privacypolicy.dataRetention', 'Data Retention')}>
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{t('privacyPolicy.desc2')}</p>
                <p className="text-muted-foreground">{t('text.privacypolicy.durationOfMembership18MonthsPostlast', 'Duration of membership + 18 months post-last activity (configurable)')}</p>
              </div>
              <div>
                <p className="font-semibold">{t('privacyPolicy.desc3')}</p>
                <p className="text-muted-foreground">{t('text.privacypolicy.durationOfPartnership7YearsFinancial', 'Duration of partnership + 7 years (financial and legal requirements)')}</p>
              </div>
              <div>
                <p className="font-semibold">{t('privacyPolicy.desc4')}</p>
                <p className="text-muted-foreground">2 years post-application (recruitment regulations)</p>
              </div>
              <div>
                <p className="font-semibold">{t('privacyPolicy.desc5')}</p>
                <p className="text-muted-foreground">30-day rolling retention for disaster recovery</p>
              </div>
              <div>
                <p className="font-semibold">{t('privacyPolicy.desc6')}</p>
                <p className="text-muted-foreground">{t('privacyPolicy.desc7')}</p>
              </div>
              <div>
                <p className="font-semibold">{t('privacyPolicy.desc8')}</p>
                <p className="text-muted-foreground">{t('text.privacypolicy.youCanRequestEarlierDeletionVia', 'You can request earlier deletion via Settings → Delete Account or privacy@thequantumclub.com')}</p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="your-rights" title={t('text.privacypolicy.yourRightsGdprccpaukGdpr', 'Your Rights (GDPR/CCPA/UK GDPR)')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('text.privacypolicy.downloadAllYourDataViaSettings', 'Download all your data via Settings → Privacy → Export Data (JSON format).')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('privacyPolicy.desc9')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('text.privacypolicy.rightToErasureRightToBe', 'Right to Erasure (\')Right to be Forgotten\')')}</h4>
                <p className="text-muted-foreground">{t('text.privacypolicy.deleteYourAccountViaSettingsPrivacy', 'Delete your account via Settings → Privacy → Delete Account. Note: Some data may be retained for legal compliance.')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('text.privacypolicy.limitDataUsageThroughGranularPrivacy', 'Limit data usage through granular privacy settings (Settings → Privacy).')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('privacyPolicy.desc10')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('privacyPolicy.desc11')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('privacyPolicy.desc12')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  Contact the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) or your local supervisory authority if you believe we've violated your privacy rights.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="privacy-controls" title={t('text.privacypolicy.privacyControlsSettings', 'Privacy Controls & Settings')}>
            <p className="mb-4">{t('text.privacypolicy.accessComprehensivePrivacyControlsViaSettings', 'Access comprehensive privacy controls via Settings → Privacy:')}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>{t('text.privacypolicy.profileSharingToggles', 'Profile Sharing Toggles:')}</strong>{t('text.privacypolicy.granularFieldlevelControlNameEmailPhone', 'Granular field-level control (name, email, phone, salary, etc.)')}</li>
              <li><strong>{t('text.privacypolicy.stealthMode', 'Stealth Mode:')}</strong>{t('text.privacypolicy.hideFromCurrentEmployerSetVisibility', 'Hide from current employer, set visibility levels')}</li>
              <li><strong>{t('text.privacypolicy.currentEmployerProtection', 'Current Employer Protection:')}</strong>{t('text.privacypolicy.blockSpecificCompanyDomainsFromViewing', 'Block specific company domains from viewing your profile')}</li>
              <li><strong>{t('text.privacypolicy.clubSyncConsent', 'Club Sync Consent:')}</strong>{t('text.privacypolicy.approveAutoapplicationsWithFullTransparency', 'Approve auto-applications with full transparency')}</li>
              <li><strong>{t('text.privacypolicy.dossierSharing', 'Dossier Sharing:')}</strong>{t('text.privacypolicy.explicitConsentBeforeProfilePackagesAre', 'Explicit consent before profile packages are shared')}</li>
              <li><strong>{t('text.privacypolicy.communicationPreferences', 'Communication Preferences:')}</strong>{t('text.privacypolicy.controlEmailFrequencyAndNotificationTypes', 'Control email frequency and notification types')}</li>
            </ul>
          </LegalSection>

          <LegalSection id="security" title={t('text.privacypolicy.securityMeasures', 'Security Measures')}>
            <p className="mb-4">{t('privacyPolicy.desc13')}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>{t('text.privacypolicy.encryption', 'Encryption:')}</strong>AES-256 at rest, TLS 1.3 in transit</li>
              <li><strong>{t('text.privacypolicy.rowlevelSecurityRls', 'Row-Level Security (RLS):')}</strong>{t('text.privacypolicy.databasePoliciesEnforceDataAccessControls', 'Database policies enforce data access controls')}</li>
              <li><strong>2FA/MFA:</strong>{t('text.privacypolicy.multifactorAuthenticationSupport', 'Multi-factor authentication support')}</li>
              <li><strong>{t('text.privacypolicy.signedUrls', 'Signed URLs:')}</strong>{t('text.privacypolicy.timelimitedSecureFileAccessForDocuments', 'Time-limited, secure file access for documents and resumes')}</li>
              <li><strong>{t('text.privacypolicy.auditLogs', 'Audit Logs:')}</strong>{t('text.privacypolicy.allSensitiveDataAccessIsLogged', 'All sensitive data access is logged and monitored')}</li>
              <li><strong>{t('text.privacypolicy.watermarkedDossiers', 'Watermarked Dossiers:')}</strong>{t('text.privacypolicy.ipTrackingForLeakPrevention', 'IP tracking for leak prevention')}</li>
              <li><strong>{t('text.privacypolicy.regularAudits', 'Regular Audits:')}</strong>{t('text.privacypolicy.penetrationTestingAndSecurityReviews', 'Penetration testing and security reviews')}</li>
              <li><strong>{t('text.privacypolicy.accessControls', 'Access Controls:')}</strong>{t('text.privacypolicy.rolebasedPermissionsCandidatesStrategistsPartnersA', 'Role-based permissions (candidates, strategists, partners, admins)')}</li>
            </ul>
          </LegalSection>

          <LegalSection id="cookies" title={t('text.privacypolicy.cookiesTracking', 'Cookies & Tracking')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('privacyPolicy.desc14')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('privacyPolicy.desc15')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">{t('text.privacypolicy.anonymizedUsageDataToImprovePlatform', 'Anonymized usage data to improve platform performance. You can opt-out via Settings → Privacy.')}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  <strong>{t('text.privacypolicy.weDoNotUseThirdpartyAdvertising', 'We do not use third-party advertising cookies.')}</strong>
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="children" title={t('text.privacypolicy.childrensPrivacy', 'Children\'s Privacy')}>
            <p>
              {t('text.privacypolicy.theQuantumClubIsAn', 'The Quantum Club is an')} <strong>18+ platform</strong> designed for professional career management. 
              We do not knowingly collect data from anyone under 18 years of age.
            </p>
            <p className="mt-4 text-muted-foreground">
              If we discover that we have inadvertently collected data from a minor, we will delete it immediately. 
              If you believe a minor has provided us with personal information, please contact privacy@thequantumclub.com.
            </p>
          </LegalSection>

          <LegalSection id="ai-decisions" title={t('text.privacypolicy.aiAutomatedDecisionmaking', 'AI & Automated Decision-Making')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  Powered by Lovable AI (Google Gemini, OpenAI GPT models). Used for: career guidance, 
                  interview preparation, resume analysis, meeting intelligence. AI outputs are assistive, not definitive.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  Combines AI scoring with rule-based matching. <strong>{t('text.privacypolicy.notFullyAutomated', 'Not fully automated')}</strong>—all matches 
                  are reviewed by human strategists before shortlisting.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  You can request manual review of AI-generated match scores or recommendations. 
                  Contact your strategist or privacy@thequantumclub.com.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('privacyPolicy.title')}</h4>
                <p className="text-muted-foreground">
                  We provide "Why matched" explanations for job recommendations, showing factors like 
                  skills overlap, compensation proximity, and industry fit.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="policy-changes" title={t('text.privacypolicy.changesToThisPolicy', 'Changes to This Policy')}>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, 
              legal requirements, or platform features.
            </p>
            <p className="mt-4 text-muted-foreground">
              <strong>{t('text.privacypolicy.materialChangesWillBeNotifiedVia', 'Material changes will be notified via email.')}</strong> Continued use of the platform 
              after notification constitutes acceptance of the updated policy. You can review historical 
              versions by contacting privacy@thequantumclub.com.
            </p>
            <p className="mt-4 text-muted-foreground">{t('text.privacypolicy.theLastUpdatedDateAtThe', 'The "Last Updated" date at the top of this page reflects the most recent revision.')}</p>
          </LegalSection>

          <LegalSection id="contact" title={t('text.privacypolicy.contactDataProtectionOfficer', 'Contact & Data Protection Officer')}>
            <div className="space-y-3">
              <p><strong>{t('text.privacypolicy.forPrivacyInquiriesDataSubjectRequests', 'For privacy inquiries, data subject requests, or complaints:')}</strong></p>
              <p><strong>{t('text.privacypolicy.email', 'Email:')}</strong>privacy@thequantumclub.com</p>
              <p><strong>{t('text.privacypolicy.dataProtectionOfficer', 'Data Protection Officer:')}</strong>{t('text.privacypolicy.availableUponRequest', 'Available upon request')}</p>
              <p><strong>{t('text.privacypolicy.address', 'Address:')}</strong>{t('text.privacypolicy.theQuantumClubBvAmsterdamNetherlands', 'The Quantum Club B.V., Amsterdam, Netherlands')}</p>
            </div>
            <p className="mt-6 text-muted-foreground">
              <strong>{t('text.privacypolicy.responseTime', 'Response Time:')}</strong> We aim to respond to all privacy inquiries within 30 days 
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
    </>
  );
};

export default PrivacyPolicy;
