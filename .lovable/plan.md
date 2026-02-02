
# Comprehensive Terms & Legal Documentation System

## Executive Summary

This plan addresses how The Quantum Club displays and manages legal documents (Terms of Service, Privacy Policy, Cookie Policy, etc.) to users. The goal is to implement industry best practices for legal document accessibility, versioning, consent tracking, and GDPR/EU compliance while maintaining the luxury, discrete brand experience.

---

## Current State Assessment

### What Exists (Strengths)

| Document | Status | Location |
|----------|--------|----------|
| Terms of Service | Complete, comprehensive | `/terms` (601 lines) |
| Privacy Policy | Complete, GDPR-compliant | `/privacy` (541 lines) |
| Cookie Consent Banner | Functional | `CookieConsentBanner.tsx` |
| Consent Receipts | Database tracking | `consent_receipts` table |
| Cookie Consent Records | Database tracking | `cookie_consent_records` table |
| Legal Page Layout | Professional TOC sidebar | `LegalPageLayout.tsx` |
| Subprocessors List | Exists in compliance section | `/compliance/subprocessors` |
| Legal Agreements (DPA/BAA) | Template-based system | `/compliance/legal-agreements` |

### What is Missing (Gaps)

| Gap | Impact | Priority |
|-----|--------|----------|
| No Cookie Policy page | Users can't read full cookie details | High |
| No Acceptable Use Policy (standalone) | AUP buried in ToS | Medium |
| No Data Processing Agreement (public DPA) | Partners can't download DPA | High |
| No Referral Terms page | Referral conditions not documented | Medium |
| No version history viewer | Users can't see document changes | Medium |
| No legal document modal/drawer reader | Users leave page to read terms | High |
| No footer with legal links | Legal docs not accessible site-wide | High |
| Links in onboarding open in new tab | Context loss, user friction | Medium |
| No accessibility compliance statement | A11y commitment not documented | Low |
| No Security Policy page | Security practices not public | Medium |

---

## Industry Best Practices Analysis

### 1. Document Accessibility

**Best Practice**: Legal documents should be accessible from:
- Global footer on every page
- Dedicated `/legal` hub page
- Inline within consent flows (modal/drawer, not new tab)
- Settings/account page

**Current Gap**: No global footer, links open in new tabs during onboarding.

### 2. Layered Approach (GDPR Recommended)

**Best Practice**: Use a "layered" approach:
- **Layer 1**: Short summary/highlights (what users see first)
- **Layer 2**: Full document (detailed reading)
- **Layer 3**: Version history (transparency)

**Current Gap**: Only full documents exist; no summary layer.

### 3. Version Control & Notification

**Best Practice**:
- Show "Last Updated" date prominently
- Maintain version history accessible to users
- Email notification for material changes (30 days notice)
- Allow users to download previous versions

**Current Gap**: Last updated shown, but no version history access.

### 4. Modal/Drawer Reading (Context Preservation)

**Best Practice**: For consent flows, use slide-over panels or modals:
- User stays on the page
- Can read full document in context
- Accept/decline buttons in footer
- Progress saved if they scroll

**Current Gap**: Links open in new browser tabs, losing onboarding context.

### 5. Required Legal Documents for SaaS Platforms

| Document | Required? | Audience |
|----------|-----------|----------|
| Terms of Service | Yes | All users |
| Privacy Policy | Yes | All users |
| Cookie Policy | Yes (ePrivacy) | All users |
| Acceptable Use Policy | Recommended | All users |
| Data Processing Agreement | Yes (B2B GDPR) | Partners |
| Security Policy | Recommended | All users |
| Referral Terms & Conditions | If program exists | Referrers |
| Accessibility Statement | Recommended (EU) | All users |
| Subprocessor List | Yes (GDPR) | All users |

---

## Solution Architecture

### New Pages to Create

1. **`/legal`** - Legal Hub (index page linking to all documents)
2. **`/legal/cookies`** - Full Cookie Policy
3. **`/legal/acceptable-use`** - Standalone AUP
4. **`/legal/dpa`** - Public DPA template for partners
5. **`/legal/security`** - Security practices overview
6. **`/legal/referral-terms`** - Referral program terms
7. **`/legal/accessibility`** - Accessibility statement

### New Components to Create

1. **`LegalDocumentDrawer`** - Slide-over drawer for reading documents in context
2. **`LegalDocumentSummary`** - Collapsible summary/highlights card
3. **`LegalVersionHistory`** - Version history accordion
4. **`GlobalFooter`** - Site-wide footer with legal links
5. **`LegalHubPage`** - Central index of all legal documents
6. **`DownloadableDocument`** - PDF download button for legal docs

### Database Changes

New table: `legal_document_versions`
```text
id              uuid
document_type   text (terms, privacy, cookies, aup, dpa, security, referral, accessibility)
version         text (v1.0, v1.1, v2.0)
effective_date  date
summary         text (changelog summary)
content_hash    text (for integrity verification)
pdf_url         text (signed URL to archived PDF)
created_at      timestamptz
```

---

## UI/UX Design

### 1. Global Footer Component

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  © 2025 The Quantum Club B.V.  |  Amsterdam, Netherlands                        │
│                                                                                  │
│  Legal                          Company                  Support                 │
│  ─────                          ───────                  ───────                 │
│  Terms of Service               About Us                 Help Center            │
│  Privacy Policy                 Careers                  Contact                │
│  Cookie Policy                  Press                    Status                 │
│  Acceptable Use                                                                 │
│  Security                                                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Legal Hub Page (`/legal`)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  LEGAL CENTER                                                                    │
│  ───────────                                                                     │
│  Your rights and our commitments, clearly documented.                           │
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ 📄 Terms of Service  │  │ 🔒 Privacy Policy    │  │ 🍪 Cookie Policy     │   │
│  │ Updated: Jan 15, 2025│  │ Updated: Jan 15, 2025│  │ Updated: Jan 15, 2025│   │
│  │ [Read] [Download PDF]│  │ [Read] [Download PDF]│  │ [Read] [Download PDF]│   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ ⚖️ Acceptable Use    │  │ 🛡️ Security Policy   │  │ 📋 DPA (Partners)    │   │
│  │ What's allowed       │  │ How we protect data  │  │ Data processing terms│   │
│  │ [Read]               │  │ [Read]               │  │ [Download PDF]       │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ 🎁 Referral Terms    │  │ ♿ Accessibility     │  │ 🔗 Subprocessors     │   │
│  │ Earn rewards         │  │ Our commitment       │  │ Our vendors          │   │
│  │ [Read]               │  │ [Read]               │  │ [View List]          │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3. In-Context Legal Document Drawer

For onboarding and consent flows, instead of opening new tabs:

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  [Onboarding Page Content]                     │  TERMS OF SERVICE              [X] │
│                                                │  ─────────────────────              │
│  ☑ I agree to the Terms of Service            │  Last Updated: January 15, 2025    │
│  ☐ I agree to the Privacy Policy              │                                     │
│                                                │  [Summary | Full Document | History]│
│                                                │  ──────────────────────────────────│
│                                                │                                     │
│                                                │  ### Key Points                     │
│                                                │  • Platform is invite-only          │
│                                                │  • No cure, no pay model            │
│                                                │  • Your data remains yours          │
│                                                │                                     │
│                                                │  ### Full Document                  │
│                                                │  (scrollable content)               │
│                                                │                                     │
│                                                │  ─────────────────────────────────  │
│                                                │  [Download PDF]   [I've Read This]  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Pages & Components

**Files to Create:**
- `src/pages/legal/LegalHub.tsx` - Central legal index
- `src/pages/legal/CookiePolicy.tsx` - Full cookie policy
- `src/pages/legal/AcceptableUsePolicy.tsx` - Standalone AUP
- `src/pages/legal/SecurityPolicy.tsx` - Security overview
- `src/pages/legal/ReferralTerms.tsx` - Referral T&C
- `src/pages/legal/AccessibilityStatement.tsx` - A11y commitment
- `src/pages/legal/DataProcessingAgreement.tsx` - Public DPA

**Files to Modify:**
- `src/App.tsx` - Add routes for new legal pages

### Phase 2: Global Footer

**Files to Create:**
- `src/components/GlobalFooter.tsx` - Site-wide footer

**Files to Modify:**
- `src/components/AppLayout.tsx` - Include footer in layout
- Public pages that need footer (Auth, Onboarding)

### Phase 3: In-Context Reading

**Files to Create:**
- `src/components/legal/LegalDocumentDrawer.tsx` - Slide-over reader
- `src/components/legal/LegalDocumentSummary.tsx` - Key points summary

**Files to Modify:**
- `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` - Use drawer instead of new tab links
- `src/components/partner-funnel/FunnelSteps.tsx` - Same change

### Phase 4: Version History & Database

**Database Migration:**
- Create `legal_document_versions` table
- Seed initial versions

**Files to Create:**
- `src/components/legal/LegalVersionHistory.tsx` - Version accordion
- `src/hooks/useLegalDocuments.ts` - Data fetching

---

## Document Content Outlines

### Cookie Policy (New)

1. **Introduction** - What this policy covers
2. **What Are Cookies** - Technical explanation
3. **Types We Use** - Necessary, Functional, Analytics, Marketing
4. **Third-Party Cookies** - We don't use advertising cookies
5. **Your Choices** - How to manage, browser settings
6. **Cookie List** - Detailed table of all cookies
7. **Updates** - How we notify changes
8. **Contact** - privacy@thequantumclub.com

### Acceptable Use Policy (New - Extracted from ToS)

1. **Purpose** - Why this policy exists
2. **Prohibited Content** - What you can't upload/post
3. **Prohibited Activities** - What you can't do
4. **Account Sharing** - Prohibited
5. **Enforcement** - Warnings, suspension, termination
6. **Reporting** - How to report violations

### Security Policy (New)

1. **Our Commitment** - Security philosophy
2. **Infrastructure** - Supabase, encryption, EU hosting
3. **Access Controls** - RLS, role-based permissions
4. **Data Protection** - Encryption at rest/transit
5. **Incident Response** - How we handle breaches
6. **Responsible Disclosure** - Bug bounty/reporting
7. **Certifications** - SOC 2 (when achieved)

### Referral Terms (New)

1. **Eligibility** - Who can refer
2. **Qualifying Referrals** - What counts
3. **Reward Amounts** - Current rates
4. **Payment Terms** - When and how paid
5. **Restrictions** - Self-referral, fraud, etc.
6. **Tax Responsibility** - User's obligation
7. **Program Changes** - TQC reserves right to modify

### Data Processing Agreement (DPA) (New)

1. **Definitions** - Controller, Processor, Sub-processor
2. **Scope** - What processing covered
3. **Data Categories** - Types of personal data
4. **Processing Instructions** - Purpose limitation
5. **Security Measures** - Technical/organizational
6. **Sub-processors** - Link to list
7. **Data Subject Rights** - Assistance obligations
8. **Breach Notification** - 72-hour requirement
9. **Audit Rights** - Partner rights
10. **Term & Termination** - Data return/deletion
11. **SCCs** - EU Standard Contractual Clauses

### Accessibility Statement (New)

1. **Commitment** - WCAG 2.1 AA target
2. **Current Status** - What's accessible
3. **Known Limitations** - What we're working on
4. **Feedback** - How to report issues
5. **Enforcement** - EU directive compliance

---

## Technical Details

### Route Structure

```text
/legal                    -> LegalHub (index)
/legal/terms              -> TermsOfService (redirect from /terms)
/legal/privacy            -> PrivacyPolicy (redirect from /privacy)
/legal/cookies            -> CookiePolicy (NEW)
/legal/acceptable-use     -> AcceptableUsePolicy (NEW)
/legal/security           -> SecurityPolicy (NEW)
/legal/referral-terms     -> ReferralTerms (NEW)
/legal/accessibility      -> AccessibilityStatement (NEW)
/legal/dpa                -> DataProcessingAgreement (NEW)
/legal/subprocessors      -> Redirect to /compliance/subprocessors
```

### LegalDocumentDrawer Component

```typescript
interface LegalDocumentDrawerProps {
  document: 'terms' | 'privacy' | 'cookies' | 'aup' | 'dpa';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;  // Optional accept button
  showAcceptButton?: boolean;
}
```

### GlobalFooter Component

```typescript
interface GlobalFooterProps {
  variant?: 'full' | 'compact' | 'minimal';
  showOnMobile?: boolean;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/legal/LegalHub.tsx` | Central legal index page |
| `src/pages/legal/CookiePolicy.tsx` | Cookie policy document |
| `src/pages/legal/AcceptableUsePolicy.tsx` | Standalone AUP |
| `src/pages/legal/SecurityPolicy.tsx` | Security practices |
| `src/pages/legal/ReferralTerms.tsx` | Referral program terms |
| `src/pages/legal/AccessibilityStatement.tsx` | A11y commitment |
| `src/pages/legal/DataProcessingAgreement.tsx` | Public DPA for partners |
| `src/components/GlobalFooter.tsx` | Site-wide footer |
| `src/components/legal/LegalDocumentDrawer.tsx` | In-context reading drawer |
| `src/components/legal/LegalDocumentSummary.tsx` | Key points summary |
| `src/components/legal/LegalVersionHistory.tsx` | Version history viewer |
| `src/components/legal/LegalHubCard.tsx` | Card for legal hub grid |
| `src/hooks/useLegalDocumentVersions.ts` | Version history data |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes for /legal/* pages |
| `src/components/AppLayout.tsx` | Include GlobalFooter |
| `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` | Use LegalDocumentDrawer instead of Link with target="_blank" |
| `src/components/partner-funnel/FunnelSteps.tsx` | Same drawer integration |
| `src/components/support/CookieConsentBanner.tsx` | Update "Learn more" link to /legal/cookies |

---

## Expected Outcome

After implementation:

1. **Users can read legal documents anywhere** - Global footer, legal hub, in-context drawers
2. **No context loss during onboarding** - Documents open in drawer, not new tab
3. **All required documents exist** - Cookie Policy, AUP, DPA, Security, Referral Terms, Accessibility
4. **Version transparency** - Users can see document history
5. **GDPR/ePrivacy compliance** - Proper cookie policy, DPA available
6. **Professional presentation** - Luxury brand maintained with clean legal center
7. **Downloadable PDFs** - Partners can download DPA and other documents
8. **Improved accessibility** - A11y statement, skip links maintained

This creates an enterprise-grade legal documentation system that matches the platform's luxury positioning while meeting all regulatory requirements.
