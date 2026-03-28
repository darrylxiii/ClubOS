import { useCallback } from 'react';

/**
 * Hook to generate a PDF from the current legal page using the browser's native print dialog.
 * This avoids heavy dependencies while giving users a proper "Save as PDF" experience.
 * 
 * For a more automated approach, consider a Supabase Edge Function with Puppeteer.
 */
export function useLegalPdfExport() {
  const exportPdf = useCallback((documentTitle: string) => {
    // Store original title
    const originalTitle = document.title;
    
    // Set the document title to the legal doc name (browsers use this as the PDF filename)
    document.title = `${documentTitle} - The Quantum Club`;
    
    // Hide non-legal content for clean printing
    const style = document.createElement('style');
    style.id = 'legal-print-styles';
    style.textContent = `
      @media print {
        /* Hide navigation, sidebars, cookie banners, etc */
        nav, header, footer, 
        [data-sidebar], [data-mobile-nav], 
        [data-cookie-banner], [data-toc-sidebar],
        .mobile-toc-trigger,
        button:not(.print-visible) {
          display: none !important;
        }
        
        /* Make legal content full width */
        main {
          margin: 0 !important;
          padding: 20px !important;
          max-width: 100% !important;
        }
        
        /* Clean page breaks */
        .legal-section {
          page-break-inside: avoid;
        }
        
        /* Ensure readable text */
        body {
          font-size: 12pt !important;
          color: #000 !important;
          background: #fff !important;
        }
        
        /* Show link URLs */
        a[href]::after {
          content: " (" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }
        
        /* Hide internal links */
        a[href^="#"]::after,
        a[href^="/"]::after {
          content: "";
        }
      }
    `;
    document.head.appendChild(style);
    
    // Trigger browser print dialog (user can choose "Save as PDF")
    window.print();
    
    // Cleanup after a short delay
    setTimeout(() => {
      document.title = originalTitle;
      const printStyle = document.getElementById('legal-print-styles');
      if (printStyle) printStyle.remove();
    }, 1000);
  }, []);

  return { exportPdf };
}
