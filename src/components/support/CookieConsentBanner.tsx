import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const CookieConsentBanner = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true, // Always true
    functional: false,
    analytics: false,
    marketing: false,
    third_party: false,
  });

  useEffect(() => {
    // Get user without requiring AuthContext
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
      checkExistingConsent(user?.id || null);
    });
  }, []);

  const checkExistingConsent = async (currentUserId: string | null) => {
    // Check localStorage first (for anonymous users)
    const localConsent = localStorage.getItem('cookie_consent');
    if (localConsent) {
      const parsed = JSON.parse(localConsent);
      const expiresAt = new Date(parsed.expires_at);
      if (expiresAt > new Date()) {
        return; // Valid consent exists
      }
    }

    // Check database if logged in
    if (currentUserId) {
      const { data } = await supabase
        .from('cookie_consent_records')
        .select('*')
        .eq('user_id', currentUserId)
        .is('withdrawn_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        setShow(true);
      }
    } else {
      setShow(true);
    }
  };

  const saveConsent = async (consentData: typeof consent) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    const record = {
      user_id: userId || null,
      session_id: !userId ? crypto.randomUUID() : null,
      consent_version: 'v1.0',
      ...consentData,
      expires_at: expiresAt.toISOString(),
    };

    // Save to localStorage
    localStorage.setItem('cookie_consent', JSON.stringify({
      ...consentData,
      expires_at: expiresAt.toISOString(),
    }));

    // Save to database if logged in
    if (userId) {
      await supabase.from('cookie_consent_records').insert(record);
    }

    setShow(false);
  };

  const handleAcceptAll = () => {
    const allConsent = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      third_party: true,
    };
    setConsent(allConsent);
    saveConsent(allConsent);
  };

  const handleRejectNonEssential = () => {
    const minimalConsent = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      third_party: false,
    };
    setConsent(minimalConsent);
    saveConsent(minimalConsent);
  };

  const handleSaveCustom = () => {
    saveConsent(consent);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[480px] z-50"
        >
          <Card className="p-6 shadow-2xl bg-background/95 backdrop-blur-sm border-border">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-foreground">Cookie Preferences</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShow(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content.
                  {' '}
                  <a href="/legal/cookie-policy" className="text-primary hover:underline">
                    Learn more
                  </a>
                </p>

                {showDetails && (
                  <div className="space-y-3 mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="necessary" className="font-medium">Necessary</Label>
                        <p className="text-xs text-muted-foreground">Required for basic functionality</p>
                      </div>
                      <Switch id="necessary" checked={true} disabled />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="functional">Functional</Label>
                        <p className="text-xs text-muted-foreground">Remember your preferences</p>
                      </div>
                      <Switch
                        id="functional"
                        checked={consent.functional}
                        onCheckedChange={(checked) => setConsent({ ...consent, functional: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="analytics">Analytics</Label>
                        <p className="text-xs text-muted-foreground">Help us improve our service</p>
                      </div>
                      <Switch
                        id="analytics"
                        checked={consent.analytics}
                        onCheckedChange={(checked) => setConsent({ ...consent, analytics: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="marketing">Marketing</Label>
                        <p className="text-xs text-muted-foreground">Personalized content & offers</p>
                      </div>
                      <Switch
                        id="marketing"
                        checked={consent.marketing}
                        onCheckedChange={(checked) => setConsent({ ...consent, marketing: checked })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  {!showDetails ? (
                    <>
                      <Button
                        onClick={handleAcceptAll}
                        className="flex-1"
                        size="sm"
                      >
                        Accept All
                      </Button>
                      <Button
                        onClick={handleRejectNonEssential}
                        variant="outline"
                        size="sm"
                      >
                        Reject Non-Essential
                      </Button>
                      <Button
                        onClick={() => setShowDetails(true)}
                        variant="ghost"
                        size="sm"
                      >
                        Customize
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleSaveCustom}
                        className="flex-1"
                        size="sm"
                      >
                        Save Preferences
                      </Button>
                      <Button
                        onClick={() => setShowDetails(false)}
                        variant="outline"
                        size="sm"
                      >
                        Back
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
