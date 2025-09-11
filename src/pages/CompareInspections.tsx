import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property, InspectionPhoto, DetectedObject } from '../types';
import { Loader, ArrowLeft, GitCompareArrows, Download, Printer, Share2, Settings, Check, X, CheckCircle, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import ComparisonItem from '../components/Compare/ComparisonItem';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';
import { generateComparisonReportHTML } from '../utils/generateComparisonReportHTML';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FullInspectionData {
  property: Property;
  photos: InspectionPhoto[];
  inspectionDate: Date;
}

interface ReportConfig {
  summary: boolean;
  rooms: { [roomName: string]: {
    changedItems: boolean;
    newItems: boolean;
    missingItems: boolean;
    unchangedItems: boolean;
  }};
}

const CompareInspections: React.FC = () => {
  const { entryInspectionId, exitInspectionId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast, updateToast } = useToast();
  const [entryData, setEntryData] = useState<FullInspectionData | null>(null);
  const [exitData, setExitData] = useState<FullInspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    summary: true,
    rooms: {}
  });

  const { handlePrint, handleShare } = useReportActions();

  const handleDownloadPdf = () => {
    if (!entryData || !exitData) {
      addToast('Dados do relatório não estão prontos.', 'error');
      return;
    }
    const toastId = addToast('Gerando relatório...', 'loading');

    const userProfile = {
      inspectorName: profile?.full_name || user?.email || null,
      companyName: entryData.property.companyName || profile?.company_name || null,
      companyLogoUrl: entryData.property.companyLogoUrl || profile?.company_logo_url || null,
    };

    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write('<html><head><title>Gerando Relatório...</title></head><body><h1>Aguarde, preparando seu relatório...</h1></body></html>');
      
      setTimeout(() => {
        try {
          const htmlContent = generateComparisonReportHTML(entryData, exitData, reportConfig, userProfile);
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

  const fetchInspectionData = useCallback(async (inspectionId: string): Promise<FullInspectionData | null> => {
    if (!user) return null;
    const { data: inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .select('*, properties!inner(*)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspectionData) {
      console.error(`Error fetching inspection ${inspectionId}:`, inspectionError);
      return null;
    }

    const { data: photosData, error: photosError } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    if (photosError) {
      console.error(`Error fetching photos for inspection ${inspectionId}:`, photosError);
      return null;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_property_details_by_id', { p_id: inspectionData.property_id });

    if (rpcError || !rpcData || rpcData.length === 0) {
      console.error('Error fetching property details via RPC:', rpcError);
      return null;
    }

    return {
      property: mapToProperty(rpcData[0] as any) as Property,
      photos: photosData.map(p => ({
        id: p.id,
        url: p.photo_url,
        room: p.room,
        analysisResult: p.ai_analysis_result,
        uploadedAt: new Date(p.created_at)
      })),
      inspectionDate: new Date(inspectionData.created_at),
    };
  }, [user]);

  const initializeReportConfig = useCallback((rooms: string[]) => {
    const roomConfig: { [roomName: string]: any } = {};
    rooms.forEach(room => {
      roomConfig[room] = {
        changedItems: true,
        newItems: true,
        missingItems: true,
        unchangedItems: true
      };
    });
    setReportConfig({
      summary: true,
      rooms: roomConfig
    });
  }, []);

  const loadAllData = useCallback(async (showLoading = true) => {
    if (!entryInspectionId || !exitInspectionId) {
      if (showLoading) setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const [entry, exit] = await Promise.all([
      fetchInspectionData(entryInspectionId),
      fetchInspectionData(exitInspectionId)
    ]);
    setEntryData(entry);
    setExitData(exit);
    
    if (entry && exit) {
      const allRooms = [...new Set([...entry.photos.map(p => p.room), ...exit.photos.map(p => p.room)])];
      initializeReportConfig(allRooms);
    }
    
    if (showLoading) setLoading(false);
  }, [entryInspectionId, exitInspectionId, fetchInspectionData, initializeReportConfig]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const handleFocus = () => loadAllData(false);
    const handleVisibilityChange = () => {
      if (!document.hidden) loadAllData(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllData]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">Gerando relatório comparativo...</h3>
        <p className="text-gray-600 dark:text-gray-400">Aguarde enquanto buscamos os dados das vistorias.</p>
      </div>
    );
  }

  if (!entryData || !exitData) {
    return (
      <div className="text-center py-12">
        <GitCompareArrows className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">Erro ao carregar dados</h2>
        <p className="text-gray-600 dark:text-gray-400">Não foi possível carregar os dados para uma ou ambas as vistorias. Verifique se os IDs são válidos.</p>
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline mt-4 inline-block">Voltar para o Dashboard</button>
      </div>
    );
  }

  const allRooms = [...new Set([...entryData.photos.map(p => p.room), ...exitData.photos.map(p => p.room)])];

  const getComparisonData = (room: string) => {
    const entryObjects = entryData.photos
      .filter(p => p.room === room)
      .flatMap(p => (p.analysisResult.objectsDetected || []).map(obj => ({ ...obj, photoUrl: p.url })));
      
    const exitObjects = exitData.photos
      .filter(p => p.room === room)
      .flatMap(p => (p.analysisResult.objectsDetected || []).map(obj => ({ ...obj, photoUrl: p.url })));

    const exitRoomPhoto = exitData.photos.find(p => p.room === room)?.url;
    const entryRoomPhoto = entryData.photos.find(p => p.room === room)?.url;

    const pairedItems: { entry: DetectedObject, exit: DetectedObject }[] = [];
    const newItems: DetectedObject[] = [];
    const missingItems: DetectedObject[] = [...entryObjects];

    exitObjects.forEach(exitObj => {
      if (exitObj.condition === 'not_found') return;

      const bestMatchIndex = missingItems.findIndex(entryObj => 
        entryObj.item.toLowerCase().trim() === exitObj.item.toLowerCase().trim()
      );

      if (bestMatchIndex > -1) {
        const entryObj = missingItems.splice(bestMatchIndex, 1)[0];
        pairedItems.push({ entry: entryObj, exit: exitObj });
      } else {
        newItems.push(exitObj);
      }
    });

    const changedItems = pairedItems.filter(p => p.entry.condition !== p.exit.condition);
    const unchangedItems = pairedItems.filter(p => p.entry.condition === p.exit.condition);

    const missingItemsWithContext = missingItems.map(item => ({
      entry: item,
      exitPhotoUrl: exitRoomPhoto
    }));

    const newItemsWithContext = newItems.map(item => ({
      exit: item,
      entryPhotoUrl: entryRoomPhoto
    }));

    return { changedItems, unchangedItems, newItems: newItemsWithContext, missingItems: missingItemsWithContext };
  };

  const totalChanges = allRooms.reduce((acc, room) => {
    const data = getComparisonData(room);
    acc.changed += data.changedItems.length;
    acc.new += data.newItems.length;
    acc.missing += data.missingItems.length;
    return acc;
  }, { changed: 0, new: 0, missing: 0 });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Relatório Comparativo
            <GitCompareArrows className="w-6 h-6 text-blue-500" />
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowConfigPanel(true)} title="Configurar Relatório" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Configurar</span>
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

      <div id="report-content" className="space-y-8">
        <header className="text-center border-b border-gray-200 dark:border-slate-700 pb-6 mb-6 print:block hidden">
          {entryData.property.companyLogoUrl && <img src={entryData.property.companyLogoUrl} alt="Logo" className="h-16 w-auto mb-4 mx-auto rounded-full" />}
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Relatório Comparativo de Vistorias</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">{entryData.property.name}</p>
        </header>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-slate-700 report-section">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Detalhes da Vistoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="text-gray-800 dark:text-gray-300">
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Empresa:</span>
                  {entryData.property.companyName || 'Não informado'}
              </div>
              <div className="text-gray-800 dark:text-gray-300">
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Vistoriador:</span>
                  {profile?.full_name || user?.email}
              </div>
              <div className="text-gray-800 dark:text-gray-300">
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Imóvel:</span>
                  {entryData.property.name}
              </div>
              <div className="text-gray-800 dark:text-gray-300">
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Endereço:</span>
                  {entryData.property.address}
              </div>
              <div className="text-gray-800 dark:text-gray-300">
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Data da Entrada:</span>
                  {format(entryData.inspectionDate, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              <div className="text-gray-800 dark:text-gray-300">
                  <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">Data da Saída:</span>
                  {format(exitData.inspectionDate, 'dd/MM/yyyy', { locale: ptBR })}
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
        </div>

        {reportConfig.summary && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-slate-700 report-section">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Resumo das Diferenças</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg">
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{totalChanges.changed}</p>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Itens com Condição Alterada</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{totalChanges.new}</p>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Itens Novos na Saída</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">{totalChanges.missing}</p>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Itens Faltando na Saída</p>
              </div>
            </div>
          </div>
        )}

        {allRooms.map(room => {
          const { changedItems, unchangedItems, newItems, missingItems } = getComparisonData(room);
          const roomConfig = reportConfig.rooms[room];
          if (!roomConfig) return null;

          const shouldRenderRoom = (roomConfig.changedItems && changedItems.length > 0) ||
                                   (roomConfig.newItems && newItems.length > 0) ||
                                   (roomConfig.missingItems && missingItems.length > 0) ||
                                   (roomConfig.unchangedItems && unchangedItems.length > 0);
          if (!shouldRenderRoom) return null;

          return (
            <div key={room} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-slate-700 report-room-container">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-slate-700 pb-3 mb-4">{room}</h2>
              <div className="space-y-4">
                {roomConfig.changedItems && changedItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-yellow-600 dark:text-yellow-400 mb-2 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" />Itens com Condição Alterada</h3>
                    <div className="space-y-2">{changedItems.map(p => <ComparisonItem key={p.entry.id} item={p} type="changed" />)}</div>
                  </div>
                )}
                {roomConfig.newItems && newItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-green-600 dark:text-green-400 mb-2 flex items-center"><PlusCircle className="w-5 h-5 mr-2" />Itens Novos na Saída</h3>
                    <div className="space-y-2">{newItems.map(p => <ComparisonItem key={p.exit.id} item={p} type="new" />)}</div>
                  </div>
                )}
                {roomConfig.missingItems && missingItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-red-600 dark:text-red-400 mb-2 flex items-center"><MinusCircle className="w-5 h-5 mr-2" />Itens Faltando na Saída</h3>
                    <div className="space-y-2">{missingItems.map(p => <ComparisonItem key={p.entry.id} item={p} type="missing" />)}</div>
                  </div>
                )}
                {roomConfig.unchangedItems && unchangedItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400 mb-2 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Itens Sem Alteração ({unchangedItems.length})</h3>
                    <div className="space-y-2">{unchangedItems.map(p => <ComparisonItem key={p.entry.id} item={p} type="unchanged" />)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showConfigPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfigPanel(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Configurar Relatório</h3>
                <button onClick={() => setShowConfigPanel(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Mostrar Resumo</span>
                  <input type="checkbox" checked={reportConfig.summary} onChange={e => setReportConfig(prev => ({ ...prev, summary: e.target.checked }))} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                </label>
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Mostrar seções por ambiente:</h4>
                  <div className="space-y-2">
                    {allRooms.map(room => (
                      <div key={room} className="p-3 border border-gray-200 dark:border-slate-700 rounded-md">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{room}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={reportConfig.rooms[room]?.changedItems} onChange={e => setReportConfig(prev => ({ ...prev, rooms: { ...prev.rooms, [room]: { ...prev.rooms[room], changedItems: e.target.checked } } }))} className="h-4 w-4 rounded text-yellow-500 focus:ring-yellow-400" /> Itens Alterados</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={reportConfig.rooms[room]?.newItems} onChange={e => setReportConfig(prev => ({ ...prev, rooms: { ...prev.rooms, [room]: { ...prev.rooms[room], newItems: e.target.checked } } }))} className="h-4 w-4 rounded text-green-500 focus:ring-green-400" /> Itens Novos</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={reportConfig.rooms[room]?.missingItems} onChange={e => setReportConfig(prev => ({ ...prev, rooms: { ...prev.rooms, [room]: { ...prev.rooms[room], missingItems: e.target.checked } } }))} className="h-4 w-4 rounded text-red-500 focus:ring-red-400" /> Itens Faltando</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={reportConfig.rooms[room]?.unchangedItems} onChange={e => setReportConfig(prev => ({ ...prev, rooms: { ...prev.rooms, [room]: { ...prev.rooms[room], unchangedItems: e.target.checked } } }))} className="h-4 w-4 rounded text-blue-500 focus:ring-blue-400" /> Itens Iguais</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                <button onClick={() => setShowConfigPanel(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompareInspections;
