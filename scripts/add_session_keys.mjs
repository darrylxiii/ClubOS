#!/usr/bin/env node
/**
 * Adds all new i18n keys from this session's batch to the en locale JSONs.
 * Keys are grouped by namespace and added as flat keys (to match existing patterns).
 */
import fs from 'fs';
import path from 'path';

const LOCALE_DIR = path.resolve('src/i18n/locales/en');

// All new keys added in this session, grouped by namespace
const keysByNamespace = {
  common: {
    switchRole: 'Switch Role',
    matchScoreBreakdown: 'Match Score Breakdown',
    taskTemplates: 'Task Templates',
    withdrew: 'Withdrew',
    liveNow: 'Live Now',
    viewAllApplications: 'View All Applications',
    viewFullPipeline: 'View Full Pipeline',
    cancel: 'Cancel',
    conversationHistory: 'Conversation History',
    delegate: 'Delegate',
    defer: 'Defer',
    allowUsersToAddOptions: 'Allow Users to Add Options',
    schedulePollClosing: 'Schedule Poll Closing',
    clubOsAcademy: 'ClubOS Academy',
    visibility: 'Visibility',
    'fields.email': 'Email',
  },
  meetings: {
    fullTranscript: 'Full Transcript',
  },
  jobs: {
    jobDocuments: 'Job Documents',
    scheduleInterview: 'Schedule Interview',
  },
  analytics: {
    audienceInsights: 'Audience Insights',
    completePortfolio: 'Complete your portfolio to improve search visibility',
  },
  admin: {
    mergeSettings: 'Merge Settings',
    'blogQueue.topic': 'Topic',
    'blogQueue.category': 'Category',
    'blogQueue.format': 'Format',
    'bulkOps.customEmail': 'Custom Email',
    'achievements.icon': 'Icon',
    'achievements.iconEmoji': 'Icon Emoji',
    // Keys from earlier phase 1 batch
    'objectivesList.newObjective': 'New Objective',
    'objectivesList.title': 'Title',
    'objectivesList.type': 'Type',
    'objectivesList.priority': 'Priority',
    'objectivesList.status': 'Status',
    'objectivesList.progress': 'Progress',
    'objectivesList.startDate': 'Start Date',
    'objectivesList.endDate': 'End Date',
    'objectivesList.department': 'Department',
    'objectivesList.owner': 'Owner',
    'objectivesList.actions': 'Actions',
    'objectivesList.noObjectives': 'No objectives found',
    'recruiterProductivity.emptyState': 'No recruiter data available.',
    'recruiterProductivity.recruiter': 'Recruiter',
    'recruiterProductivity.activePipelines': 'Active Pipelines',
    'recruiterProductivity.screenedThisWeek': 'Screened This Week',
    'recruiterProductivity.interviewsScheduled': 'Interviews Scheduled',
    'recruiterProductivity.offersExtended': 'Offers Extended',
    'recruiterProductivity.avgTimeToFill': 'Avg. Time to Fill',
    'recruiterProductivity.candidateSatisfaction': 'Candidate Satisfaction',
    'recruiterProductivity.responseRate': 'Response Rate',
    'recruiterProductivity.hireRate': 'Hire Rate',
    'recruiterProductivity.trend': 'Trend',
    'assessmentResults.allTypes': 'All Types',
    'assessmentResults.allStatuses': 'All Statuses',
    'assessmentResults.noResults': 'No assessment results found.',
    'assessmentResults.unknownUser': 'Unknown User',
  },
  candidates: {
    'candidatesTab.exportCSV': 'Export CSV',
    'candidatesTab.allStatuses': 'All Statuses',
    'candidatesTab.allSources': 'All Sources',
    'candidatesTab.loadingCandidates': 'Loading candidates...',
    'candidatesTab.noCandidatesFound': 'No candidates found.',
    'candidatesTab.viaReferral': 'via Referral',
    'candidatesTab.unverified': 'Unverified',
    'assessmentDetail.latest': 'Latest',
    'assessments.public': 'Public',
  },
  partner: {
    'applicationsTable.urgent': 'Urgent',
    'applicationsTable.candidate': 'Candidate',
    'applicationsTable.position': 'Position',
    'applicationsTable.appliedDate': 'Applied Date',
    'applicationsTable.stage': 'Stage',
    'applicationsTable.matchScore': 'Match Score',
    'applicationsTable.source': 'Source',
    'applicationsTable.assessment': 'Assessment',
    'applicationsTable.targetSalary': 'Target Salary',
    'applicationsTable.viewProfile': 'View Profile',
    'applicationsTable.scheduleInterview': 'Schedule Interview',
    'applicationsTable.sendMessage': 'Send Message',
    'jobTable.location': 'Location',
  },
  settings: {
    'notifications.email': 'Email',
    'notifications.sms': 'SMS',
    'notifications.whatsApp': 'WhatsApp',
  },
  auth: {
    invalidEmailAddress: 'Invalid email address',
  },
};

// Helper to set nested key in object
function setNestedKey(obj, dotKey, value) {
  const parts = dotKey.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  if (current[lastKey] === undefined) {
    current[lastKey] = value;
    return true;
  }
  return false; // already exists
}

let totalAdded = 0;
let totalSkipped = 0;

for (const [ns, keys] of Object.entries(keysByNamespace)) {
  const filePath = path.join(LOCALE_DIR, `${ns}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Namespace file not found: ${ns}.json — skipping`);
    continue;
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let added = 0;

  for (const [key, value] of Object.entries(keys)) {
    if (setNestedKey(content, key, value)) {
      added++;
      totalAdded++;
    } else {
      totalSkipped++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`✅ ${ns}.json: ${added} keys added`);
  } else {
    console.log(`⏭️  ${ns}.json: all keys already exist`);
  }
}

console.log(`\n📊 Total: ${totalAdded} added, ${totalSkipped} already existed`);
