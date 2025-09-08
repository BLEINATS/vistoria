import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Printer, Share2, FileText, AlertTriangle, CheckCircle, Loader, ZoomIn, Palette, Shield, Wrench, LayoutGrid, Pencil, LogIn, LogOut, ArrowLeft, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Property, InspectionPhoto } from '../types';
import { supabase, mapToProperty } from '../lib/supabase';
import ImageLightbox from '../components/common/ImageLightbox';
import { translateObjectCondition, translateSeverity, translateRoomCondition, formatOptionalField, formatObjectDescription } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';
import { getSeverityStyle } from '../utils/styleUtils';

interface ReportData {
  property: Property;
  photos: InspectionPhoto[];
  generatedAt: Date;
  inspectorName: string | null;
  inspection_type: 'entry' | 'exit';
  general_observations: string | null;
}

const Reports: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { inspectionId } = location.state || {};
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const { handlePrint, handleShare, handleDownloadPdf } = useReportActions(reportRef);

  const fetchReportData = useCallback(async () => {
    if (!inspectionId || !user) {
      setLoading(false);
      return;
    }

    const { data: inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .select('*, properties!inner(*)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspectionData) {
      console.error('Error fetching inspection:', inspectionError);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', (inspectionData.properties as any).user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for report:', profileError);
    }

    const { data: photosData, error: photosError } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      setLoading(false);
      return;
    }

    const property = mapToProperty(inspectionData.properties as any, profileData?.full_name);
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
      inspectorName: profileData?.full_name || user.email,
      inspection_type: inspectionData.inspection_type,
      general_observations: inspectionData.general_observations,
    });

    setLoading(false);
  }, [inspectionId, user]);

  useEffect(() => {
    fetchReportData();
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
          Voltar para Detalhes do Imóvel
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

      <div ref={reportRef} className="space-y-6 bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-lg">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-section">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resumo da Vistoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reportData.photos.length}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Fotos Analisadas</div>
            </div>
            {reportData.inspection_type === 'exit' ? (
              <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMissingItems}</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Itens Não Encontrados</div>
              </div>
            ) : (
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalIssues}</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Problemas Encontrados</div>
              </div>
            )}
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalIssues}</div>
              <div className="text-sm text-red-600 dark:text-red-400">Críticos/Altos</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{getConditionText(averageCondition)}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Condição Geral</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-section">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Dados do Imóvel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-300">
              <div><p><strong>Nome:</strong> {reportData.property.name}</p></div>
              <div><p><strong>Tipo:</strong> {getPropertyTypeLabel(reportData.property.type)}</p></div>
              <div className="md:col-span-2"><p><strong>Endereço:</strong> {reportData.property.address}</p></div>
              <div><p><strong>Vistoriador:</strong> {reportData.inspectorName}</p></div>
          </div>
        </div>
        
        {reportData.general_observations && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-section">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Observações Gerais da Vistoria</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reportData.general_observations}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-section">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Análises Detalhadas por Ambiente</h2>
          <div className="space-y-8">
            {rooms.map((roomName, roomIndex) => (
              <div key={roomIndex} className="border-b border-gray-200 dark:border-slate-700 pb-6 last:border-b-0 report-room-container">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{roomName}</h3>
                <div className="space-y-6">
                  {reportData.photos.filter(p => p.room === roomName).map((photo) => (
                    <div key={photo.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 report-photo-analysis">
                      <div 
                        className="relative w-full rounded-lg overflow-hidden cursor-pointer group bg-slate-100 dark:bg-slate-900/50 report-image-container"
                        onClick={() => setLightboxImageUrl(photo.url)}
                      >
                        <img 
                          src={photo.url} 
                          alt={`Ambiente ${photo.room}`} 
                          className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105 report-image"
                        />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <ZoomIn className="w-8 h-8 text-white" />
                        </div>
                        {photo.analysisResult.objectsDetected.map(obj => 
                          obj.markerCoordinates && (
                            <div 
                              key={`marker-${obj.id}`}
                              className="absolute"
                              style={{ left: `${obj.markerCoordinates.x}%`, top: `${obj.markerCoordinates.y}%`, transform: 'translate(-50%, -100%)' }}
                              title={obj.item}
                            >
                              <div className="relative">
                                <MapPin className="w-6 h-6 text-red-500 drop-shadow-lg" fill="currentColor" />
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{obj.item}</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-gray-500"/>Descrição do Ambiente</h4>
                          <p className="text-gray-700 dark:text-gray-300">{photo.analysisResult.description}</p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><LayoutGrid className="w-4 h-4 mr-2 text-gray-500"/>Objetos Identificados</h4>
                          {photo.analysisResult.objectsDetected?.map((object, index) => (
                            <div key={object.id || `object-${index}`} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-slate-700/50 rounded-md">
                              <span className="text-gray-800 dark:text-gray-200">{formatObjectDescription(object)}</span>
                              <span className={`capitalize px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(object.condition)}`}>{translateObjectCondition(object.condition)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><Palette className="w-4 h-4 mr-2 text-gray-500"/>Acabamentos</h4>
                          {photo.analysisResult.finishes?.map((finish, index) => (
                            <div key={finish.id || `finish-${index}`} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-slate-700/50 rounded-md">
                              <span className="text-gray-800 dark:text-gray-200 capitalize">{finish.element}: {formatOptionalField(finish.material)} ({formatOptionalField(finish.color)})</span>
                              <span className={`capitalize px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(finish.condition)}`}>{translateObjectCondition(finish.condition)}</span>
                            </div>
                          ))}
                        </div>

                        {photo.analysisResult.issues?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-gray-500"/>Problemas Identificados</h4>
                            {photo.analysisResult.issues.map((issue, index) => (
                              <div key={issue.id || `issue-${index}`} className="p-3 border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 rounded-md">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{issue.type}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(issue.severity)}`}>{translateSeverity(issue.severity)}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{issue.description}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Local: {issue.location}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><Shield className="w-4 h-4 mr-2 text-gray-500"/>Segurança</h4>
                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                              <p><strong>Fechaduras:</strong> {formatOptionalField(photo.analysisResult.safety?.locks)}</p>
                              <p><strong>Elétrica:</strong> {formatOptionalField(photo.analysisResult.safety?.electrical)}</p>
                              {photo.analysisResult.safety?.hazards?.map((hazard, i) => <p key={i}><strong>Risco:</strong> {hazard}</p>)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><Wrench className="w-4 h-4 mr-2 text-gray-500"/>Recomendações de Manutenção</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                              {photo.analysisResult.maintenanceRecommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
                          </ul>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-section">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Conclusões e Recomendações</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Resumo Geral</h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm">O imóvel apresenta condição geral {getConditionText(averageCondition).toLowerCase()}, com {totalIssues} problema(s) identificado(s), sendo {criticalIssues} de alta prioridade.</p>
            </div>
            {criticalIssues > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <h3 className="font-medium text-red-900 dark:text-red-300 mb-2">Ações Prioritárias</h3>
                <p className="text-red-800 dark:text-red-200 text-sm">Recomenda-se atenção especial aos problemas classificados como críticos ou de alta severidade.</p>
              </div>
            )}
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Observações</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">Este relatório foi gerado automaticamente. Recomenda-se validação presencial por profissional qualificado.</p>
            </div>
          </div>
        </div>
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
