import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageSquare, Mic } from "lucide-react";
import { CRMProspect } from "@/types/crm-enterprise";

interface MobileProspectActionBarProps {
    prospect: CRMProspect;
    onVoiceNote: () => void;
}

export function MobileProspectActionBar({ prospect, onVoiceNote }: MobileProspectActionBarProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border/20 md:hidden z-50 pb-safe">
            <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="lg" className="flex flex-col gap-1 h-auto py-2" asChild>
                    <a href={`mailto:${prospect.email}`}>
                        <Mail className="w-5 h-5" />
                        <span className="text-[10px]">Email</span>
                    </a>
                </Button>

                <Button
                    variant="outline"
                    size="lg"
                    className="flex flex-col gap-1 h-auto py-2"
                    disabled={!prospect.phone}
                    asChild={!!prospect.phone}
                >
                    {prospect.phone ? (
                        <a href={`tel:${prospect.phone}`}>
                            <Phone className="w-5 h-5" />
                            <span className="text-[10px]">Call</span>
                        </a>
                    ) : (
                        <>
                            <Phone className="w-5 h-5 opacity-50" />
                            <span className="text-[10px]">Call</span>
                        </>
                    )}
                </Button>

                <Button variant="outline" size="lg" className="flex flex-col gap-1 h-auto py-2">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[10px]">SMS</span>
                </Button>

                <Button
                    variant="default"
                    size="lg"
                    className="flex flex-col gap-1 h-auto py-2 bg-primary text-primary-foreground"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-voice-assistant'));
                        onVoiceNote?.();
                    }}
                >
                    <Mic className="w-5 h-5" />
                    <span className="text-[10px]">Voice</span>
                </Button>
            </div>
        </div>
    );
}
