import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '../contexts/ToastContext';

export const useReportActions = (reportRef: React.RefObject<HTMLDivElement>) => {
  const { addToast, updateToast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const reportUrl = window.location.href;
    const reportTitle = document.title;

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(reportUrl);
        addToast('Link do relatório copiado para a área de transferência!', 'success');
      } catch (copyError) {
        console.error('Error copying to clipboard:', copyError);
        addToast('Não foi possível copiar o link.', 'error');
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: reportTitle,
          text: `Confira o relatório de vistoria: ${reportTitle}`,
          url: reportUrl,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // User cancelled the share action, do nothing.
          console.log('Share action was cancelled by the user.');
        } else if (error instanceof DOMException && error.name === 'NotAllowedError') {
          // Permission denied, fall back to clipboard.
          console.warn('Share API permission denied, falling back to clipboard.');
          copyToClipboard();
        } else {
          // Other unexpected error.
          console.error('Error sharing:', error);
          addToast('Não foi possível compartilhar o relatório.', 'error');
        }
      }
    } else {
      // Fallback for browsers that don't support navigator.share at all.
      copyToClipboard();
    }
  };

  const handleDownloadPdf = async () => {
    const reportElement = reportRef.current;
    if (!reportElement) {
      addToast('Erro: Não foi possível encontrar o conteúdo do relatório.', 'error');
      return;
    }

    const toastId = addToast('Gerando PDF...', 'loading');
    
    const wasDarkMode = document.documentElement.classList.contains('dark');
    
    // Force light mode and enable PDF-specific styling
    if (wasDarkMode) {
      document.documentElement.classList.remove('dark');
    }
    
    // Add PDF render mode class to apply special PDF styling
    document.documentElement.classList.add('pdf-render-mode');

    try {
      // Allow time for styles to re-render in light mode with PDF styles
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Force a scroll to top to ensure consistent capture
      reportElement.scrollTo(0, 0);

      // Optimize PDF generation settings for better image quality and layout
      const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher scale for better image quality now that containers are sized properly
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        // Improve image rendering quality
        imageTimeout: 15000,
        removeContainer: true,
        foreignObjectRendering: false,
        // Better handling of CSS and images
        logging: false,
        ignoreElements: (element) => {
          // Skip elements that might cause layout issues in PDF
          return element.classList.contains('no-print') || 
                 element.classList.contains('print-hidden') ||
                 element.tagName === 'BUTTON' ||
                 element.classList.contains('sticky');
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG with high quality for smaller file size
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true, // Enable compression for smaller file size
      });

      // Simple and clean PDF generation approach
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit width with 20pt margins
      const margin = 20;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      // Scale to fit width perfectly
      const scale = availableWidth / canvas.width;
      const scaledHeight = canvas.height * scale;
      
      // If content fits on one page, center it
      if (scaledHeight <= availableHeight) {
        const yPosition = margin + ((availableHeight - scaledHeight) / 2);
        pdf.addImage(imgData, 'JPEG', margin, yPosition, availableWidth, scaledHeight);
      } else {
        // Intelligent multi-page pagination - avoid cutting elements
        const getSmartPageBreaks = (): number[] => {
          const breaks: number[] = [0]; // Start with first page at top
          
          // Find all elements that shouldn't be cut
          const protectedSelectors = '.report-section, .report-room-container, .report-photo-analysis';
          const protectedElements = reportElement.querySelectorAll(protectedSelectors);
          const elementBounds: { top: number, bottom: number }[] = [];
          
          // Calculate positions of protected elements in canvas coordinates
          const reportRect = reportElement.getBoundingClientRect();
          protectedElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const relativeTop = rect.top - reportRect.top;
            const relativeBottom = rect.bottom - reportRect.top;
            
            // Convert to canvas pixel coordinates
            const canvasTop = (relativeTop / reportElement.scrollHeight) * canvas.height;
            const canvasBottom = (relativeBottom / reportElement.scrollHeight) * canvas.height;
            
            elementBounds.push({
              top: canvasTop,
              bottom: canvasBottom
            });
          });
          
          // Sort elements by position
          elementBounds.sort((a, b) => a.top - b.top);
          
          let currentPageStart = 0;
          const maxPageHeight = availableHeight / scale; // Convert back to canvas pixels
          
          while (currentPageStart < canvas.height) {
            const idealPageEnd = currentPageStart + maxPageHeight;
            
            if (idealPageEnd >= canvas.height) {
              // Last page reached
              break;
            }
            
            // Find the best break point to avoid cutting elements
            let bestBreakPoint = idealPageEnd;
            
            // Look for elements that would be cut by the ideal break
            for (const element of elementBounds) {
              // If element spans across the ideal break point
              if (element.top < idealPageEnd && element.bottom > idealPageEnd) {
                // Always prefer breaking before the element
                const breakBefore = element.top;
                const contentBeforeBreak = breakBefore - currentPageStart;
                
                if (contentBeforeBreak > maxPageHeight * 0.3) { // At least 30% of page content
                  bestBreakPoint = breakBefore;
                  break;
                } else {
                  // Only break after if it doesn't exceed page limits
                  const breakAfter = element.bottom;
                  const pageHeightIfBreakAfter = breakAfter - currentPageStart;
                  
                  if (pageHeightIfBreakAfter <= maxPageHeight) {
                    bestBreakPoint = breakAfter;
                    break;
                  } else {
                    // Can't fit this element, look for previous safe break point
                    let safePreviousBreak = idealPageEnd;
                    for (let j = elementBounds.indexOf(element) - 1; j >= 0; j--) {
                      const prevElement = elementBounds[j];
                      if (prevElement.bottom <= idealPageEnd && 
                          (prevElement.bottom - currentPageStart) >= maxPageHeight * 0.3) {
                        safePreviousBreak = prevElement.bottom;
                        break;
                      }
                    }
                    bestBreakPoint = safePreviousBreak;
                    break;
                  }
                }
              }
            }
            
            // Always enforce maximum page height limit
            bestBreakPoint = Math.min(bestBreakPoint, currentPageStart + maxPageHeight);
            
            // Ensure we don't break inside any protected element
            for (const element of elementBounds) {
              if (bestBreakPoint > element.top && bestBreakPoint < element.bottom) {
                // We're inside an element, move to element boundary
                const distanceToTop = bestBreakPoint - element.top;
                const distanceToBottom = element.bottom - bestBreakPoint;
                
                if (distanceToTop < distanceToBottom && element.top >= currentPageStart) {
                  bestBreakPoint = element.top; // Move to start of element
                } else if (element.bottom - currentPageStart <= maxPageHeight) {
                  bestBreakPoint = element.bottom; // Move to end of element
                } else {
                  // Element is too big for page, break at ideal point (emergency fallback)
                  bestBreakPoint = Math.min(idealPageEnd, currentPageStart + maxPageHeight);
                }
                break;
              }
            }
            
            breaks.push(bestBreakPoint);
            currentPageStart = bestBreakPoint;
          }
          
          return breaks;
        };

        // Get intelligent page breaks
        const pageBreaks = getSmartPageBreaks();
        
        // Create pages based on intelligent breaks
        for (let i = 0; i < pageBreaks.length; i++) {
          if (i > 0) pdf.addPage();
          
          const pageStart = pageBreaks[i];
          const pageEnd = i < pageBreaks.length - 1 ? pageBreaks[i + 1] : canvas.height;
          const pageContentHeight = pageEnd - pageStart;
          
          // Create a slice of the original canvas for this page
          const sliceCanvas = document.createElement('canvas');
          const sliceCtx = sliceCanvas.getContext('2d')!;
          
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = pageContentHeight;
          
          // Fill with white background first
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, canvas.width, pageContentHeight);
          
          // Draw the appropriate slice from the original canvas
          sliceCtx.drawImage(
            canvas,
            0, pageStart, // source x, y
            canvas.width, pageContentHeight, // source width, height
            0, 0, // destination x, y
            canvas.width, pageContentHeight // destination width, height
          );
          
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
          const sliceHeight = pageContentHeight * scale;
          
          pdf.addImage(sliceData, 'JPEG', margin, margin, availableWidth, sliceHeight);
        }
      }
      
      pdf.save(`relatorio-vistoria-${Date.now()}.pdf`);
      updateToast(toastId, 'PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      updateToast(toastId, 'Falha ao gerar o PDF.', 'error');
    } finally {
      // Restore original theme and remove PDF render mode
      document.documentElement.classList.remove('pdf-render-mode');
      if (wasDarkMode) {
        document.documentElement.classList.add('dark');
      }
    }
  };

  return {
    handlePrint,
    handleShare,
    handleDownloadPdf,
  };
};
