import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Mic, X, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClubAIHomeChat } from '@/hooks/useClubAIHomeChat';
import { useClubAIVoice } from '@/hooks/useClubAIVoice';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

export function ClubAIHomeChatWidget() {
  const {
    messages,
    isLoading,
    isExpanded,
    setIsExpanded,
    sendMessage,
    quickActions,
    clearMessages,
  } = useClubAIHomeChat();

  const voice = useClubAIVoice();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const toggleVoice = async () => {
    if (voice.status === 'connected') {
      await voice.endSession();
    } else {
      await voice.startSession();
    }
  };

  return (
    <div className="glass-subtle rounded-2xl overflow-hidden">
      {/* Collapsed / Input Bar */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {voice.status === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsExpanded(true)}
              placeholder="Ask Club AI anything..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Voice toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                voice.status === 'connected' && "text-primary bg-primary/10"
              )}
              onClick={toggleVoice}
              aria-label={voice.status === 'connected' ? 'End voice session' : 'Start voice session'}
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* Send */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>

            {/* Expand/Collapse */}
            {isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(false)}
                aria-label="Collapse chat"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick action chips - show when no messages */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Chat Panel */}
      <AnimatePresence>
        {isExpanded && messages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              {/* Messages area */}
              <div className="max-h-[400px] overflow-y-auto p-3 sm:p-4 space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Footer actions */}
              <div className="border-t border-border/30 px-3 py-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearMessages}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <span className="text-[10px] text-muted-foreground/50">
                  Powered by Club AI
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice status indicator */}
      <AnimatePresence>
        {voice.status === 'connected' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-primary/20 bg-primary/5 px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-primary">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {voice.isSpeaking ? 'Club AI is speaking...' : 'Listening...'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => voice.endSession()}
              >
                <X className="h-3 w-3 mr-1" />
                End
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
