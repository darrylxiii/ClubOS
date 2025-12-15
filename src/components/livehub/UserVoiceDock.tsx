import React, { useState } from 'react';
import { useActiveCall } from '@/contexts/ActiveCallContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Headphones, HeadphonesIcon, PhoneOff, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { VoiceSettingsDialog } from './VoiceSettingsDialog';

interface UserVoiceDockProps {
    onNavigateToCall?: (channelId: string) => void;
}

export const UserVoiceDock = ({ onNavigateToCall }: UserVoiceDockProps) => {
    const { user } = useAuth();
    const { activeChannelId, leaveCall, voice } = useActiveCall();
    const [showSettings, setShowSettings] = useState(false);

    if (!activeChannelId || !user) return null;

    const { isMuted, isDeafened, toggleMute, toggleDeafen, connectionQuality } = voice;

    return (
        <>
            <div className="bg-card-foreground/5 border-t border-border p-2">
                {/* Connection Status Bar */}
                {connectionQuality === 'poor' && (
                    <div className="text-[10px] text-yellow-500 text-center mb-1 font-medium animate-pulse">
                        Poor Connection
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* User Info / Avatar */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden group">
                        <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={user.user_metadata?.avatar_url} />
                            <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0 cursor-pointer" onClick={() => onNavigateToCall?.(activeChannelId)}>
                            <span className="text-xs font-semibold truncate leading-tight group-hover:underline">
                                {user.user_metadata?.full_name || 'User'}
                            </span>
                            <span className="text-[10px] text-green-500 truncate leading-tight flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Voice Connected
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-0.5">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-7 w-7 ${isMuted ? 'text-red-500' : 'text-muted-foreground'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                    >
                                        {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isMuted ? 'Unmute' : 'Mute'}</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-7 w-7 ${isDeafened ? 'text-red-500' : 'text-muted-foreground'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleDeafen(); }}
                                    >
                                        {isDeafened ? <HeadphonesIcon className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isDeafened ? 'Undeafen' : 'Deafen'}</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Voice Settings</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                        onClick={(e) => { e.stopPropagation(); leaveCall(); }}
                                    >
                                        <PhoneOff className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Disconnect</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>

            <VoiceSettingsDialog
                open={showSettings}
                onOpenChange={setShowSettings}
            />
        </>
    );
};
