import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

interface VoiceCommandResult {
  command: string;
  action: string;
  path?: string;
  searchTerm?: string;
}

// ── Route mappings for fuzzy matching ──
const routeMap: Record<string, string> = {
  home: "/home",
  dashboard: "/home",
  admin: "/admin",
  "admin panel": "/admin",
  profile: "/profile",
  "my profile": "/profile",
  jobs: "/jobs",
  "browse jobs": "/jobs",
  applications: "/applications",
  "my applications": "/applications",
  companies: "/companies",
  referrals: "/referrals",
  messages: "/messages",
  inbox: "/messages",
  meetings: "/meetings",
  scheduling: "/scheduling",
  calendar: "/scheduling",
  "interview prep": "/interview-prep",
  settings: "/settings",
  "account settings": "/settings",
  tasks: "/tasks",
  "club pilot": "/club-pilot",
  "club ai": "/club-ai",
  crm: "/crm",
  pipeline: "/admin/pipeline",
  feed: "/feed",
  "community feed": "/feed",
  "communication hub": "/admin/communication-hub",
  "target companies": "/partner/target-companies",
  "meeting intelligence": "/meeting-intelligence",
};

function fuzzyMatchRoute(spoken: string): string | null {
  const normalized = spoken.toLowerCase().trim();

  // Direct match
  if (routeMap[normalized]) return routeMap[normalized];

  // Partial match
  for (const [key, path] of Object.entries(routeMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return path;
    }
  }

  return null;
}

function parseCommand(transcript: string): VoiceCommandResult | null {
  const lower = transcript.toLowerCase().trim();

  // Navigation: "go to ...", "open ...", "show ...", "navigate to ..."
  const navPatterns = [
    /^(?:go to|open|show|navigate to|take me to)\s+(.+)$/i,
  ];
  for (const pattern of navPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const target = match[1];
      const path = fuzzyMatchRoute(target);
      if (path) {
        return { command: transcript, action: "navigate", path };
      }
    }
  }

  // Search: "search for ...", "find ...", "look up ..."
  const searchPatterns = [
    /^(?:search for|search|find|look up|look for)\s+(.+)$/i,
  ];
  for (const pattern of searchPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return { command: transcript, action: "search", searchTerm: match[1] };
    }
  }

  // Try just the spoken words as a route name
  const directPath = fuzzyMatchRoute(lower);
  if (directPath) {
    return { command: transcript, action: "navigate", path: directPath };
  }

  return null;
}

// ── Hook ──
export function useVoiceCommands() {
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isAdmin = currentRole === "admin";

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && isAdmin);
  }, [isAdmin]);

  const startListening = useCallback(() => {
    if (!isAdmin) {
      toast.error("Voice commands are only available for admins.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setLastResult(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        const result = parseCommand(finalTranscript);
        setLastResult(result);

        if (result) {
          if (result.action === "navigate" && result.path) {
            toast.success(`Navigating to ${result.path.replace(/\//g, " ").trim()}`);
            navigate(result.path);
          } else if (result.action === "search" && result.searchTerm) {
            toast.success(`Searching for "${result.searchTerm}"`);
            // Trigger Cmd+K with pre-filled query
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }
        } else {
          toast.error(`Command not recognized: "${finalTranscript}"`);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.error("Voice recognition error:", event.error);
        toast.error(`Voice error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isAdmin, navigate]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    lastResult,
    isSupported,
    toggle,
    startListening,
    stopListening,
  };
}