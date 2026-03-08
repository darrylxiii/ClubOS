import { useState, useCallback } from 'react';

/**
 * Manages all meeting UI panel visibility states.
 * Extracted from MeetingVideoCallInterface to reduce component complexity.
 */
export function useMeetingUI() {
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [showInterviewIntelligence, setShowInterviewIntelligence] = useState(false);
  const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showBackchannel, setShowBackchannel] = useState(false);
  const [showVoting, setShowVoting] = useState(false);
  const [showClubAIVoice, setShowClubAIVoice] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPredictiveHiring, setShowPredictiveHiring] = useState(false);
  const [showEngagementAnalytics, setShowEngagementAnalytics] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'spotlight'>('grid');
  const [unreadChatMessages, setUnreadChatMessages] = useState(0);

  const handleOpenChat = useCallback(() => setShowChat(true), []);
  const handleOpenParticipants = useCallback(() => setShowParticipants(true), []);
  const handleOpenSettings = useCallback(() => setShowSettings(true), []);
  const handleOpenNotes = useCallback(() => setShowNotes(true), []);
  const handleToggleCaptions = useCallback(() => setCaptionsEnabled(prev => !prev), []);
  const handleOpenTranscription = useCallback(() => setShowTranscription(true), []);
  const handleOpenHostSettings = useCallback(() => setShowHostSettings(true), []);
  const handleOpenMeetingInfo = useCallback(() => setShowMeetingDetails(true), []);
  const handleOpenInterviewIntelligence = useCallback(() => setShowInterviewIntelligence(true), []);
  const handleOpenBreakoutRooms = useCallback(() => setShowBreakoutRooms(true), []);
  const handleOpenPolls = useCallback(() => setShowPolls(true), []);
  const handleOpenQA = useCallback(() => setShowQA(true), []);
  const handleOpenBackgrounds = useCallback(() => setShowBackgrounds(true), []);
  const handleToggleLayout = useCallback(() => setLayout(prev => prev === 'grid' ? 'spotlight' : 'grid'), []);
  const handleToggleBackchannel = useCallback(() => setShowBackchannel(prev => !prev), []);
  const handleToggleVoting = useCallback(() => setShowVoting(prev => !prev), []);
  const handleToggleClubAIVoice = useCallback(() => setShowClubAIVoice(prev => !prev), []);
  const handleToggleTranslation = useCallback(() => setShowTranslation(prev => !prev), []);
  const handleTogglePredictiveHiring = useCallback(() => setShowPredictiveHiring(prev => !prev), []);
  const handleToggleEngagementAnalytics = useCallback(() => setShowEngagementAnalytics(prev => !prev), []);

  return {
    // Panel states
    showChat, setShowChat,
    showSettings, setShowSettings,
    showNotes, setShowNotes,
    showTranscription, setShowTranscription,
    captionsEnabled, setCaptionsEnabled,
    showHostSettings, setShowHostSettings,
    showParticipants, setShowParticipants,
    showMeetingDetails, setShowMeetingDetails,
    showInterviewIntelligence, setShowInterviewIntelligence,
    showBreakoutRooms, setShowBreakoutRooms,
    showPolls, setShowPolls,
    showQA, setShowQA,
    showBackgrounds, setShowBackgrounds,
    showBackchannel, setShowBackchannel,
    showVoting, setShowVoting,
    showClubAIVoice, setShowClubAIVoice,
    showTranslation, setShowTranslation,
    showPredictiveHiring, setShowPredictiveHiring,
    showEngagementAnalytics, setShowEngagementAnalytics,
    layout, setLayout,
    unreadChatMessages, setUnreadChatMessages,

    // Handlers
    handleOpenChat,
    handleOpenParticipants,
    handleOpenSettings,
    handleOpenNotes,
    handleToggleCaptions,
    handleOpenTranscription,
    handleOpenHostSettings,
    handleOpenMeetingInfo,
    handleOpenInterviewIntelligence,
    handleOpenBreakoutRooms,
    handleOpenPolls,
    handleOpenQA,
    handleOpenBackgrounds,
    handleToggleLayout,
    handleToggleBackchannel,
    handleToggleVoting,
    handleToggleClubAIVoice,
    handleToggleTranslation,
    handleTogglePredictiveHiring,
    handleToggleEngagementAnalytics,
  };
}
