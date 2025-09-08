import { useRef } from 'react';
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
    
    // Force light mode for PDF generation to ensure correct styling
    if (wasDarkMode) {
      document.documentElement.classList.remove('dark');
    }

    try {
      // Allow a moment for styles to re-render in light mode
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;

      const imgHeightInPdf = pdfWidth / canvasAspectRatio;

      let heightLeft = imgHeightInPdf;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`relatorio-vistoria-${Date.now()}.pdf`);
      updateToast(toastId, 'PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      updateToast(toastId, 'Falha ao gerar o PDF.', 'error');
    } finally {
      // Restore original theme
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
