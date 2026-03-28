import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { useRole } from '@/contexts/RoleContext';
import { usePartnerBriefingData } from '@/hooks/usePartnerBriefingData';
import { PartnerPageHeader } from '@/components/partner/PartnerPageHeader';
import {
  BriefingSectionSelector,
  ALL_SECTIONS,
  type BriefingSectionId,
} from '@/components/partner/briefing/BriefingSectionSelector';
import { BriefingPreview } from '@/components/partner/briefing/BriefingPreview';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/PageLoader';
import { FileText, Download, CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExecutiveBriefing() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  // toast imported from sonner at top level
  const briefingData = usePartnerBriefingData();

  const [selected, setSelected] = useState<Set<BriefingSectionId>>(
    () => new Set(ALL_SECTIONS),
  );
  const [generating, setGenerating] = useState(false);

  // ── PDF download ───────────────────────────────────────────────
  const handleGeneratePDF = useCallback(async () => {
    if (selected.size === 0) {
      toast.error(t('briefing.noSectionsTitle', 'No sections selected'), {
        description: t('briefing.noSectionsDesc', 'Please select at least one section to include in the PDF.'),
      });
      return;
    }

    setGenerating(true);
    try {
      const { generateExecutiveBriefingPDF } = await import(
        '@/utils/executiveBriefingPDF'
      );
      const blob = await generateExecutiveBriefingPDF(briefingData, selected);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-briefing-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('briefing.pdfGenerated', 'Briefing PDF generated'), {
        description: t('briefing.pdfGeneratedDesc', 'Your executive briefing has been downloaded.'),
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error(t('briefing.pdfError', 'PDF generation failed'), {
        description: t('briefing.pdfErrorDesc', 'Something went wrong. Please try again.'),
      });
    } finally {
      setGenerating(false);
    }
  }, [briefingData, selected, t, toast]);

  // ── Guard: no company ──────────────────────────────────────────
  if (!companyId) {
    return (
      <EmptyState
        icon={FileText}
        title={t('briefing.noCompany', 'No company linked')}
        description={t(
          'briefing.noCompanyDesc',
          'Executive briefings will be available once your company profile is set up.',
        )}
      />
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (briefingData.isLoading) {
    return <PageLoader />;
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PartnerPageHeader
        title={t('briefing.title', 'Executive Briefing Deck')}
        subtitle={t(
          'briefing.subtitle',
          'Generate a board-ready hiring intelligence report for your clients.',
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="gap-2">
              <CalendarClock className="h-4 w-4" />
              {t('briefing.schedule', 'Schedule')}
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleGeneratePDF}
              disabled={generating || selected.size === 0}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('briefing.generatePDF', 'Generate PDF')}
            </Button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6"
      >
        {/* Left: section selector */}
        <div className="glass-card p-4 rounded-xl bg-card/30 backdrop-blur border border-border/20 h-fit lg:sticky lg:top-24">
          <h3 className="text-sm font-semibold mb-3 text-foreground">
            {t('briefing.includeSections', 'Include Sections')}
          </h3>
          <BriefingSectionSelector
            selected={selected}
            onChange={setSelected}
          />
        </div>

        {/* Right: live preview */}
        <div className="glass-card p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20 min-h-[400px]">
          <BriefingPreview data={briefingData} selected={selected} />
        </div>
      </motion.div>
    </div>
  );
}
