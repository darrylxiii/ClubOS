import { useState, useEffect } from 'react';
import { Download, Smartphone, Share, Plus, Monitor, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Install() {
  const { canInstall, promptInstall, isInstalled } = useInstallPrompt();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  const handleAndroidInstall = async () => {
    if (canInstall) {
      await promptInstall();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Install The Quantum Club</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get instant access, work offline, and enjoy a native app experience
          </p>
        </div>

        {isInstalled && (
          <Card className="mb-8 border-green-500/50 bg-green-500/5">
            <CardContent className="flex items-center gap-3 py-6">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-semibold text-green-500">App Installed</p>
                <p className="text-sm text-muted-foreground">
                  The Quantum Club is already installed on this device
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                Why Install?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Instant Access:</strong> Launch directly from your home screen</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Work Offline:</strong> Access your content without internet</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Faster Loading:</strong> Optimized performance and speed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Push Notifications:</strong> Stay updated with real-time alerts</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {platform === 'ios' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Install on iPhone/iPad
                </CardTitle>
                <CardDescription>Follow these steps to add to your home screen</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-6">
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Tap the Share button</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                          <Share className="w-4 h-4" />
                          <span>Share</span>
                        </div>
                        <span>Look for this icon in Safari's toolbar (bottom or top)</span>
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Select "Add to Home Screen"</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                          <Plus className="w-4 h-4" />
                          <span>Add to Home Screen</span>
                        </div>
                        <span>Scroll down in the share menu to find this option</span>
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Confirm installation</p>
                      <p className="text-sm text-muted-foreground">
                        Tap "Add" in the top right corner to complete the installation
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}

          {platform === 'android' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Install on Android
                </CardTitle>
                <CardDescription>Quick one-tap installation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {canInstall ? (
                  <>
                    <p className="text-muted-foreground">
                      Click the button below to install The Quantum Club on your device. 
                      You'll get a native app icon and full offline capabilities.
                    </p>
                    <Button 
                      onClick={handleAndroidInstall}
                      size="lg"
                      className="w-full bg-gold hover:bg-gold/90"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Install App Now
                    </Button>
                  </>
                ) : (
                  <ol className="space-y-6">
                    <li className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">Open the browser menu</p>
                        <p className="text-sm text-muted-foreground">
                          Tap the three dots (⋮) in the top right corner of your browser
                        </p>
                      </div>
                    </li>
                    
                    <li className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">Select "Add to Home screen" or "Install app"</p>
                        <p className="text-sm text-muted-foreground">
                          The exact wording depends on your browser (Chrome, Firefox, Samsung Internet, etc.)
                        </p>
                      </div>
                    </li>
                    
                    <li className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">Confirm installation</p>
                        <p className="text-sm text-muted-foreground">
                          Tap "Add" or "Install" to complete the process
                        </p>
                      </div>
                    </li>
                  </ol>
                )}
              </CardContent>
            </Card>
          )}

          {platform === 'desktop' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Install on Desktop
                </CardTitle>
                <CardDescription>Available for Chrome, Edge, and other modern browsers</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-6">
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Look for the install icon</p>
                      <p className="text-sm text-muted-foreground">
                        Click the install icon <Download className="w-4 h-4 inline" /> in your browser's address bar
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Click "Install"</p>
                      <p className="text-sm text-muted-foreground">
                        Confirm the installation when prompted
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Launch from your desktop</p>
                      <p className="text-sm text-muted-foreground">
                        The app will open in a standalone window without browser UI
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you encounter any issues during installation, please contact our support team.
            </p>
            <Button variant="outline" asChild>
              <a href="/settings">Go to Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
