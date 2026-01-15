
import React, { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { validateTURNConfig, TURNServerHealth } from '@/utils/webrtcConfig';

export const ConnectionStatus = () => {
    const [health, setHealth] = useState<TURNServerHealth | null>(null);

    useEffect(() => {
        const checkHealth = async () => {
            const status = await validateTURNConfig();
            setHealth(status);
        };
        checkHealth();
    }, []);

    if (!health) return null;

    // Good State: Paid Servers match
    if (health.isPaidServer) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs font-medium text-green-500 hidden sm:inline">Secure</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Connection is encrypted and routed via premium relay servers.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Warning State: Free Servers (Default)
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-500 hidden sm:inline">Weak Signal</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <p className="font-semibold text-yellow-500 mb-1">Reliability Warning</p>
                    <p>You are using free public relay servers. Connection may fail on corporate networks or firewalls.</p>
                    <p className="mt-2 text-xs text-muted-foreground">Contact admin to configure VITE_TURN_URLS.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
