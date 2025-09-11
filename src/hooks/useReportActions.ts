import { useToast } from '../contexts/ToastContext';

export const useReportActions = () => {
  const { addToast } = useToast();

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
          console.log('Share action was cancelled by the user.');
        } else {
          console.error('Error sharing:', error);
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  // The handleDownloadPdf function is now handled directly in each specific component
  // to allow for custom HTML generation based on the report type.

  return {
    handlePrint,
    handleShare,
  };
};
