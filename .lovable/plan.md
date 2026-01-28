
# Phase 3: AI Cover Letter Generator Implementation

## Overview
This phase adds a QUIN-powered cover letter generation system that allows candidates to create personalized, professional cover letters based on job descriptions and their profile data.

**Score Impact: +5 points (93/100 → 98/100)**

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Cover Letter Generator Flow                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌───────────────┐    ┌───────────────────┐    │
│  │  Job Select  │───►│ Tone Selector │───►│ Generate Button   │    │
│  │  (dropdown)  │    │ (3 options)   │    │ (QUIN powered)    │    │
│  └──────────────┘    └───────────────┘    └───────────────────┘    │
│                                                                      │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                    Edge Function                                ││
│  │  generate-cover-letter                                          ││
│  │  - Fetches job description + requirements                       ││
│  │  - Fetches candidate profile + experience + skills              ││
│  │  - Generates tailored cover letter via Lovable AI               ││
│  └────────────────────────────────────────────────────────────────┘│
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                    Cover Letter Preview                         ││
│  │  - Rich text editor for manual adjustments                      ││
│  │  - Export to PDF / Copy to clipboard                            ││
│  │  - Save to candidate_documents                                  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. Edge Function: `supabase/functions/generate-cover-letter/index.ts`
**Purpose:** AI-powered cover letter generation using Lovable AI

**Logic:**
- Accept `jobId`, `candidateId`, `tone` (professional/conversational/executive)
- Fetch job details: title, description, requirements, company info
- Fetch candidate data: profile, experience, skills
- Construct prompt for QUIN with proper context
- Return generated cover letter text
- Handle rate limits (429) and payment errors (402)

### 2. Hook: `src/hooks/useCoverLetterGenerator.ts`
**Purpose:** React hook for cover letter generation and management

**Features:**
- `generateCoverLetter(jobId, tone)` - Calls edge function
- `saveCoverLetter(content, jobId)` - Saves to `candidate_documents`
- `getCoverLetters()` - Fetches saved cover letters
- Loading and error states

### 3. Page: `src/pages/CoverLetterGenerator.tsx`
**Purpose:** Standalone cover letter builder page

**UI Components:**
- Job selector dropdown (from applications or all jobs)
- Tone selector: Professional / Conversational / Executive
- "Generate with QUIN" button
- Live preview with edit capability
- Export options: PDF download, copy to clipboard
- Save to documents button

### 4. Component: `src/components/applications/CoverLetterBuilder.tsx`
**Purpose:** Reusable cover letter builder component

**Props:**
- `jobId` - Pre-selected job
- `jobTitle` - Display name
- `companyName` - For context
- `onComplete` - Callback when saved

### 5. Component: `src/components/applications/CoverLetterPreview.tsx`
**Purpose:** Preview and edit generated cover letter

**Features:**
- Editable textarea for manual refinements
- Character/word count
- Regenerate button
- Export actions

---

## Files to Modify

### 1. `src/pages/JobDetail.tsx`
**Changes (lines 424-430):**
- Add "Generate Cover Letter" quick action button in Overview tab
- Opens CoverLetterBuilder dialog pre-filled with job context

### 2. `src/config/navigation.config.ts`
**Changes (line 168-178):**
- Add navigation item under Career section:
```typescript
{ name: "Cover Letter Builder", icon: FileText, path: "/cover-letter-builder" }
```

### 3. `src/routes/candidate.routes.tsx`
**Changes:**
- Add route: `/cover-letter-builder` → `CoverLetterGenerator`

### 4. `src/components/candidate/CandidateQuickActions.tsx`
**Changes (lines 33-40):**
- Add "Cover Letter" quick action pointing to generator

### 5. `.lovable/plan.md`
**Changes:**
- Update Phase 3 status to ✅ COMPLETE
- Update current score to 98/100

---

## Database Integration

### Saving Cover Letters
Cover letters are stored in the existing `candidate_documents` table:
```typescript
{
  candidate_id: userId,
  document_type: 'cover_letter',
  file_name: 'Cover Letter - {Company} - {Job Title}.pdf',
  file_url: uploadedPdfUrl,
  metadata: {
    job_id: jobId,
    generated_with_ai: true,
    tone: 'professional'
  }
}
```

### No Schema Changes Required
The `candidate_documents` table already supports `document_type: 'cover_letter'` (confirmed in `ResumeUploadModal.tsx`).

---

## Edge Function Details

### Input Schema
```typescript
interface CoverLetterRequest {
  jobId: string;
  candidateId: string;
  tone: 'professional' | 'conversational' | 'executive';
}
```

### Output Schema
```typescript
interface CoverLetterResponse {
  coverLetter: string;
  jobTitle: string;
  companyName: string;
  generatedAt: string;
}
```

### AI Prompt Structure
The edge function will:
1. Query `jobs` table with company join for context
2. Query `profiles` + `profile_experience` + candidate skills
3. Build a structured prompt:
   - System: "You are QUIN, a professional career assistant..."
   - User context: Job requirements, candidate experience, desired tone
4. Use `google/gemini-3-flash-preview` model (default per guidelines)
5. Return parsed cover letter with no explanations

---

## UI/UX Design

### Standalone Page Layout
```text
┌─────────────────────────────────────────────────────────────┐
│  COVER LETTER BUILDER                         [Profile docs]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ Step 1: Select Job  │  │ Step 2: Choose Tone          │ │
│  │ [Dropdown...]       │  │ ○ Professional (formal)      │ │
│  │                     │  │ ○ Conversational (friendly)  │ │
│  │ Or paste job URL    │  │ ○ Executive (C-level)        │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [✨ Generate with QUIN]                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  Dear Hiring Manager,                                │  │
│  │                                                      │  │
│  │  I am writing to express my interest in the         │  │
│  │  [Position] role at [Company]...                    │  │
│  │                                                      │  │
│  │  [Editable content area]                            │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [📄 Export PDF]  [📋 Copy]  [💾 Save to Documents]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tone Descriptions
- **Professional**: Formal business tone, suitable for corporate roles
- **Conversational**: Friendly and approachable, good for startups
- **Executive**: Concise, results-focused, for senior positions

---

## Integration with JobDetail

Add a "Generate Cover Letter" button in the job detail page that:
1. Opens a dialog with `CoverLetterBuilder` component
2. Pre-fills job context
3. Allows inline generation and preview
4. Option to save or download immediately

---

## Implementation Order

1. **Edge Function** (`generate-cover-letter/index.ts`)
   - Create function with CORS, auth handling
   - Implement job + candidate data fetching
   - Add AI generation logic with tone support
   - Handle rate limits and errors

2. **Hook** (`useCoverLetterGenerator.ts`)
   - Wrap edge function calls
   - Add save/load functionality
   - Manage loading states

3. **Components**
   - `CoverLetterPreview.tsx` - Preview/edit UI
   - `CoverLetterBuilder.tsx` - Full builder with steps

4. **Page** (`CoverLetterGenerator.tsx`)
   - Main standalone page
   - Integrate builder component

5. **Navigation Updates**
   - Add route
   - Add nav item
   - Add quick action

6. **JobDetail Integration**
   - Add "Generate Cover Letter" button
   - Dialog integration

7. **Plan Update**
   - Mark Phase 3 complete
   - Update score tracker

---

## Testing Considerations

- Test with jobs that have minimal vs comprehensive descriptions
- Verify PDF generation works correctly
- Test all three tone options produce distinct outputs
- Ensure saved documents appear in DocumentStatusWidget
- Test rate limit handling displays appropriate toast messages

---

## Accessibility

- All form elements have proper labels
- Keyboard navigation for tone selection
- Screen reader announcements for generation status
- Export buttons have descriptive aria-labels
