
# Full Meeting Intelligence → ML/RAG Integration

## Executive Summary

This plan creates a seamless pipeline that classifies and embeds all meeting intelligence data (transcripts, summaries, action items, skills, hiring signals) into the ML training pipeline and RAG system, ensuring every piece of information is retrievable by the correct entity type.

---

## Current State Analysis

### What's Already Working
| Component | Status | Notes |
|-----------|--------|-------|
| `meeting_recordings_extended` | ✅ Active | Stores transcripts, AI analysis, links to candidate/job/application |
| `transcribe-recording` | ✅ Active | Whisper transcription → chains to analysis |
| `analyze-meeting-recording-advanced` | ✅ Active | Generates summaries, action items, skills, key moments |
| `generate-embeddings` | ✅ Active | Supports candidate, job, knowledge, interaction entity types |
| `semantic-search` | ✅ Active | Searches across 4 entity types |
| `intelligence_embeddings` | ✅ Active | RAG storage with entity_type/entity_id classification |
| `bridge-meeting-to-intelligence` | ⚠️ Partial | Syncs to company_interactions but no embeddings |
| `extract-candidate-performance` | ⚠️ No embeddings | Stores to candidate_interview_performance only |
| `extract-hiring-manager-patterns` | ⚠️ No embeddings | Stores to hiring_manager_profiles only |
| `generate-ml-features` | ⚠️ Missing meeting data | No interview performance features |

### The Gap
Meeting intelligence is analyzed and stored, but:
1. **No embeddings generated** for meeting content → Not searchable via semantic search
2. **No entity classification** → Transcripts not tagged by candidate/job/interviewer
3. **No ML feature extraction** from interview performance → ML model blind to interview signals
4. **No automatic triggering** of embedding pipeline after analysis

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEETING RECORDING FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Recording Upload                                                           │
│       │                                                                     │
│       ▼                                                                     │
│  transcribe-recording ──► Whisper ──► transcript stored                     │
│       │                                                                     │
│       ▼ (chainAnalysis=true)                                                │
│  analyze-meeting-recording-advanced ──► AI Analysis                         │
│       │    (summary, skills, action_items, key_moments)                     │
│       │                                                                     │
│       ▼ NEW: Chain to embedding pipeline                                    │
│  embed-meeting-intelligence  ──► Generate embeddings by entity type         │
│       │                                                                     │
│       ├──► CANDIDATE embedding (transcript + performance context)           │
│       │        → intelligence_embeddings (entity_type=meeting_candidate)    │
│       │        → update candidate_profiles.profile_embedding                │
│       │                                                                     │
│       ├──► JOB embedding (interview Q&A patterns for this role)             │
│       │        → intelligence_embeddings (entity_type=meeting_job)          │
│       │                                                                     │
│       ├──► INTERVIEWER embedding (hiring manager patterns)                  │
│       │        → intelligence_embeddings (entity_type=meeting_interviewer)  │
│       │                                                                     │
│       └──► INTERACTION embedding (full meeting for company intelligence)    │
│                → company_interactions.interaction_embedding                 │
│                                                                             │
│       ▼ NEW: Extract ML features from meeting                               │
│  extract-meeting-ml-features                                                │
│       │                                                                     │
│       └──► ml_training_data (interview_score, communication_score, etc.)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: New Edge Function `embed-meeting-intelligence`

Create a new edge function that generates and stores embeddings for all meeting-related entities.

**File**: `supabase/functions/embed-meeting-intelligence/index.ts`

**Responsibilities**:
1. Accept `recordingId` from the analysis chain
2. Fetch recording with full context (candidate, job, host/interviewer)
3. Generate 4 distinct embeddings:
   - **Candidate context**: Transcript excerpts where candidate speaks + performance assessment
   - **Job context**: Interview questions asked + skills discussed for this role
   - **Interviewer context**: Hiring manager patterns, decision signals
   - **Interaction context**: Full meeting summary for company intelligence

**Entity Type Mapping**:
| Content Source | Entity Type | Target Table | Entity ID |
|----------------|-------------|--------------|-----------|
| Candidate's responses + skills assessment | `meeting_candidate` | `intelligence_embeddings` | `candidate_id` |
| Interview Q&A patterns | `meeting_job` | `intelligence_embeddings` | `job_id` |
| Hiring manager communication style | `meeting_interviewer` | `intelligence_embeddings` | `host_id` |
| Full meeting for RAG | `interaction` | `company_interactions` | `interaction_id` |

### Phase 2: Enhance `generate-ml-features` with Interview Data

Add 15+ new ML features derived from meeting intelligence.

**New Features**:
```typescript
// === H. INTERVIEW PERFORMANCE FEATURES (15 features) ===
interview_performance_exists: boolean,
interview_communication_clarity: number,        // 0-1
interview_communication_confidence: number,     // 0-1
interview_technical_competence: number,         // 0-1
interview_cultural_fit: number,                 // 0-1
interview_red_flags_count: number,
interview_green_flags_count: number,
interview_hiring_recommendation: string,        // strong_yes → strong_no
interview_answer_quality_avg: number,           // average of answer quality scores
interview_meetings_count: number,               // how many interviews for this app
hiring_manager_style_match: number,             // candidate vs interviewer style
hiring_manager_cultural_priorities_match: number,
```

### Phase 3: Database Schema Updates

**Migration 1**: Add entity_type values for meeting classification

```sql
-- Add new entity types to intelligence_embeddings index
COMMENT ON TABLE intelligence_embeddings IS 
'RAG storage. Entity types: company_dna, candidate, job, interaction, communication, 
meeting_candidate, meeting_job, meeting_interviewer';

-- Add meeting-related indexes
CREATE INDEX IF NOT EXISTS idx_intel_embed_meeting_candidate 
ON intelligence_embeddings(entity_id) WHERE entity_type = 'meeting_candidate';

CREATE INDEX IF NOT EXISTS idx_intel_embed_meeting_job 
ON intelligence_embeddings(entity_id) WHERE entity_type = 'meeting_job';

CREATE INDEX IF NOT EXISTS idx_intel_embed_meeting_interviewer 
ON intelligence_embeddings(entity_id) WHERE entity_type = 'meeting_interviewer';
```

**Migration 2**: Add interview features to ml_training_data

```sql
ALTER TABLE ml_training_data ADD COLUMN IF NOT EXISTS interview_performance_score REAL;
ALTER TABLE ml_training_data ADD COLUMN IF NOT EXISTS interview_communication_score REAL;
ALTER TABLE ml_training_data ADD COLUMN IF NOT EXISTS interview_cultural_fit_score REAL;
ALTER TABLE ml_training_data ADD COLUMN IF NOT EXISTS interview_hiring_recommendation TEXT;
ALTER TABLE ml_training_data ADD COLUMN IF NOT EXISTS interview_count INTEGER DEFAULT 0;
```

### Phase 4: Update `semantic-search` for Meeting Entity Types

Extend the search function to support new entity types.

**Changes to `supabase/functions/semantic-search/index.ts`**:
```typescript
switch (entity_type) {
  // ... existing cases ...
  
  case 'meeting_candidate':
    tableName = 'intelligence_embeddings';
    whereClause = "entity_type = 'meeting_candidate'";
    selectColumns = 'id, entity_id, content, metadata, embedding';
    break;
    
  case 'meeting_job':
    tableName = 'intelligence_embeddings';
    whereClause = "entity_type = 'meeting_job'";
    selectColumns = 'id, entity_id, content, metadata, embedding';
    break;
    
  case 'meeting_interviewer':
    tableName = 'intelligence_embeddings';
    whereClause = "entity_type = 'meeting_interviewer'";
    selectColumns = 'id, entity_id, content, metadata, embedding';
    break;
}
```

### Phase 5: Chain Analysis → Embedding Pipeline

Update `analyze-meeting-recording-advanced` to trigger embedding generation after analysis.

**Changes to `supabase/functions/analyze-meeting-recording-advanced/index.ts`**:

After line 834 (success response), add:
```typescript
// Trigger embedding generation for ML/RAG integration
try {
  await fetch(`${supabaseUrl}/functions/v1/embed-meeting-intelligence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ recordingId })
  });
  console.log('[Analysis] 🔗 Embedding generation triggered');
} catch (embErr) {
  console.warn('[Analysis] ⚠️ Failed to trigger embedding generation:', embErr);
}
```

### Phase 6: Backfill Existing Meetings

Create a one-time backfill function to process existing analyzed recordings.

**File**: `supabase/functions/backfill-meeting-embeddings/index.ts`

```typescript
// Fetch all completed recordings without embeddings
// Process in batches of 10
// Call embed-meeting-intelligence for each
// Track progress in a status table
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/embed-meeting-intelligence/index.ts` | Create | New function for multi-entity embedding generation |
| `supabase/functions/generate-ml-features/index.ts` | Modify | Add 15+ interview performance features |
| `supabase/functions/semantic-search/index.ts` | Modify | Add support for meeting_* entity types |
| `supabase/functions/analyze-meeting-recording-advanced/index.ts` | Modify | Chain to embed-meeting-intelligence |
| `supabase/functions/backfill-meeting-embeddings/index.ts` | Create | One-time backfill for existing recordings |
| `supabase/migrations/xxx_meeting_intelligence_embeddings.sql` | Create | Schema updates + indexes |
| `src/hooks/useSemanticSearch.ts` | Modify | Add meeting entity types to TypeScript types |
| `src/types/ml.ts` | Modify | Add interview features to MLFeatures interface |
| `supabase/config.toml` | Modify | Add new function configurations |

---

## Entity Classification Logic

The `embed-meeting-intelligence` function will classify content as follows:

```text
For each recording with analysis:

1. CANDIDATE EMBEDDING
   - Source: candidate's spoken segments (from transcript_json if available)
   - Enrichment: + skills_assessed + coaching_suggestions + key_strengths
   - Store: intelligence_embeddings WHERE entity_type='meeting_candidate', entity_id=candidate_id
   
2. JOB EMBEDDING  
   - Source: questions asked + key_moments related to role requirements
   - Enrichment: + action_items for hiring process
   - Store: intelligence_embeddings WHERE entity_type='meeting_job', entity_id=job_id
   
3. INTERVIEWER EMBEDDING
   - Source: interviewer speaking segments + decision patterns
   - Enrichment: + cultural_priorities + communication_style
   - Store: intelligence_embeddings WHERE entity_type='meeting_interviewer', entity_id=host_id
   
4. COMPANY INTERACTION EMBEDDING
   - Source: executive_summary + full transcript context
   - Store: company_interactions.interaction_embedding
```

---

## Search Use Cases After Implementation

| Query | Entity Type | Returns |
|-------|-------------|---------|
| "Find candidates who discussed React and TypeScript" | `meeting_candidate` | Candidates who mentioned these skills in interviews |
| "Roles where negotiation skills were discussed" | `meeting_job` | Jobs where interview focused on negotiation |
| "Interviewers who focus on cultural fit" | `meeting_interviewer` | Hiring managers with cultural assessment style |
| "All meetings about enterprise sales" | `interaction` | Company interactions mentioning enterprise sales |

---

## ML Training Enhancement

After implementation, the `prepare-training-data` function will have access to:

```typescript
features = {
  // ... existing 200+ features ...
  
  // NEW: Interview Intelligence Features
  interview_performance_exists: true,
  interview_communication_clarity: 0.85,
  interview_communication_confidence: 0.78,
  interview_technical_competence: 0.92,
  interview_cultural_fit: 0.88,
  interview_red_flags_count: 0,
  interview_green_flags_count: 3,
  interview_hiring_recommendation: 'strong_yes',
  interview_answer_quality_avg: 0.85,
  interview_meetings_count: 2,
  hiring_manager_style_match: 0.75,
}
```

This will significantly improve the ML model's ability to predict hiring outcomes.

---

## Success Metrics

1. **Embedding Coverage**: All new recordings generate 4 entity-type embeddings
2. **Search Accuracy**: Meeting content retrievable via semantic search
3. **ML Feature Completeness**: Interview features populated for 80%+ of applications with meetings
4. **Backfill Completion**: All existing analyzed recordings embedded within 48h

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Embedding API rate limits | Batch processing with 2s delays, circuit breaker pattern |
| Long transcripts | Use existing chunking logic from analyze-meeting-recording-advanced |
| Missing context (no candidate_id) | Skip candidate/job embeddings, generate only interaction embedding |
| Backfill overwhelming system | Process in batches of 10, with 5s delays between batches |
