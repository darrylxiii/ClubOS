import { motion } from '@/lib/motion';
import { useTranslation } from 'react-i18next';
import { 
  Download, 
  Smartphone, 
  Zap, 
  Bell, 
  WifiOff,
  Shield,
  Share,
  Plus,
  Check,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Card, CardContent } from '@/components/ui/card';
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function Install() {
  const { t } = useTranslation('common');
  const { isInstallable, isIOS, isInstalled, isStandalone, promptInstall } = useInstallPrompt();

  const handleInstall = async () => {
    await promptInstall();
  };

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant loading with optimized performance',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified about interviews and updates',
    },
    {
      icon: WifiOff,
      title: 'Works Offline',
      description: 'Access your data even without internet',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data stays safe on your device',
    },
  ];

  if (isInstalled || isStandalone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('install.title')}</h1>
          <p className="text-muted-foreground mb-6">{t('install.desc')}</p>
          <Button asChild>
            <a href="/home">{t('install.text11')}</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl p-6">
              <img 
                src={quantumLogoDark} 
                alt={t('install.text12')} 
                className="h-16 w-auto dark:hidden"
              />
              <img 
                src={quantumLogoLight} 
                alt={t('install.text13')} 
                className="h-16 w-auto hidden dark:block"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('install.title')}</h1>
            <p className="text-lg text-muted-foreground mb-8">{t('install.desc2')}</p>

            {isInstallable && !isIOS && (
              <Button
                onClick={handleInstall}
                size="lg"
                className="gap-2 text-lg px-8"
              >
                <Download className="w-5 h-5" />
                Install App
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-xl font-bold text-foreground text-center mb-8">{t('install.title')}</h2>

          {isIOS ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  iOS Installation
                </h3>
                <ol className="space-y-4">
                  <li className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 font-semibold text-primary">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('install.desc3')}</p>
                      <p className="text-sm text-muted-foreground">
                        Look for the <Share className="w-4 h-4 inline" /> icon at the bottom of Safari
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 font-semibold text-primary">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Find "Add to Home Screen"
                      </p>
                      <p className="text-sm text-muted-foreground">{t('install.desc4')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 font-semibold text-primary">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Tap "Add"
                      </p>
                      <p className="text-sm text-muted-foreground">{t('install.desc5')}</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Chrome / Edge Installation
                  </h3>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 font-semibold text-primary">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{t('install.desc6')}</p>
                        <p className="text-sm text-muted-foreground">
                          Check the address bar for a <Plus className="w-4 h-4 inline" /> or install button
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 font-semibold text-primary">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Click "Install"
                        </p>
                        <p className="text-sm text-muted-foreground">{t('install.desc7')}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 font-semibold text-primary">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{t('install.desc8')}</p>
                        <p className="text-sm text-muted-foreground">{t('install.desc9')}</p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer CTA */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="text-muted-foreground mb-4">{t('install.desc10')}</p>
          <Button variant="outline" asChild>
            <a href="/auth" className="gap-2">
              Continue to Sign In
              <ChevronRight className="w-4 h-4" />
            </a>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
