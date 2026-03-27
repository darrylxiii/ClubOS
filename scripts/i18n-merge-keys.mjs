#!/usr/bin/env node
/**
 * Merge flat i18n keys into nested structure and append to common.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const commonJsonPath = path.join(ROOT, 'src/i18n/locales/en/common.json');
const newKeysPath = path.join(ROOT, 'scripts/i18n-new-keys.json');

// Read existing common.json
const existing = JSON.parse(fs.readFileSync(commonJsonPath, 'utf8'));

// Read new flat keys
const flatKeys = JSON.parse(fs.readFileSync(newKeysPath, 'utf8'));

// Add achievements keys manually (these were done via manual editing, not the script)
const achievementsKeys = {
  "achievements": {
    "earned": "Earned",
    "locked": "Locked",
    "earnedAchievements": "Earned Achievements",
    "lockedAchievements": "Locked Achievements",
    "noAchievementsFound": "No achievements found",
    "quantumMember": "Quantum Member",
    "achievementHunter": "Achievement Hunter",
    "quantumEnergy": "Quantum Energy",
    "xpToNextMilestone": "{{count}} XP to next milestone",
    "unlockToShowcase": "Unlock achievements to showcase them here",
    "quantumJumps": "Quantum Jumps",
    "completeChallengeForXP": "Complete the challenge to earn bonus XP!",
    "progress": "Progress",
    "moreActionsNeeded": "{{count}} more action(s) needed",
    "startChallenge": "Start Challenge",
    "challengeCompleted": "Challenge Completed!",
    "loadingChallenges": "Loading challenges...",
    "dayStreak": "{{count}} Day Streak!",
    "keepItGoing": "Keep it going! Complete today's challenges",
    "dailyChallenges": "Daily Challenges",
    "resetsIn": "Resets in {{hours}}h",
    "noDailyChallenges": "No daily challenges available",
    "weeklyChallenges": "Weekly Challenges",
    "reactionRemoved": "Reaction removed",
    "applauseSent": "Quantum applause sent!",
    "failedToReact": "Failed to react",
    "unlocked": "Unlocked",
    "noRecentAchievements": "No Recent Achievements",
    "beFirstToUnlock": "Be the first to unlock and showcase an achievement!",
    "you": "You",
    "achievements": "achievements",
    "totalXP": "Total XP",
    "thisWeek": "This Week",
    "thisMonth": "This Month",
    "noLeaderboardData": "No leaderboard data available yet",
    "loadingLeaderboard": "Loading leaderboard...",
    "yourRanking": "Your Ranking",
    "globally": "globally",
    "allTime": "All-Time",
    "weekly": "Weekly",
    "monthly": "Monthly",
    "loadingPaths": "Loading achievement paths...",
    "achievementPaths": "Achievement Paths",
    "unlockInSequence": "Unlock achievements in sequence to progress through skill trees",
    "noPathsConfigured": "No achievement paths configured yet",
    "startNowToUnlock": "Start now to unlock!",
    "moreToUnlock": "{{count}} more to unlock",
    "lastProgress": "Last progress",
    "category": "Category",
    "rarity": "Rarity",
    "points": "Points",
    "pointsEarned": "Points Earned",
    "completeChallengeToUnlock": "Complete the challenge to unlock this achievement",
    "shareAchievement": "Share Achievement",
    "secretAchievement": "??? Secret Achievement",
    "lockedAndHidden": "Locked and hidden",
    "secret": "Secret",
    "hiddenUntilUnlocked": "This achievement is hidden until unlocked. Here's a hint...",
    "reward": "Reward",
    "keepExploring": "Keep exploring The Quantum Club to uncover this secret!",
    "secretUnlocked": "Secret Unlocked",
    "youDiscoveredSecret": "You discovered this secret!",
    "sharedToFeed": "Achievement shared to your feed!",
    "achievementUnlocked": "ACHIEVEMENT UNLOCKED",
    "shareToFeed": "Share to Feed",
    "searchPlaceholder": "Search achievements...",
    "allCategories": "All Categories",
    "allRarities": "All Rarities",
    "categories": {
      "all": "All",
      "influence": "Influence",
      "innovation": "Innovation",
      "social": "Social",
      "learning": "Learning",
      "prestige": "Prestige",
      "event": "Event",
      "pioneer": "Pioneer"
    },
    "rarities": {
      "common": "Common",
      "rare": "Rare",
      "epic": "Epic",
      "legendary": "Legendary",
      "quantum": "Quantum"
    },
    "actions": {
      "applyToJobs": "Apply to jobs",
      "completeCourses": "Complete courses",
      "referFriends": "Refer friends",
      "createPosts": "Create posts",
      "sendMessages": "Send messages",
      "saveJobs": "Save jobs",
      "completeProfile": "Complete profile",
      "takeAction": "Take action"
    },
    "estimates": {
      "lessThanADay": "Less than a day",
      "oneDay": "~1 day",
      "days": "~{{count}} days",
      "weeks": "~{{count}} weeks",
      "months": "~{{count}} months"
    }
  }
};

// Convert flat keys to nested structure
function flatToNested(flatObj) {
  const result = {};
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

const nestedNewKeys = flatToNested(flatKeys);

// Merge: add new keys without overwriting existing
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key in target) {
      if (typeof target[key] === 'object' && typeof source[key] === 'object') {
        deepMerge(target[key], source[key]);
      }
      // Don't overwrite existing scalar values
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge achievements keys
deepMerge(existing, achievementsKeys);

// Merge script-generated keys
deepMerge(existing, nestedNewKeys);

// Write back
fs.writeFileSync(commonJsonPath, JSON.stringify(existing, null, 2) + '\n');

// Count total new keys added
let newKeyCount = Object.keys(flatKeys).length + Object.keys(achievementsKeys.achievements).length;
console.log(`Merged ${newKeyCount}+ keys into common.json`);
console.log(`File size: ${(fs.statSync(commonJsonPath).size / 1024).toFixed(1)} KB`);
