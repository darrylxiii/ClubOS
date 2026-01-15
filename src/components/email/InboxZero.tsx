import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

interface InboxZeroProps {
    onReset?: () => void;
}

export function InboxZero({ onReset }: InboxZeroProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    duration: 0.5
                }}
                className="relative mb-6"
            >
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-background p-6 rounded-full border border-border shadow-sm">
                    <Mail className="h-12 w-12 text-primary" />
                </div>
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h3 className="text-2xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                    Inbox Zero
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
                    You're all caught up! Enjoy your day or check back later for new messages.
                </p>

                {onReset && (
                    <Button variant="outline" onClick={onReset} className="mt-2">
                        Refresh Inbox
                    </Button>
                )}
            </motion.div>
        </div>
    );
}
