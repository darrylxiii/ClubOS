#!/usr/bin/env node
/**
 * i18n String Replacement Script
 * Replaces hardcoded English strings with t() calls across component files.
 *
 * Usage: node scripts/i18n-replace-strings.mjs
 */

import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════
// REPLACEMENT MAPS: { "exact string to find": "t() call" }
// ═══════════════════════════════════════════════════════

// Each entry maps a JSX text pattern to its replacement.
// We handle both plain text content and attribute values.

const REPLACEMENTS = {
  // ─── ACADEMY ───────────────────────────────────────
  'academy': {
    files: 'src/components/academy/',
    // Format: [searchPattern, replacement, options]
    // options: { attr: true } for attribute values, { jsx: true } for JSX text content
    replacements: [
      // AcademyDashboard.tsx
      ['>Ongoing<', `>{t("common:academy.ongoing", "Ongoing")}<`],
      ['>Completed<', `>{t("common:academy.completed", "Completed")}<`],
      ['>Certificate<', `>{t("common:academy.certificate", "Certificate")}<`],
      ['>Hour Spent<', `>{t("common:academy.hourSpent", "Hour Spent")}<`],
      ['>Course Topic<', `>{t("common:academy.courseTopic", "Course Topic")}<`],
      ['>Total Course<', `>{t("common:academy.totalCourse", "Total Course")}<`],
      ['>Design<', `>{t("common:academy.design", "Design")}<`],
      ['>Code<', `>{t("common:academy.code", "Code")}<`],
      ['>Business<', `>{t("common:academy.business", "Business")}<`],
      ['>Data<', `>{t("common:academy.data", "Data")}<`],
      ['>Your Badges<', `>{t("common:academy.yourBadges", "Your Badges")}<`],

      // CourseCard.tsx & PopularCourseCard.tsx
      ['>Course Creator<', `>{t("common:academy.courseCreator", "Course Creator")}<`],
      ['>New<', `>{t("common:academy.new", "New")}<`],

      // LearningPathCard.tsx
      ['>View Learning Path<', `>{t("common:academy.viewLearningPath", "View Learning Path")}<`],

      // MaterialCard.tsx
      ['>Certified<', `>{t("common:academy.certified", "Certified")}<`],
      ['label: "Quiz"', `label: t("common:academy.quiz", "Quiz")`],
      ['label: "Page"', `label: t("common:academy.page", "Page")`],
      ['label: "Learning Path"', `label: t("common:academy.learningPath", "Learning Path")`],
      ['label: "Course"', `label: t("common:academy.course", "Course")`],
      ['>Start<', `>{t("common:actions.start", "Start")}<`],
      ['>Continue<', `>{t("common:actions.continue", "Continue")}<`],
      ['>View<', `>{t("common:actions.view", "View")}<`],
      ['>Progress:<', `>{t("common:academy.progress", "Progress:")}<`],
      ['Passing point ', `{t("common:academy.passingPoint", "Passing point")} `],

      // ContinueLearningCard.tsx
      [' Materials<', ` ${'{t("common:academy.materials", "Materials")}'}<`],

      // ContentAttribution.tsx
      ['>Content Attribution<', `>{t("common:academy.contentAttribution", "Content Attribution")}<`],
      ['>Original Source<', `>{t("common:academy.originalSource", "Original Source")}<`],
      ['>License Details<', `>{t("common:academy.licenseDetails", "License Details")}<`],

      // CourseAppleCarousel.tsx
      ['hours<', `{t("common:academy.hours", "hours")}<`],
      ['lessons<', `{t("common:academy.lessons", "lessons")}<`],
      ['>Instructor: <', `>{t("common:academy.instructor", "Instructor:")} <`],
      ['>View Course<', `>{t("common:academy.viewCourse", "View Course")}<`],
      ['>Preview<', `>{t("common:academy.preview", "Preview")}<`],

      // AcademyBadges.tsx
      [' unlocked<', ` {t("common:achievements.unlocked", "unlocked")}<`],

      // AcademyLeaderboard.tsx
      ['>Leaderboard<', `>{t("common:academy.leaderboard", "Leaderboard")}<`],
      ['>This Month<', `>{t("common:academy.thisMonth", "This Month")}<`],
      ['>All Time<', `>{t("common:academy.allTime", "All Time")}<`],
      ['>No entries yet<', `>{t("common:academy.noEntriesYet", "No entries yet")}<`],

      // AcademyModuleCreator.tsx
      ['>Create New Module<', `>{t("common:academy.createNewModule", "Create New Module")}<`],
      ['>Module Title *<', `>{t("common:academy.moduleTitle", "Module Title *")}<`],
      ['>Description *<', `>{t("common:academy.description", "Description *")}<`],
      ['>Estimated Time (minutes)<', `>{t("common:academy.estimatedTime", "Estimated Time (minutes)")}<`],
      ['>Create Module<', `>{t("common:academy.createModule", "Create Module")}<`],

      // AcademyAchievements.tsx
      ['>Recent Achievements<', `>{t("common:academy.recentAchievements", "Recent Achievements")}<`],
      ['>Complete courses to unlock achievements!<', `>{t("common:academy.completeCoursesToUnlock", "Complete courses to unlock achievements!")}<`],

      // CourseCertificate.tsx
      ['>Congratulations!<', `>{t("common:academy.congratulations", "Congratulations!")}<`],
      ['"Certificate of Completion"', `{t("common:academy.certificateOfCompletion", "Certificate of Completion")}`],
      ['>Download Certificate<', `>{t("common:academy.downloadCertificate", "Download Certificate")}<`],
      ['>Share on LinkedIn<', `>{t("common:academy.shareOnLinkedIn", "Share on LinkedIn")}<`],
      [">What's Next?<", `>{t("common:academy.whatsNext", "What's Next?")}<`],
      ['>Start Learning<', `>{t("common:academy.startLearning", "Start Learning")}<`],
      ['>Continue Exploring<', `>{t("common:academy.continueExploring", "Continue Exploring")}<`],
      ['>Verified<', `>{t("common:academy.verified", "Verified")}<`],
      ['>Certificate ID:<', `>{t("common:academy.certificateId", "Certificate ID:")}<`],

      // LearningStreak.tsx
      ['>Learning Streak<', `>{t("common:academy.learningStreak", "Learning Streak")}<`],
      [' days<', ` {t("common:academy.days", "days")}<`],
      ['>Keep learning daily to maintain your streak!<', `>{t("common:academy.keepLearningDaily", "Keep learning daily to maintain your streak!")}<`],

      // WeeklyGoal.tsx
      ['>Weekly Goal<', `>{t("common:academy.weeklyGoal", "Weekly Goal")}<`],
      ['>Goal achieved! Keep it up!<', `>{t("common:academy.goalAchieved", "Goal achieved! Keep it up!")}<`],
      [' left to reach your goal<', ` {t("common:academy.leftToReachGoal", "left to reach your goal")}<`],

      // CourseModuleList.tsx
      ['>Module completed!<', `>{t("common:academy.moduleCompleted", "Module completed!")}<`],
      ['>Next Module<', `>{t("common:academy.nextModule", "Next Module")}<`],
      ['>Finished watching? Mark this module as complete<', `>{t("common:academy.finishedWatching", "Finished watching? Mark this module as complete")}<`],
      ['>Mark as Complete<', `>{t("common:academy.markAsComplete", "Mark as Complete")}<`],
      ['>Course Modules<', `>{t("common:academy.courseModules", "Course Modules")}<`],

      // CourseAIChat.tsx
      ['>AI Learning Assistant<', `>{t("common:academy.aiLearningAssistant", "AI Learning Assistant")}<`],
      ['>Try 1 free demo question<', `>{t("common:academy.tryFreeDemoQuestion", "Try 1 free demo question")}<`],
      ['"Ask anything about this module"', `{t("common:academy.askAnythingAboutModule", "Ask anything about this module")}`],
      ['>Demo:<', `>{t("common:academy.demo", "Demo:")}<`],

      // AIModuleAssistant.tsx
      ['>AI Assistant<', `>{t("common:academy.aiAssistant", "AI Assistant")}<`],
      ['"Ask anything about this course..."', `{t("common:academy.askAnythingAboutCourse", "Ask anything about this course...")}`],

      // CourseReviewForm.tsx
      ['>Your Rating<', `>{t("common:academy.yourRating", "Your Rating")}<`],
      ['>Your Review (Optional)<', `>{t("common:academy.yourReview", "Your Review (Optional)")}<`],
      ['>Would you recommend this course?<', `>{t("common:academy.wouldRecommend", "Would you recommend this course?")}<`],
      ['>Submit Review<', `>{t("common:academy.submitReview", "Submit Review")}<`],
      ['>Submitting...<', `>{t("common:academy.submitting", "Submitting...")}<`],

      // CourseNotes.tsx
      ['>Notes<', `>{t("common:academy.notes", "Notes")}<`],
      ['>Saving...<', `>{t("common:academy.saving", "Saving...")}<`],
      ['>Saved<', `>{t("common:academy.saved", "Saved")}<`],
      ['>Save Now<', `>{t("common:academy.saveNow", "Save Now")}<`],
      ['>Bookmark<', `>{t("common:academy.bookmark", "Bookmark")}<`],

      // ModuleDiscussion.tsx
      ['>Module Discussion<', `>{t("common:academy.moduleDiscussion", "Module Discussion")}<`],
      ['>Ask Question<', `>{t("common:academy.askQuestion", "Ask Question")}<`],
      ['>Post Question<', `>{t("common:academy.postQuestion", "Post Question")}<`],
      ['>No discussions yet. Be the first to ask a question!<', `>{t("common:academy.noDiscussionsYet", "No discussions yet. Be the first to ask a question!")}<`],
      ['>Resolved<', `>{t("common:academy.resolved", "Resolved")}<`],
      [' replies<', ` {t("common:academy.replies", "replies")}<`],
      [' views<', ` {t("common:academy.views", "views")}<`],

      // SkillGapJobMatch.tsx
      ['>Job Matches<', `>{t("common:academy.jobMatches", "Job Matches")}<`],
      ['>Complete more courses to unlock job matches<', `>{t("common:academy.completeMoreCourses", "Complete more courses to unlock job matches")}<`],
      ['>Browse Courses<', `>{t("common:academy.browseCourses", "Browse Courses")}<`],
      [' match<', ` {t("common:academy.match", "match")}<`],
      ['>See All Matches<', `>{t("common:academy.seeAllMatches", "See All Matches")}<`],

      // InteractiveTranscript.tsx
      ['>Interactive Transcript<', `>{t("common:academy.interactiveTranscript", "Interactive Transcript")}<`],
      ['>AI Powered<', `>{t("common:academy.aiPowered", "AI Powered")}<`],

      // AICourseGenerator.tsx
      ['>AI Course Generator<', `>{t("common:academy.aiCourseGenerator", "AI Course Generator")}<`],
      ['>Generating...<', `>{t("common:academy.generating", "Generating...")}<`],
      ['>Generate Structure<', `>{t("common:academy.generateStructure", "Generate Structure")}<`],
      ['>Try Again<', `>{t("common:academy.tryAgainGenerator", "Try Again")}<`],
      ['>Creating...<', `>{t("common:academy.creating", "Creating...")}<`],
      ['>Create Course<', `>{t("common:academy.createCourse", "Create Course")}<`],
      ['>Modules<', `>{t("common:academy.modules", "Modules")}<`],
      ['>Tips for best results:<', `>{t("common:academy.tipsForBestResults", "Tips for best results:")}<`],

      // QuizModule.tsx
      ['>Submit Quiz<', `>{t("common:academy.submitQuiz", "Submit Quiz")}<`],
      ['>Keep Practicing<', `>{t("common:academy.keepPracticing", "Keep Practicing")}<`],

      // CourseBuilderModules.tsx
      ['>Add Module<', `>{t("common:academy.addModule", "Add Module")}<`],
      ['>Start Building Your Course<', `>{t("common:academy.startBuildingCourse", "Start Building Your Course")}<`],
      ['>Add your first module to get started<', `>{t("common:academy.addFirstModule", "Add your first module to get started")}<`],
      ['>Create First Module<', `>{t("common:academy.createFirstModule", "Create First Module")}<`],

      // BrowseCoursesContent.tsx
      ['>Filters<', `>{t("common:academy.filtersTitle", "Filters")}<`],
      ['>Clear<', `>{t("common:academy.clear", "Clear")}<`],
      ['>Sort By<', `>{t("common:academy.sortByLabel", "Sort By")}<`],
      ['>Newest<', `>{t("common:academy.newest", "Newest")}<`],
      ['>Most Popular<', `>{t("common:academy.mostPopular", "Most Popular")}<`],
      ['>Shortest First<', `>{t("common:academy.shortestFirst", "Shortest First")}<`],
      ['>Highest Rated<', `>{t("common:academy.highestRated", "Highest Rated")}<`],
      ['>Categories<', `>{t("common:academy.categories", "Categories")}<`],
      ['>Difficulty<', `>{t("common:academy.difficulty", "Difficulty")}<`],
      ['>All Levels<', `>{t("common:academy.allLevels", "All Levels")}<`],
      ['>Beginner<', `>{t("common:academy.beginner", "Beginner")}<`],
      ['>Intermediate<', `>{t("common:academy.intermediate", "Intermediate")}<`],
      ['>Advanced<', `>{t("common:academy.advanced", "Advanced")}<`],
      ['>Duration<', `>{t("common:academy.duration", "Duration")}<`],
      ['>Any Duration<', `>{t("common:academy.anyDuration", "Any Duration")}<`],
      ['>Under 2 hours<', `>{t("common:academy.under2Hours", "Under 2 hours")}<`],
      ['>2-5 hours<', `>{t("common:academy.twoToFiveHours", "2-5 hours")}<`],
      ['>5+ hours<', `>{t("common:academy.fivePlusHours", "5+ hours")}<`],
      ['"Search courses, skills, topics..."', `{t("common:academy.searchPlaceholder", "Search courses, skills, topics...")}`],

      // FeaturedCourse.tsx
      ['>Featured Course of the Week<', `>{t("common:academy.featuredCourse", "Featured Course of the Week")}<`],
      [' learners enrolled<', ` {t("common:academy.learnersEnrolled", "learners enrolled")}<`],

      // CourseCreator.tsx
      ['>AI-Powered Course Creator<', `>{t("common:academy.aiPoweredCreator", "AI-Powered Course Creator")}<`],
      ['>Manual Entry<', `>{t("common:academy.manualEntry", "Manual Entry")}<`],

      // MyLearningDashboard.tsx
      ['>My Learning<', `>{t("common:academy.myLearning", "My Learning")}<`],
      ['>Achievements<', `>{t("common:academy.achievements", "Achievements")}<`],
      ['>Modules Completed<', `>{t("common:academy.modulesCompleted", "Modules Completed")}<`],
      ['>Current Streak<', `>{t("common:academy.currentStreak", "Current Streak")}<`],
      ['>Badges Earned<', `>{t("common:academy.badgesEarned", "Badges Earned")}<`],
      ['>Time This Week<', `>{t("common:academy.timeThisWeek", "Time This Week")}<`],
      ['>Weekly Learning Goal<', `>{t("common:academy.weeklyLearningGoal", "Weekly Learning Goal")}<`],
      ['>Your Learning Journey<', `>{t("common:academy.yourLearningJourney", "Your Learning Journey")}<`],
      [' courses enrolled<', ` {t("common:academy.coursesEnrolled", "courses enrolled")}<`],
      ['>Completion Rate<', `>{t("common:academy.completionRate", "Completion Rate")}<`],
      ['>Recent Certificates<', `>{t("common:academy.recentCertificates", "Recent Certificates")}<`],
      ['>Your achievements<', `>{t("common:academy.yourAchievements", "Your achievements")}<`],
      ['>View All<', `>{t("common:academy.viewAll", "View All")}<`],

      // CategoryBrowser.tsx
      ['>Browse by Category<', `>{t("common:academy.browseByCategory", "Browse by Category")}<`],
      ['>Trending<', `>{t("common:academy.trending", "Trending")}<`],

      // CourseChat.tsx
      ['"Sign in to continue..."', `{t("common:academy.signInToContinueChat", "Sign in to continue...")}`],

      // CourseLandingContent.tsx
      ['>Explore Our Academy Courses<', `>{t("common:academy.exploreAcademyCourses", "Explore Our Academy Courses")}<`],
      ['>Master the skills that matter.<', `>{t("common:academy.masterSkills", "Master the skills that matter.")}<`],

      // SkillJobBoard.tsx
      ['>Jobs Matching Your Skills<', `>{t("common:academy.jobsMatchingSkills", "Jobs Matching Your Skills")}<`],
      [' opportunities waiting<', ` {t("common:academy.opportunitiesWaiting", "opportunities waiting")}<`],
      [' required skills<', ` {t("common:academy.requiredSkills", "required skills")}<`],
      [' to learn<', ` {t("common:academy.toLearn", "to learn")}<`],
      ['>Missing:<', `>{t("common:academy.missing", "Missing:")}<`],
      ['>View All Jobs<', `>{t("common:academy.viewAllJobs", "View All Jobs")}<`],

      // VideoLesson.tsx
      ['>Interactive video lesson with synchronized transcript<', `>{t("common:academy.interactiveVideoLesson", "Interactive video lesson with synchronized transcript")}<`],

      // AcademyChatroom.tsx
      [' online<', ` {t("common:academy.onlineCount", "online")}<`],
      ['>No messages yet. Start the conversation!<', `>{t("common:academy.noMessagesYet", "No messages yet. Start the conversation!")}<`],

      // RecommendedCourses.tsx
      ['>Recommended for You<', `>{t("common:academy.recommendedForYou", "Recommended for You")}<`],
      ['>Based on your learning journey<', `>{t("common:academy.basedOnYourJourney", "Based on your learning journey")}<`],
      ['>Explore<', `>{t("common:academy.explore", "Explore")}<`],

      // QuickActionsPanel.tsx
      ['>Quick Actions<', `>{t("common:academy.quickActions", "Quick Actions")}<`],
      ['>My Skills<', `>{t("common:academy.mySkills", "My Skills")}<`],
      ['>Certificates<', `>{t("common:academy.certificates", "Certificates")}<`],
    ]
  },

  // ─── INCUBATOR ─────────────────────────────────────
  'incubator': {
    files: 'src/components/incubator/',
    replacements: [
      // IncubatorBriefScreen.tsx
      ['>Your Challenge<', `>{t("common:incubator.yourChallenge", "Your Challenge")}<`],
      ['>Read carefully. You have 45 seconds.<', `>{t("common:incubator.readCarefully", "Read carefully. You have 45 seconds.")}<`],
      ['>Budget (12 weeks)<', `>{t("common:incubator.budget", "Budget (12 weeks)")}<`],
      ['>Stage<', `>{t("common:incubator.stage", "Stage")}<`],
      ['>Region<', `>{t("common:incubator.region", "Region")}<`],
      ['>Target Customer<', `>{t("common:incubator.targetCustomer", "Target Customer")}<`],
      ['>Constraint:<', `>{t("common:incubator.constraint", "Constraint:")}<`],
      ['>Market Twist:<', `>{t("common:incubator.marketTwist", "Market Twist:")}<`],
      ['>Auto-advancing in<', `>{t("common:incubator.autoAdvancing", "Auto-advancing in")}<`],
      [`>I'm Ready — Start Now<`, `>{t("common:incubator.imReady", "I'm Ready — Start Now")}<`],

      // IncubatorAIChat.tsx
      ['>Club AI Assistant<', `>{t("common:incubator.clubAIAssistant", "Club AI Assistant")}<`],
      ['>Ask questions, run calculations, and get strategic feedback<', `>{t("common:incubator.askQuestionsCalc", "Ask questions, run calculations, and get strategic feedback")}<`],
      ['>Proceed to Final Review<', `>{t("common:incubator.proceedToFinalReview", "Proceed to Final Review")}<`],
      ['>Analyzing your question...<', `>{t("common:incubator.analyzingQuestion", "Analyzing your question...")}<`],
      ['"Ask for help with calculations, strategy, or specific sections..."', `{t("common:incubator.askForHelp", "Ask for help with calculations, strategy, or specific sections...")}`],
      ['>Press Enter to send, Shift+Enter for new line<', `>{t("common:incubator.pressEnterToSend", "Press Enter to send, Shift+Enter for new line")}<`],

      // IncubatorPlanCanvas.tsx
      ['>Your One-Pager<', `>{t("common:incubator.yourOnePager", "Your One-Pager")}<`],
      [' words<', ` {t("common:incubator.words", "words")}<`],
      [' sections started<', ` {t("common:incubator.sectionsStarted", "sections started")}<`],

      // IncubatorFrameScreen.tsx
      ['>Frame Your Strategy<', `>{t("common:incubator.frameYourStrategy", "Frame Your Strategy")}<`],
      ['>Lock in your north star. These answers will guide your plan and help us measure consistency.<', `>{t("common:incubator.lockInNorthStar", "Lock in your north star. These answers will guide your plan and help us measure consistency.")}<`],
      ['>Lock In Framework & Continue<', `>{t("common:incubator.lockInFramework", "Lock In Framework & Continue")}<`],
      ['>Fill out all fields to continue<', `>{t("common:incubator.fillOutAllFields", "Fill out all fields to continue")}<`],

      // IncubatorBuildScreen.tsx
      ['>Need 300-450 words total to proceed<', `>{t("common:incubator.needWordsToProceeed", "Need 300-450 words total to proceed")}<`],
    ]
  },

  // ─── INTERVIEW ─────────────────────────────────────
  'interview': {
    files: 'src/components/interview/',
    replacements: [
      // InterviewScheduler.tsx
      ['>Select a Date<', `>{t("common:interview.selectDate", "Select a Date")}<`],
      ['>Select a Time<', `>{t("common:interview.selectTime", "Select a Time")}<`],
      ['>Limited<', `>{t("common:interview.limited", "Limited")}<`],
      ['>Available<', `>{t("common:interview.available", "Available")}<`],
      ['>Select a date to see available times<', `>{t("common:interview.selectDateToSeeTimes", "Select a date to see available times")}<`],
      ['>Loading times...<', `>{t("common:interview.loadingTimes", "Loading times...")}<`],
      ['>No available times for this date<', `>{t("common:interview.noAvailableTimes", "No available times for this date")}<`],
      ['>Try another date<', `>{t("common:interview.tryAnotherDate", "Try another date")}<`],
      ['>Times shown in<', `>{t("common:interview.timesShownIn", "Times shown in")}<`],
      ['>Loading available times...<', `>{t("common:interview.loadingAvailableTimes", "Loading available times...")}<`],
      ['>No Interview Slots Available<', `>{t("common:interview.noSlotsAvailable", "No Interview Slots Available")}<`],
      ['>Schedule Your Interview<', `>{t("common:interview.scheduleYourInterview", "Schedule Your Interview")}<`],
      ['>Interview Scheduled<', `>{t("common:interview.interviewScheduled", "Interview Scheduled")}<`],
      ['>Review Your Booking<', `>{t("common:interview.reviewYourBooking", "Review Your Booking")}<`],
      ['>Interview Type<', `>{t("common:interview.interviewType", "Interview Type")}<`],
      ['>Date<', `>{t("common:interview.date", "Date")}<`],
      ['>Time<', `>{t("common:interview.time", "Time")}<`],
      ['>Duration<', `>{t("common:interview.durationLabel", "Duration")}<`],
      ['>Change Time<', `>{t("common:interview.changeTime", "Change Time")}<`],
      ['>Booking...<', `>{t("common:interview.booking", "Booking...")}<`],
      ['>Confirm Booking<', `>{t("common:interview.confirmBooking", "Confirm Booking")}<`],
      [`>You're All Set!<`, `>{t("common:interview.youreAllSet", "You're All Set!")}<`],
      ['>Schedule Another Interview<', `>{t("common:interview.scheduleAnother", "Schedule Another Interview")}<`],
      [' with <', ` {t("common:interview.with", "with")} <`],

      // PrepBriefCard.tsx
      ['>Interview Brief<', `>{t("common:interview.interviewBrief", "Interview Brief")}<`],
      ['>AI Generated<', `>{t("common:interview.aiGenerated", "AI Generated")}<`],
      ['>Your Summary<', `>{t("common:interview.yourSummary", "Your Summary")}<`],
      ['>Key Strengths to Highlight<', `>{t("common:interview.keyStrengths", "Key Strengths to Highlight")}<`],
      ['>Areas to Prepare<', `>{t("common:interview.areasToPrepare", "Areas to Prepare")}<`],
      ['>Questions to Ask Them<', `>{t("common:interview.questionsToAsk", "Questions to Ask Them")}<`],
      ['>Technical Topics to Review<', `>{t("common:interview.technicalTopics", "Technical Topics to Review")}<`],
      ['>Expected Questions<', `>{t("common:interview.expectedQuestions", "Expected Questions")}<`],
    ]
  },

  // ─── ASSESSMENTS ───────────────────────────────────
  'assessments': {
    files: 'src/components/assessments/',
    replacements: [
      ['>Start Test<', `>{t("common:assessments.startTest", "Start Test")}<`],
      ['>Available Soon<', `>{t("common:assessments.availableSoon", "Available Soon")}<`],
      [' min<', ` {t("common:assessments.min", "min")}<`],
    ]
  },

  // ─── ACHIEVEMENTS ──────────────────────────────────
  'achievements': {
    files: 'src/components/achievements/',
    replacements: [
      // AchievementProfile.tsx
      ['>Quantum Member<', `>{t("common:achievements.quantumMember", "Quantum Member")}<`],
      ['>Achievement Hunter<', `>{t("common:achievements.achievementHunter", "Achievement Hunter")}<`],
      ['>Quantum Energy<', `>{t("common:achievements.quantumEnergy", "Quantum Energy")}<`],
      [' XP to next milestone<', ` {t("common:achievements.xpToNextMilestone", "XP to next milestone")}<`],
      ['>Unlock achievements to showcase them here<', `>{t("common:achievements.unlockToShowcase", "Unlock achievements to showcase them here")}<`],

      // DailyChallenges.tsx
      ['>Loading challenges...<', `>{t("common:achievements.loadingChallenges", "Loading challenges...")}<`],
      ['>Daily Challenges<', `>{t("common:achievements.dailyChallenges", "Daily Challenges")}<`],
      ['>Weekly Challenges<', `>{t("common:achievements.weeklyChallenges", "Weekly Challenges")}<`],
      ['>No daily challenges available<', `>{t("common:achievements.noDailyChallenges", "No daily challenges available")}<`],
      ['>Day Streak!<', `>{t("common:achievements.dayStreak", "Day Streak!")}<`],
      ['>Keep it going!<', `>{t("common:achievements.keepItGoing", "Keep it going!")}<`],
      ['>today<', `>{t("common:achievements.today", "today")}<`],
      ['>Progress<', `>{t("common:achievements.progressLabel", "Progress")}<`],
      [' more actions needed<', ` {t("common:achievements.moreActionsNeeded", "more actions needed")}<`],
      ['>Start Challenge<', `>{t("common:achievements.startChallenge", "Start Challenge")}<`],
      ['>Challenge Completed!<', `>{t("common:achievements.challengeCompleted", "Challenge Completed!")}<`],
      ['>Resets in<', `>{t("common:achievements.resetsIn", "Resets in")}<`],

      // RecentAchievements.tsx
      ['>No Recent Achievements<', `>{t("common:achievements.noRecentAchievements", "No Recent Achievements")}<`],
      ['>Be the first to unlock and showcase an achievement!<', `>{t("common:achievements.beFirstToUnlock", "Be the first to unlock and showcase an achievement!")}<`],

      // AchievementGrid.tsx
      ['>All<', `>{t("common:achievements.allCategory", "All")}<`],
      ['>Influence<', `>{t("common:achievements.influence", "Influence")}<`],
      ['>Innovation<', `>{t("common:achievements.innovation", "Innovation")}<`],
      ['>Social<', `>{t("common:achievements.socialCategory", "Social")}<`],
      ['>Learning<', `>{t("common:achievements.learning", "Learning")}<`],
      ['>Prestige<', `>{t("common:achievements.prestige", "Prestige")}<`],
      ['>Event<', `>{t("common:achievements.event", "Event")}<`],
      ['>Pioneer<', `>{t("common:achievements.pioneer", "Pioneer")}<`],
      ['>Earned<', `>{t("common:achievements.earned", "Earned")}<`],
      ['>Locked<', `>{t("common:achievements.locked", "Locked")}<`],
      ['>Earned Achievements<', `>{t("common:achievements.earnedAchievements", "Earned Achievements")}<`],
      ['>Locked Achievements<', `>{t("common:achievements.lockedAchievements", "Locked Achievements")}<`],
      ['>No achievements found<', `>{t("common:achievements.noAchievementsFound", "No achievements found")}<`],

      // XPLeaderboard.tsx
      ['>Your Ranking<', `>{t("common:achievements.yourRanking", "Your Ranking")}<`],
      [' globally<', ` {t("common:achievements.globally", "globally")}<`],
      ['>Total XP<', `>{t("common:achievements.totalXP", "Total XP")}<`],
      ['>All-Time<', `>{t("common:achievements.allTime", "All-Time")}<`],
      ['>Weekly<', `>{t("common:achievements.weekly", "Weekly")}<`],
      ['>Monthly<', `>{t("common:achievements.monthly", "Monthly")}<`],
      ['>You<', `>{t("common:achievements.you", "You")}<`],
      ['>This Week<', `>{t("common:achievements.thisWeek", "This Week")}<`],
      ['>No leaderboard data available yet<', `>{t("common:achievements.noLeaderboardData", "No leaderboard data available yet")}<`],
      ['>Loading leaderboard...<', `>{t("common:achievements.loadingLeaderboard", "Loading leaderboard...")}<`],

      // QuantumJumps.tsx
      ['>Quantum Jumps<', `>{t("common:achievements.quantumJumps", "Quantum Jumps")}<`],

      // AchievementPaths.tsx
      ['>Achievement Paths<', `>{t("common:achievements.achievementPaths", "Achievement Paths")}<`],
      ['>Unlock achievements in sequence to progress through skill trees<', `>{t("common:achievements.achievementPathsDesc", "Unlock achievements in sequence to progress through skill trees")}<`],
      ['>No achievement paths configured yet<', `>{t("common:achievements.noPathsConfigured", "No achievement paths configured yet")}<`],
      ['>Loading achievement paths...<', `>{t("common:achievements.loadingPaths", "Loading achievement paths...")}<`],
      [' more to unlock<', ` {t("common:achievements.moreToUnlock", "more to unlock")}<`],
      ['>Start now to unlock!<', `>{t("common:achievements.startNowToUnlock", "Start now to unlock!")}<`],

      // BadgeCard.tsx
      ['>Category<', `>{t("common:achievements.category", "Category")}<`],
      ['>Rarity<', `>{t("common:achievements.rarity", "Rarity")}<`],
      ['>Points<', `>{t("common:achievements.points", "Points")}<`],
      ['>Complete the challenge to unlock this achievement<', `>{t("common:achievements.completeToUnlock", "Complete the challenge to unlock this achievement")}<`],
      ['>Share Achievement<', `>{t("common:achievements.shareAchievement", "Share Achievement")}<`],

      // SecretAchievementCard.tsx
      ['>Secret Achievement<', `>{t("common:achievements.secretAchievement", "Secret Achievement")}<`],
      ['>Locked and hidden<', `>{t("common:achievements.lockedAndHidden", "Locked and hidden")}<`],
      ['>Secret<', `>{t("common:achievements.secret", "Secret")}<`],
      [">This achievement is hidden until unlocked. Here's a hint...<", `>{t("common:achievements.hiddenUntilUnlocked", "This achievement is hidden until unlocked. Here's a hint...")}<`],
      ['>Reward<', `>{t("common:achievements.reward", "Reward")}<`],
      ['>Keep exploring The Quantum Club to uncover this secret!<', `>{t("common:achievements.keepExploring", "Keep exploring The Quantum Club to uncover this secret!")}<`],
      ['>Secret Unlocked<', `>{t("common:achievements.secretUnlocked", "Secret Unlocked")}<`],
      ['>You discovered this secret!<', `>{t("common:achievements.discoveredSecret", "You discovered this secret!")}<`],
      ['>Points Earned<', `>{t("common:achievements.pointsEarned", "Points Earned")}<`],

      // AchievementSearch.tsx
      ['"Search achievements..."', `{t("common:achievements.searchAchievements", "Search achievements...")}`],
      ['>All Categories<', `>{t("common:achievements.allCategories", "All Categories")}<`],
      ['>All Rarities<', `>{t("common:achievements.allRarities", "All Rarities")}<`],
      ['>Common<', `>{t("common:achievements.common", "Common")}<`],
      ['>Rare<', `>{t("common:achievements.rare", "Rare")}<`],
      ['>Epic<', `>{t("common:achievements.epic", "Epic")}<`],
      ['>Legendary<', `>{t("common:achievements.legendary", "Legendary")}<`],
      ['>Quantum<', `>{t("common:achievements.quantum", "Quantum")}<`],

      // AchievementUnlockToast.tsx
      ['>ACHIEVEMENT UNLOCKED<', `>{t("common:achievements.achievementUnlocked", "ACHIEVEMENT UNLOCKED")}<`],
      ['>Share to Feed<', `>{t("common:achievements.shareToFeed", "Share to Feed")}<`],
    ]
  },

  // ─── BLOG ──────────────────────────────────────────
  'blog': {
    files: 'src/components/blog/',
    replacements: [
      // ArticleFeedback.tsx
      ['>Helpful<', `>{t("common:blog.helpful", "Helpful")}<`],
      ['>Interesting<', `>{t("common:blog.interesting", "Interesting")}<`],
      ['>Learned Something<', `>{t("common:blog.learnedSomething", "Learned Something")}<`],
      ['>Did you find this article helpful?<', `>{t("common:blog.didYouFindHelpful", "Did you find this article helpful?")}<`],

      // BlogAuthorCard.tsx
      [' publications<', ` {t("common:blog.publications", "publications")}<`],
      ['>Verified expert<', `>{t("common:blog.verifiedExpert", "Verified expert")}<`],

      // BlogCTA.tsx
      ['>Join The Quantum Club<', `>{t("common:blog.joinTheQuantumClub", "Join The Quantum Club")}<`],
      ['>A private network connecting exceptional talent with transformative opportunities.<', `>{t("common:blog.privateNetwork", "A private network connecting exceptional talent with transformative opportunities.")}<`],
      ['>Apply as talent<', `>{t("common:blog.applyAsTalent", "Apply as talent")}<`],
      ['>Partner with us<', `>{t("common:blog.partnerWithUs", "Partner with us")}<`],

      // BlogExpertBadge.tsx
      ['>Expert Reviewed<', `>{t("common:blog.expertReviewed", "Expert Reviewed")}<`],
      ['>Reviewed for accuracy and relevance<', `>{t("common:blog.reviewedForAccuracy", "Reviewed for accuracy and relevance")}<`],

      // BlogFloatingCTA.tsx
      ['>Ready for your next move?<', `>{t("common:blog.readyForNextMove", "Ready for your next move?")}<`],
      ['>Apply as Talent<', `>{t("common:blog.applyAsTalentCta", "Apply as Talent")}<`],
      ['>Dismiss<', `>{t("common:blog.dismiss", "Dismiss")}<`],

      // BlogNewsletter.tsx / NewsletterSignup.tsx
      ['>Stay Updated<', `>{t("common:blog.stayUpdated", "Stay Updated")}<`],
      ['>Get the latest career insights.<', `>{t("common:blog.getLatestInsights", "Get the latest career insights.")}<`],
      ['>Subscribed.<', `>{t("common:blog.subscribed", "Subscribed.")}<`],
      ['>Career Intelligence, Delivered<', `>{t("common:blog.careerIntelligenceDelivered", "Career Intelligence, Delivered")}<`],
      ['>Join professionals receiving curated insights weekly.<', `>{t("common:blog.joinProfessionals", "Join professionals receiving curated insights weekly.")}<`],
      [`>You're on the list.<`, `>{t("common:blog.youreOnTheList", "You're on the list.")}<`],
      ['>Subscribe<', `>{t("common:blog.subscribe", "Subscribe")}<`],
      ['>Subscribing...<', `>{t("common:blog.subscribing", "Subscribing...")}<`],

      // BlogList.tsx
      ['>No articles found.<', `>{t("common:blog.noArticlesFound", "No articles found.")}<`],
      ['>Blog articles<', `>{t("common:blog.blogArticles", "Blog articles")}<`],

      // BlogHeader.tsx
      ['>Insights<', `>{t("common:blog.insights", "Insights")}<`],
      ['>Career intelligence for top-tier talent.<', `>{t("common:blog.careerIntelligence", "Career intelligence for top-tier talent.")}<`],
      ['"Search articles..."', `{t("common:blog.searchArticles", "Search articles...")}`],

      // BlogKeyTakeaways.tsx
      ['>Key Takeaways<', `>{t("common:blog.keyTakeaways", "Key Takeaways")}<`],

      // BlogSaveButton.tsx
      ['>Saved<', `>{t("common:blog.savedLabel", "Saved")}<`],
      ['>Save for Later<', `>{t("common:blog.saveForLater", "Save for Later")}<`],

      // BlogRelatedArticles.tsx
      ['>Related Articles<', `>{t("common:blog.relatedArticles", "Related Articles")}<`],
      ['>View all articles<', `>{t("common:blog.viewAllArticles", "View all articles")}<`],

      // BlogShareBar.tsx
      ['>Share:<', `>{t("common:blog.share", "Share:")}<`],
      ['>Link copied<', `>{t("common:blog.linkCopied", "Link copied")}<`],

      // BlogPopularArticles.tsx
      ['>Popular Articles<', `>{t("common:blog.popularArticles", "Popular Articles")}<`],

      // BlogTableOfContents.tsx
      ['>In this article<', `>{t("common:blog.inThisArticle", "In this article")}<`],
      ['>On this page<', `>{t("common:blog.onThisPage", "On this page")}<`],

      // BlogTags.tsx
      ['>All<', `>{t("common:blog.all", "All")}<`],

      // BlogFooterCTA.tsx
      ['>Join The Club<', `>{t("common:blog.joinTheClub", "Join The Club")}<`],

      // min read
      [' min read<', ` {t("common:blog.min", "min")} read<`],
    ]
  },

  // ─── SOCIAL ────────────────────────────────────────
  'social': {
    files: 'src/components/social/',
    replacements: [
      // SocialAnalyticsDashboard.tsx
      ['>Total Reach<', `>{t("common:social.totalReach", "Total Reach")}<`],
      ['>Engagement Rate<', `>{t("common:social.engagementRate", "Engagement Rate")}<`],
      ['>Total Comments<', `>{t("common:social.totalComments", "Total Comments")}<`],
      ['>Shares<', `>{t("common:social.shares", "Shares")}<`],
      ['>Overview<', `>{t("common:social.overview", "Overview")}<`],
      ['>Top Posts<', `>{t("common:social.topPosts", "Top Posts")}<`],
      ['>Audience<', `>{t("common:social.audience", "Audience")}<`],
      ['>Growth<', `>{t("common:social.growth", "Growth")}<`],
      ['>Performance Overview<', `>{t("common:social.performanceOverview", "Performance Overview")}<`],
      ['>Top Performing Posts<', `>{t("common:social.topPerformingPosts", "Top Performing Posts")}<`],
      ['>Audience Insights<', `>{t("common:social.audienceInsights", "Audience Insights")}<`],
      ['>Growth Trends<', `>{t("common:social.growthTrends", "Growth Trends")}<`],

      // SocialHashtagManager.tsx
      ['>Trending Hashtags<', `>{t("common:social.trendingHashtags", "Trending Hashtags")}<`],
      [' posts<', ` {t("common:social.posts", "posts")}<`],
      ['>Saved Hashtag Sets<', `>{t("common:social.savedHashtagSets", "Saved Hashtag Sets")}<`],
      ['>New Set<', `>{t("common:social.newSet", "New Set")}<`],
      ['>Copy<', `>{t("common:social.copy", "Copy")}<`],
      ['>Create Custom Set<', `>{t("common:social.createCustomSet", "Create Custom Set")}<`],
      ['"Enter hashtags separated by commas..."', `{t("common:social.enterHashtags", "Enter hashtags separated by commas...")}`],
      ['>Save Hashtag Set<', `>{t("common:social.saveHashtagSet", "Save Hashtag Set")}<`],

      // SocialAccountsManager.tsx
      ['>Connected Accounts<', `>{t("common:social.connectedAccounts", "Connected Accounts")}<`],
      ['>No Accounts Connected<', `>{t("common:social.noAccountsConnected", "No Accounts Connected")}<`],
      ['>Connect your social media accounts to start managing them<', `>{t("common:social.connectAccountsDesc", "Connect your social media accounts to start managing them")}<`],
      ['>View Profile<', `>{t("common:social.viewProfile", "View Profile")}<`],
      ['>Sync<', `>{t("common:social.sync", "Sync")}<`],
      ['>Disconnect Account?<', `>{t("common:social.disconnectAccount", "Disconnect Account?")}<`],
      ['>Disconnect<', `>{t("common:social.disconnect", "Disconnect")}<`],
      ['>Connect More Platforms<', `>{t("common:social.connectMorePlatforms", "Connect More Platforms")}<`],
      ['>Connected<', `>{t("common:social.connected", "Connected")}<`],

      // SocialGamification.tsx
      ['>Level<', `>{t("common:social.level", "Level")}<`],
      ['>Current Streak<', `>{t("common:social.currentStreak", "Current Streak")}<`],
      ['>Longest Streak<', `>{t("common:social.longestStreak", "Longest Streak")}<`],
      ['>Total Posts<', `>{t("common:social.totalPostsStat", "Total Posts")}<`],
      ['>Badges & Achievements<', `>{t("common:social.badgesAndAchievements", "Badges & Achievements")}<`],
      ['>Weekly Leaderboard<', `>{t("common:social.weeklyLeaderboard", "Weekly Leaderboard")}<`],

      // SocialCommentManager.tsx
      ['"Search comments..."', `{t("common:social.searchComments", "Search comments...")}`],
      [' pending<', ` {t("common:social.pending", "pending")}<`],
      ['>Pending<', `>{t("common:social.pendingTab", "Pending")}<`],
      ['>Replied<', `>{t("common:social.repliedTab", "Replied")}<`],
      ['>Spam<', `>{t("common:social.spamTab", "Spam")}<`],
      ['>Approve<', `>{t("common:social.approve", "Approve")}<`],
      ['>Reply<', `>{t("common:social.reply", "Reply")}<`],
      ['>Hide<', `>{t("common:social.hide", "Hide")}<`],
      ['>Pending comments will appear here<', `>{t("common:social.pendingCommentsHere", "Pending comments will appear here")}<`],
      ['>Replied comments will appear here<', `>{t("common:social.repliedCommentsHere", "Replied comments will appear here")}<`],
      ['>Spam comments will appear here<', `>{t("common:social.spamCommentsHere", "Spam comments will appear here")}<`],

      // SocialStoryViewer.tsx
      ['>Delete Story<', `>{t("common:social.deleteStory", "Delete Story")}<`],
      ['>Share Story<', `>{t("common:social.shareStory", "Share Story")}<`],
      ['>Share Story To<', `>{t("common:social.shareStoryTo", "Share Story To")}<`],
      ['"Send message..."', `{t("common:social.sendMessage", "Send message...")}`],

      // SocialPostCreator.tsx
      ['>Create New Post<', `>{t("common:social.createNewPost", "Create New Post")}<`],
      ['>Select Platforms<', `>{t("common:social.selectPlatforms", "Select Platforms")}<`],
      ['>Post<', `>{t("common:social.post", "Post")}<`],
      ['>Poll<', `>{t("common:social.poll", "Poll")}<`],
      ['>Article<', `>{t("common:social.article", "Article")}<`],
      [`>What's on your mind?<`, `>{t("common:social.whatsOnYourMind", "What's on your mind?")}<`],
      ['"Share your thoughts..."', `{t("common:social.shareYourThoughts", "Share your thoughts...")}`],
      ['>Poll Question<', `>{t("common:social.pollQuestion", "Poll Question")}<`],
      ['"Ask a question..."', `{t("common:social.askAQuestion", "Ask a question...")}`],
      ['>Options<', `>{t("common:social.options", "Options")}<`],
      ['>Add Option<', `>{t("common:social.addOption", "Add Option")}<`],
      ['>Event Description<', `>{t("common:social.eventDescription", "Event Description")}<`],
      ['"Describe your event..."', `{t("common:social.describeYourEvent", "Describe your event...")}`],
      ['>Date & Time<', `>{t("common:social.dateAndTime", "Date & Time")}<`],
      ['>Location<', `>{t("common:social.location", "Location")}<`],
      ['"Event location"', `{t("common:social.eventLocation", "Event location")}`],
      ['>Event Link<', `>{t("common:social.eventLink", "Event Link")}<`],
      ['>Article Content<', `>{t("common:social.articleContent", "Article Content")}<`],
      ['"Write your article..."', `{t("common:social.writeYourArticle", "Write your article...")}`],
      ['>Get AI Suggestions<', `>{t("common:social.getAISuggestions", "Get AI Suggestions")}<`],
      ['>AI Suggestions (click to use)<', `>{t("common:social.aiSuggestionsLabel", "AI Suggestions (click to use)")}<`],
      ['>Publishing...<', `>{t("common:social.publishing", "Publishing...")}<`],
      ['>Publish<', `>{t("common:social.publish", "Publish")}<`],

      // SocialContentCalendar.tsx
      ['>Content Calendar<', `>{t("common:social.contentCalendar", "Content Calendar")}<`],
      ['>Schedule Post<', `>{t("common:social.schedulePost", "Schedule Post")}<`],
      [' scheduled<', ` {t("common:social.scheduled", "scheduled")}<`],
      ['>No posts scheduled for this day<', `>{t("common:social.noPostsScheduled", "No posts scheduled for this day")}<`],

      // SocialPostAnalytics.tsx
      ['>Post Analytics<', `>{t("common:social.postAnalytics", "Post Analytics")}<`],
      ['>Loading analytics...<', `>{t("common:social.loadingAnalytics", "Loading analytics...")}<`],
      ['>Unique Views<', `>{t("common:social.uniqueViews", "Unique Views")}<`],
      ['>Likes<', `>{t("common:social.likes", "Likes")}<`],
      ['>Comments<', `>{t("common:social.comments", "Comments")}<`],
      ['>Bookmarks<', `>{t("common:social.bookmarks", "Bookmarks")}<`],
      ['>Viewers<', `>{t("common:social.viewers", "Viewers")}<`],
      ['>Interactions<', `>{t("common:social.interactions", "Interactions")}<`],
      ['>Performance Summary<', `>{t("common:social.performanceSummary", "Performance Summary")}<`],
      ['>Key metrics for this post<', `>{t("common:social.keyMetrics", "Key metrics for this post")}<`],
      ['>Total Views<', `>{t("common:social.totalViews", "Total Views")}<`],
      ['>Total Interactions<', `>{t("common:social.totalInteractions", "Total Interactions")}<`],
      ['>Export Analytics<', `>{t("common:social.exportAnalytics", "Export Analytics")}<`],
      ['>Top Locations<', `>{t("common:social.topLocations", "Top Locations")}<`],
      ['>Device Breakdown<', `>{t("common:social.deviceBreakdown", "Device Breakdown")}<`],

      // SocialEventCard.tsx
      ['>Past Event<', `>{t("common:social.pastEvent", "Past Event")}<`],
      ['>Upcoming<', `>{t("common:social.upcoming", "Upcoming")}<`],
      [' attending<', ` {t("common:social.attending", "attending")}<`],
      ['>Event Ended<', `>{t("common:social.eventEnded", "Event Ended")}<`],
      ['>Interested<', `>{t("common:social.interested", "Interested")}<`],
      ['>Details<', `>{t("common:social.details", "Details")}<`],

      // SocialPollCard.tsx
      [' total votes<', ` {t("common:social.totalVotes", "total votes")}<`],
      ['>Poll ended<', `>{t("common:social.pollEnded", "Poll ended")}<`],
      [' votes<', ` {t("common:social.votes", "votes")}<`],
    ]
  }
};

// ═══════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';
let totalReplacements = 0;
let filesModified = 0;
let errors = [];

for (const [section, config] of Object.entries(REPLACEMENTS)) {
  const dirPath = path.join(ROOT, config.files);

  if (!fs.existsSync(dirPath)) {
    console.log(`[SKIP] Directory not found: ${dirPath}`);
    continue;
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.tsx'));

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileReplacements = 0;

    for (const [search, replace] of config.replacements) {
      // Count occurrences
      const count = content.split(search).length - 1;
      if (count > 0) {
        content = content.replaceAll(search, replace);
        fileReplacements += count;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[OK] ${file}: ${fileReplacements} replacements`);
      totalReplacements += fileReplacements;
      filesModified++;
    }
  }
}

console.log(`\n═══════════════════════════════════════`);
console.log(`Total: ${totalReplacements} replacements across ${filesModified} files`);
if (errors.length > 0) {
  console.log(`Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  - ${e}`));
}
