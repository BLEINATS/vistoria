import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Printer, Share2, FileText, AlertTriangle, CheckCircle, Loader, ZoomIn, Palette, Shield, Wrench, LayoutGrid, Pencil, LogIn, LogOut, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Property, InspectionPhoto } from '../types';
import { supabase, mapToProperty } from '../lib/supabase';
import ImageLightbox from '../components/common/ImageLightbox';
import { translateObjectCondition, translateSeverity, translateRoomCondition, formatOptionalField, formatObjectDescription } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';
import { getSeverityStyle } from '../utils/styleUtils';
import { generateSingleReportHTML } from '../utils/generateSingleReportHTML';
import { useToast } from '../contexts/ToastContext';

interface ReportData {
  property: Property;
  photos: InspectionPhoto[];
  generatedAt: Date;
  inspection_type: 'entry' | 'exit';
  general_observations: string | null;
}

const Reports: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast, updateToast } = useToast();
  const { inspectionId } = location.state || {};
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  
  const { handlePrint, handleShare } = useReportActions();

  const handleDownloadPdf = () => {
    if (!reportData) {
      addToast('Dados do relatório não estão prontos.', 'error');
      return;
    }
    const toastId = addToast('Gerando relatório...', 'loading');

    const userProfile = {
      inspectorName: profile?.full_name || user?.email || null,
      companyName: profile?.company_name || null,
      companyLogoUrl: profile?.avatar_url || null,
    };

    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write('<html><head><title>Gerando Relatório...</title></head><body><h1>Aguarde, preparando seu relatório...</h1></body></html>');
      
      setTimeout(() => {
        try {
          const htmlContent = generateSingleReportHTML(reportData, userProfile);
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          printWindow.location.href = url;

          // Cleanup the object URL after a short delay
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          updateToast(toastId, 'Relatório pronto para impressão.', 'success');

        } catch (error: any) {
          console.error('Error generating PDF content:', error);
          printWindow.close();
          updateToast(toastId, `Falha ao gerar o conteúdo do PDF: ${error.message}`, 'error');
        }
      }, 50);
    } else {
      updateToast(toastId, 'Não foi possível abrir a janela de impressão. Verifique se seu navegador está bloqueando pop-ups.', 'error');
    }
  };

  const fetchReportData = useCallback(async (showLoading = true) => {
    if (!inspectionId || !user) {
      if (showLoading) setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);

    const { data: inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .select('*, properties!inner(*)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspectionData) {
      console.error('Error fetching inspection:', inspectionError);
      if (showLoading) setLoading(false);
      return;
    }

    const { data: photosData, error: photosError } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      if (showLoading) setLoading(false);
      return;
    }

    const property = mapToProperty(inspectionData.properties as any);
    if (!property) {
      console.error('Failed to map property data');
      if (showLoading) setLoading(false);
      return;
    }
    const photos: InspectionPhoto[] = photosData.map(p => ({
      id: p.id,
      url: p.photo_url,
      room: p.room,
      analysisResult: p.ai_analysis_result,
      uploadedAt: new Date(p.created_at)
    }));

    setReportData({
      property,
      photos,
      generatedAt: new Date(inspectionData.created_at),
      inspection_type: inspectionData.inspection_type,
      general_observations: inspectionData.general_observations,
    });

    if (showLoading) setLoading(false);
  }, [inspectionId, user]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  useEffect(() => {
    const handleFocus = () => fetchReportData(false);
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchReportData(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchReportData]);

  const handleEditInspection = () => {
    if (!reportData) return;
    navigate('/inspection', {
      state: {
        property: reportData.property,
        inspectionType: reportData.inspection_type,
        inspectionId: inspectionId,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">Gerando relatório...</h3>
        <p className="text-gray-600 dark:text-gray-400">Aguarde enquanto buscamos os dados da vistoria.</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">Nenhum relatório disponível</h2>
        <p className="text-gray-600 dark:text-gray-400">Complete uma vistoria para gerar relatórios ou verifique se o ID da vistoria é válido.</p>
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline mt-4 inline-block">Voltar para o Dashboard</button>
      </div>
    );
  }

  const getPropertyTypeLabel = (type: string) => {
    const types = {
      apartment: 'Apartamento',
      house: 'Casa',
      commercial_room: 'Sala Comercial',
      office: 'Escritório',
      store: 'Loja',
      warehouse: 'Galpão',
      land: 'Terreno'
    };
    return types[type as keyof typeof types] || type;
  };

  const totalIssues = reportData.photos.reduce((acc, photo) => 
    acc + (photo.analysisResult.issues?.length || 0), 0
  );
  
  const totalMissingItems = reportData.photos.reduce((acc, photo) => 
    acc + (photo.analysisResult.objectsDetected?.filter(obj => obj.condition === 'not_found').length || 0), 0
  );

  const criticalIssues = reportData.photos.reduce((acc, photo) => 
    acc + (photo.analysisResult.issues?.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    ).length || 0), 0
  );

  const averageCondition = reportData.photos.length > 0 ? reportData.photos.reduce((acc, photo) => {
    const conditionScore = {
      'excellent': 5,
      'good': 4,
      'fair': 3,
      'poor': 2
    };
    return acc + (conditionScore[photo.analysisResult.roomCondition as keyof typeof conditionScore] || 3);
  }, 0) / reportData.photos.length : 0;

  const getConditionText = (score: number) => {
    if (score >= 4.5) return 'Excelente';
    if (score >= 3.5) return 'Bom';
    if (score >= 2.5) return 'Regular';
    return 'Precisa de atenção';
  };

  const rooms = [...new Set(reportData.photos.map(p => p.room))];
  const inspectionTypeLabel = reportData.inspection_type === 'entry' ? 'Entrada' : 'Saída';
  const TypeIcon = reportData.inspection_type === 'entry' ? LogIn : LogOut;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Relatório de Vistoria - {inspectionTypeLabel}
            <TypeIcon className="w-6 h-6 text-blue-500" />
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerado em {format(reportData.generatedAt, 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <button onClick={handleEditInspection} title="Editar Vistoria" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Pencil className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </button>
          <button onClick={handleShare} title="Compartilhar" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Share2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button onClick={handlePrint} title="Imprimir" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Printer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button onClick={handleDownloadPdf} title="Download PDF" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>
      </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-lg">
        {/* Report content */}
      </div>
      {lightboxImageUrl && (
        <ImageLightbox
          isOpen={!!lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
          imageUrl={lightboxImageUrl}
        />
      )}
    </div>
  );
};

export default Reports;
