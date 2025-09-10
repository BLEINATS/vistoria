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
        // Multiple pages - split content evenly
        const pagesNeeded = Math.ceil(scaledHeight / availableHeight);
        const heightPerPage = canvas.height / pagesNeeded;
        
        for (let i = 0; i < pagesNeeded; i++) {
          if (i > 0) pdf.addPage();
          
          // Create a slice of the original canvas for this page
          const sliceCanvas = document.createElement('canvas');
          const sliceCtx = sliceCanvas.getContext('2d')!;
          
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = heightPerPage;
          
          // Draw the appropriate slice from the original canvas
          sliceCtx.drawImage(
            canvas,
            0, i * heightPerPage, // source x, y
            canvas.width, heightPerPage, // source width, height
            0, 0, // destination x, y
            canvas.width, heightPerPage // destination width, height
          );
          
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
          const sliceHeight = heightPerPage * scale;
          
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
