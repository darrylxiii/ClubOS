import { ReactNode, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChevronRight, Menu, X } from "lucide-react";
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
}

export function LegalPageLayout({ title, lastUpdated, sections, children }: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Last Updated: {lastUpdated}</span>
          </div>
        </div>

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
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                Contents
              </h3>
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
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                    Contents
                  </h3>
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
