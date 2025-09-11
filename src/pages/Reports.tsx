import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Printer, Share2, FileText, AlertTriangle, CheckCircle, Loader, ZoomIn, Palette, Shield, Wrench, LayoutGrid, Pencil, LogIn, LogOut, ArrowLeft, Home, Camera as CameraIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Property, InspectionPhoto } from '../types';
import { supabase, mapToProperty } from '../lib/supabase';
import ImageLightbox from '../components/common/ImageLightbox';
import { translateObjectCondition, translateSeverity, formatObjectDescription } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';
import { getSeverityStyle, getConditionStyle } from '../utils/styleUtils';
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
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast, updateToast } = useToast();
  const { inspectionId } = useParams<{ inspectionId: string }>();
  
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
      companyLogoUrl: profile?.company_logo_url || null,
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

      <div className="space-y-6 bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-lg" id="report-content">
        <header className="text-center border-b border-gray-200 dark:border-slate-700 pb-6 mb-6">
          {profile?.company_logo_url && (
            <img src={profile.company_logo_url} alt="Logo da Empresa" className="h-16 w-auto mb-4 mx-auto" />
          )}
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Relatório de Vistoria - {inspectionTypeLabel}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">{reportData.property.name}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
            <div className="text-gray-800 dark:text-gray-300">
                <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Empresa:</span>
                {profile?.companyName || 'Não informado'}
            </div>
            <div className="text-gray-800 dark:text-gray-300">
                <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Vistoriador:</span>
                {profile?.full_name || user?.email}
            </div>
            <div className="text-gray-800 dark:text-gray-300">
                <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Tipo do Imóvel:</span>
                {getPropertyTypeLabel(reportData.property.type)}
            </div>
            <div className="text-gray-800 dark:text-gray-300">
                <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Endereço:</span>
                {reportData.property.address}
            </div>
            <div className="text-gray-800 dark:text-gray-300">
                <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Data da Vistoria:</span>
                {format(reportData.generatedAt, 'dd/MM/yyyy', { locale: ptBR })}
            </div>
        </div>

        <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-6">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-2">Apontamentos da Vistoria</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            O presente relatório tem como objetivo registrar o estado de conservação e funcionamento do imóvel na data da vistoria, em conformidade com a Lei nº 8.245/91 (Lei do Inquilinato).
            <br />A vistoria foi realizada por observação visual, avaliando aspectos estéticos, acabamentos e funcionamento aparente do imóvel.
            <br />Não são contemplados neste relatório: análises estruturais, fundações, solidez da construção ou eventuais vícios ocultos que não sejam perceptíveis no momento da vistoria.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{rooms.length}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ambientes</p>
            </div>
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{reportData.photos.length}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fotos</p>
            </div>
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{totalIssues}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Problemas</p>
            </div>
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">{totalMissingItems}</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Itens Faltando</p>
            </div>
        </div>

        {rooms.map((roomName) => {
          const roomPhotos = reportData.photos.filter(p => p.room === roomName);
          return (
            <div key={roomName} className="pt-8 mt-8 border-t border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{roomName}</h2>
              <div className="space-y-8">
                {roomPhotos.map(photo => (
                  <div key={photo.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div 
                              className="relative w-full h-80 rounded-lg overflow-hidden group bg-slate-100 dark:bg-slate-900/50 cursor-pointer"
                              onClick={() => setLightboxImageUrl(photo.url)}
                          >
                              <img src={photo.url} alt={`Foto do ambiente ${photo.room}`} className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-8 h-8 text-white" />
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Descrição do Ambiente</h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{photo.analysisResult.description}</p>
                              </div>
                              {photo.analysisResult.objectsDetected?.length > 0 && (
                                  <div>
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center"><LayoutGrid className="w-4 h-4 mr-2 text-gray-500" />Objetos Identificados</h4>
                                      <div className="space-y-2">
                                          {photo.analysisResult.objectsDetected.map(object => (
                                              <div key={object.id} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-700 rounded-md">
                                                  <span className="text-gray-800 dark:text-gray-200">{formatObjectDescription(object)}</span>
                                                  <span className={`capitalize px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle(object.condition)}`}>{translateObjectCondition(object.condition)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              {photo.analysisResult.issues?.length > 0 && (
                                  <div>
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-gray-500" />Problemas Identificados</h4>
                                      <div className="space-y-2">
                                          {photo.analysisResult.issues.map(issue => (
                                              <div key={issue.id} className="p-3 border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-md">
                                                  <div className="flex items-center justify-between">
                                                      <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{issue.type}</span>
                                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(issue.severity)}`}>{translateSeverity(issue.severity)}</span>
                                                  </div>
                                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{issue.description}</p>
                                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Local: {issue.location}</p>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {reportData.general_observations && (
          <div className="pt-8 mt-8 border-t border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Observações Gerais</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reportData.general_observations}</p>
          </div>
        )}
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
