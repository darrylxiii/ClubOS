import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlacementFee } from '@/hooks/useFinancialData';
import { PlacementFeeWithContext } from '@/hooks/usePlacementFeesWithContext';
import { toast } from 'sonner';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceGeneratorProps {
  fees: (PlacementFee | PlacementFeeWithContext)[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceGenerator({ fees, open, onOpenChange }: InvoiceGeneratorProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(`TQC-${format(new Date(), 'yyyyMMdd')}-001`);
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);

  const totalNet = fees.reduce((sum, f) => sum + f.fee_amount, 0);
  const vatRate = 0.21;
  const vatAmount = totalNet * vatRate;
  const totalGross = totalNet + vatAmount;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('The Quantum Club', 20, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Talent Platform', 20, 32);

      // Invoice details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 150, 25);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice #: ${invoiceNumber}`, 150, 33);
      doc.text(`Date: ${format(new Date(), 'dd MMMM yyyy')}`, 150, 39);
      doc.text(`Due: ${format(new Date(Date.now() + parseInt(paymentTerms) * 86400000), 'dd MMMM yyyy')}`, 150, 45);

      // Line separator
      doc.setDrawColor(200);
      doc.line(20, 55, 190, 55);

      // Table
      const tableBody = fees.map((fee, idx) => {
        const ctx = fee as PlacementFeeWithContext;
        return [
          String(idx + 1),
          `Placement Fee: ${ctx.job_title || 'N/A'} at ${ctx.company_name || 'N/A'}`,
          `${fee.fee_percentage}%`,
          formatCurrency(fee.candidate_salary),
          formatCurrency(fee.fee_amount),
        ];
      });

      autoTable(doc, {
        startY: 62,
        head: [['#', 'Description', 'Rate', 'Base Salary', 'Amount']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [14, 14, 16], textColor: [245, 244, 239] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 80 },
          4: { halign: 'right' },
        },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      const totalsY = finalY + 15;
      doc.setFontSize(9);
      doc.text('Subtotal (excl. VAT):', 130, totalsY);
      doc.text(formatCurrency(totalNet), 185, totalsY, { align: 'right' });
      doc.text('BTW (21%):', 130, totalsY + 7);
      doc.text(formatCurrency(vatAmount), 185, totalsY + 7, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Total:', 130, totalsY + 16);
      doc.text(formatCurrency(totalGross), 185, totalsY + 16, { align: 'right' });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('The Quantum Club B.V. • KVK: XXXXXXXX • BTW: NLXXXXXXXXB01', 20, 280);
      doc.text(`Payment terms: ${paymentTerms} days net`, 20, 285);

      doc.save(`invoice-${invoiceNumber}.pdf`);
      toast.success('Invoice PDF generated and downloaded.');
      onOpenChange(false);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate invoice PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription>
            Create a PDF invoice for {fees.length} placement fee{fees.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment Terms (days)</Label>
            <Input type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>

          <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(totalNet)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BTW (21%)</span>
              <span>{formatCurrency(vatAmount)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t">
              <span>Total</span>
              <span>{formatCurrency(totalGross)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
