import { ReactNode, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChevronRight, Menu, X, Globe, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
  children: ReactNode;
  description?: string;
}

export function LegalPageLayout({ title, lastUpdated, sections, children, description }: LegalPageLayoutProps) {
  const { t, i18n } = useTranslation('common');
  const [activeSection, setActiveSection] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);
  const [dismissedDisclaimer, setDismissedDisclaimer] = useState(false);
  const isTranslated = i18n.language !== 'en';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -60% 0px",
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setTocOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} | The Quantum Club</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:title" content={`${title} | The Quantum Club`} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:type" content="article" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Last Updated: {lastUpdated}</span>
          </div>
        </div>

        {/* Translation Disclaimer Banner */}
        {isTranslated && !dismissedDisclaimer && (
          <Card className="mb-6 border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-500/30 overflow-hidden">
            <div className="relative">
              {/* Accent stripe */}
              <div className="absolute inset-y-0 left-0 w-1.5 bg-amber-500" />
              <div className="p-5 pl-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                        {t('legal.translationDisclaimer.title', 'Translation Notice')}
                      </h4>
                    </div>
                    <p className="text-sm text-amber-800/90 dark:text-amber-300/80 leading-relaxed mb-2">
                      {t('legal.translationDisclaimer.body', 'This document has been translated for your convenience. The original English version is the only legally binding and authoritative version. In the event of any discrepancy, inconsistency, or dispute between this translated version and the English original, the English version shall prevail in all respects.')}
                    </p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/60 leading-relaxed">
                      {t('legal.translationDisclaimer.noLiability', 'ClubOS assumes no liability for the accuracy, reliability, or completeness of this translation. This translated version does not constitute legal advice and may not reflect the most current legal developments. You are encouraged to review the English original before making any decisions based on this document.')}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        onClick={() => { i18n.changeLanguage('en'); }}
                      >
                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                        {t('legal.translationDisclaimer.viewEnglish', 'View English Original')}
                      </Button>
                      <button
                        onClick={() => setDismissedDisclaimer(true)}
                        className="text-xs text-amber-700/60 dark:text-amber-400/50 hover:text-amber-800 dark:hover:text-amber-300 underline underline-offset-2 transition-colors"
                      >
                        {t('legal.translationDisclaimer.dismiss', 'I understand, continue reading')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-8 relative">
          {/* Mobile TOC Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="fixed top-24 right-4 z-50 lg:hidden"
            onClick={() => setTocOpen(!tocOpen)}
          >
            {tocOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Table of Contents - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 h-fit">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">{t('legal.contents')}</h3>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="line-clamp-2">{section.title}</span>
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 flex-shrink-0 ml-2 transition-transform",
                          activeSection === section.id ? "text-primary" : "opacity-0 group-hover:opacity-100"
                        )}
                      />
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </Card>
          </aside>

          {/* Table of Contents - Mobile */}
          {tocOpen && (
            <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm lg:hidden">
              <div className="h-full overflow-auto p-4 pt-20">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">{t('legal.contents')}</h3>
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                          activeSection === section.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{section.title}</span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </nav>
                </Card>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Card className="p-8 md:p-12">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {children}
              </div>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
