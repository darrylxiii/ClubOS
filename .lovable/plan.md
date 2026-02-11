

# Candidate Profile Enhancement: Executive Intelligence Dossier

Transform the candidate profile from a basic data display into a comprehensive intelligence hub that gives partners instant, actionable clarity on every candidate.

## What Gets Added (6 New Sections)

### 1. Talent Intelligence Banner (Overview Tab)
A prominent card right below the AI Summary that surfaces the most critical decision-making data at a glance:
- **Talent Tier** badge (hot/warm/strategic/passive) with tier score
- **Move Probability** gauge (percentage likelihood of accepting)
- **Actively Looking** indicator
- **Ghost Mode** status (if enabled)
- **AI Recommendation** (strong_hire/hire/maybe/no_hire) with color coding

This data already exists in the database columns: `talent_tier`, `tier_score`, `move_probability`, `actively_looking`, `ghost_mode_enabled`, `ai_recommendation`.

### 2. AI Strengths & Concerns Card (Overview Tab)
Replaces the plain-text AI Summary with a structured intelligence card:
- **Key Strengths** (from `ai_strengths` JSONB) displayed as green-tinted chips
- **Key Concerns** (from `ai_concerns` JSONB) displayed as amber-tinted chips
- **Personality Insights** (from `personality_insights` JSONB) as a traits breakdown
- Powered-by-QUIN attribution

### 3. Compensation Intelligence Card (Overview Tab, Team View Only)
Partners always want to know salary fit. Surfaces existing data:
- **Current Compensation** range (from `current_salary_min`/`current_salary_max`)
- **Desired Compensation** range (from `desired_salary_min`/`desired_salary_max`)
- Visual comparison bar showing overlap
- Currency display from `preferred_currency`
- Respects `salary_preference_hidden` flag (hides if candidate opted out)

### 4. Interview Intelligence Summary (Overview Tab, Team View Only)
Aggregated interview performance (data already in DB):
- **Average Interview Score** (from `interview_score_avg`) with visual progress bar
- **Interview Count** (from `interview_count`)
- **Last Interview** date (from `last_interview_at`)
- **Aggregated Strengths** (from `key_strengths_aggregated`)
- **Aggregated Weaknesses** (from `key_weaknesses_aggregated`)

### 5. Availability & Preferences Card (Overview Tab)
Quick-scan card for practical logistics:
- **Notice Period** (already shown but buried)
- **Available Hours/Week** (from `available_hours_per_week`)
- **Industry Preference** (from `industry_preference`)
- **Company Size Preference** (from `company_size_preference`)
- **Remote Aspiration** (from `remote_work_aspiration`)
- **Preferred Language** (from `preferred_language`)
- **Desired Locations** (from `desired_locations`) as location chips

### 6. Candidate Signals Sidebar (Header Area)
Subtle signal indicators in the header area:
- **Enrichment freshness** ("Synced 2 days ago" vs "Stale -- last sync 3 months ago")
- **Profile Completeness** micro progress ring
- **Data source** indicator (LinkedIn/CV/Manual)

## Technical Approach

All data already exists in the `candidate_profiles` table. No database changes or new edge functions needed. This is purely a frontend enhancement.

### New Components (4 files)
| Component | Location |
|-----------|----------|
| `TalentIntelligenceBanner.tsx` | `src/components/candidate-profile/` |
| `AIInsightsCard.tsx` | `src/components/candidate-profile/` |
| `CompensationCard.tsx` | `src/components/candidate-profile/` |
| `AvailabilityCard.tsx` | `src/components/candidate-profile/` |

### Modified Files (1 file)
| File | Change |
|------|--------|
| `src/pages/CandidateProfile.tsx` | Import and place new components in the Overview tab |

### Layout in Overview Tab (top to bottom)
1. AI Summary (existing)
2. **Talent Intelligence Banner** (new) -- full width
3. **AI Insights Card** (new) -- strengths, concerns, personality
4. Two-column grid:
   - Left: **Compensation Card** (new, team-only)
   - Right: **Interview Intelligence** (new, team-only)
5. **Availability & Preferences** (new) -- replaces the current sparse Career Preferences card
6. Skills (existing)
7. Languages (existing)

### Design Standards
- Follows existing `candidateProfileTokens` design system
- Glass card styling consistent with ExperienceTimeline and DecisionDashboard
- Gold accent for talent tier, standard color coding for scores
- Respects `isTeamView` gating for sensitive fields (salary, ratings)
- Respects `salary_preference_hidden` -- shows "Hidden by candidate" if opted out
- "Powered by QUIN" attribution on AI-generated sections
