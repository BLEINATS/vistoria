import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property, InspectionPhoto, DetectedObject } from '../types';
import { Loader, ArrowLeft, GitCompareArrows, Download, Printer, Share2, Pencil, CheckCircle, PlusCircle, MinusCircle, Settings, Check, X } from 'lucide-react';
import ComparisonItem from '../components/Compare/ComparisonItem';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';

interface FullInspectionData {
  property: Property;
  photos: InspectionPhoto[];
  inspectionDate: Date;
  inspectorName: string | null;
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
  const { user } = useAuth();
  const [entryData, setEntryData] = useState<FullInspectionData | null>(null);
  const [exitData, setExitData] = useState<FullInspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    summary: true,
    rooms: {}
  });

  const reportRef = useRef<HTMLDivElement>(null);
  const { handlePrint, handleShare, handleDownloadPdf } = useReportActions(reportRef as any);

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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', (inspectionData.properties as any).user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for comparison:', profileError);
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

    return {
      property: mapToProperty(inspectionData.properties as any, profileData?.full_name) as Property,
      photos: photosData.map(p => ({
        id: p.id,
        url: p.photo_url,
        room: p.room,
        analysisResult: p.ai_analysis_result,
        uploadedAt: new Date(p.created_at)
      })),
      inspectionDate: new Date(inspectionData.inspection_date),
      inspectorName: profileData?.full_name || user.email,
    };
  }, [user]);

  // Initialize report configuration with all items checked by default
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

  useEffect(() => {
    const loadAllData = async () => {
      if (!entryInspectionId || !exitInspectionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [entry, exit] = await Promise.all([
        fetchInspectionData(entryInspectionId),
        fetchInspectionData(exitInspectionId)
      ]);
      setEntryData(entry);
      setExitData(exit);
      
      // Initialize report config after data is loaded
      if (entry && exit) {
        const allRooms = [...new Set([...entry.photos.map(p => p.room), ...exit.photos.map(p => p.room)])];
        initializeReportConfig(allRooms);
      }
      
      setLoading(false);
    };
    loadAllData();
  }, [entryInspectionId, exitInspectionId, fetchInspectionData, initializeReportConfig]);
  
  const handleEditEntry = () => {
    if (!entryData) return;
    navigate('/inspection', {
      state: {
        property: entryData.property,
        inspectionType: 'entry',
        inspectionId: entryInspectionId,
      },
    });
  };

  const handleEditExit = () => {
    if (!exitData) return;
    navigate('/inspection', {
      state: {
        property: exitData.property,
        inspectionType: 'exit',
        inspectionId: exitInspectionId,
      },
    });
  };

  const toggleReportSection = (section: 'summary' | string, subsection?: string) => {
    setReportConfig(prev => {
      if (section === 'summary') {
        return { ...prev, summary: !prev.summary };
      } else if (subsection) {
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [section]: {
              ...prev.rooms[section],
              [subsection]: !prev.rooms[section]?.[subsection as keyof typeof prev.rooms[string]]
            }
          }
        };
      } else {
        // Toggle entire room
        const roomConfig = prev.rooms[section];
        const allChecked = roomConfig?.changedItems && roomConfig?.newItems && roomConfig?.missingItems && roomConfig?.unchangedItems;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [section]: {
              changedItems: !allChecked,
              newItems: !allChecked,
              missingItems: !allChecked,
              unchangedItems: !allChecked
            }
          }
        };
      }
    });
  };

  const selectAll = () => {
    const allRooms = [...new Set([...entryData?.photos.map(p => p.room) || [], ...exitData?.photos.map(p => p.room) || []])];
    initializeReportConfig(allRooms);
  };

  const deselectAll = () => {
    setReportConfig({
      summary: false,
      rooms: Object.keys(reportConfig.rooms).reduce((acc, room) => {
        acc[room] = {
          changedItems: false,
          newItems: false,
          missingItems: false,
          unchangedItems: false
        };
        return acc;
      }, {} as any)
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">Carregando dados para comparação...</h3>
      </div>
    );
  }

  if (!entryData || !exitData) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium">Não foi possível carregar os dados da vistoria.</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mt-4 inline-block">Voltar</button>
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

    const pairedItems: { entry: DetectedObject, exit: DetectedObject }[] = [];
    const newItems: DetectedObject[] = [];
    const missingItems: DetectedObject[] = [...entryObjects];

    exitObjects.forEach(exitObj => {
      const bestMatchIndex = missingItems.findIndex(entryObj => 
        entryObj.item === exitObj.item
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

    return { changedItems, unchangedItems, newItems, missingItems };
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between no-print">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 sm:mb-0">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button onClick={() => setShowConfigPanel(!showConfigPanel)} title="Configurar Relatório" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Configurar</span>
          </button>
          <button onClick={handleEditEntry} title="Editar Vistoria de Entrada" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Pencil className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar Entrada</span>
          </button>
          <button onClick={handleEditExit} title="Editar Vistoria de Saída" className="inline-flex items-center justify-center sm:px-3 sm:py-2 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
            <Pencil className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar Saída</span>
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

      {/* Configuration Panel */}
      {showConfigPanel && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-6 no-print">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configurar Relatório</h3>
            <button onClick={() => setShowConfigPanel(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <button onClick={selectAll} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Selecionar Tudo
              </button>
              <button onClick={deselectAll} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1">
                <X className="w-4 h-4" />
                Desmarcar Tudo
              </button>
            </div>

            {/* Summary Section */}
            <div className="border-b border-gray-200 dark:border-slate-700 pb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportConfig.summary}
                  onChange={() => toggleReportSection('summary')}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Resumo das Diferenças</span>
              </label>
            </div>

            {/* Room Sections */}
            {Object.keys(reportConfig.rooms).map(room => {
              const roomConfig = reportConfig.rooms[room];
              const { changedItems, unchangedItems, newItems, missingItems } = getComparisonData(room);
              const hasContent = changedItems.length > 0 || unchangedItems.length > 0 || newItems.length > 0 || missingItems.length > 0;
              
              if (!hasContent) return null;

              return (
                <div key={room} className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                  <label className="flex items-center space-x-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={roomConfig?.changedItems && roomConfig?.newItems && roomConfig?.missingItems && roomConfig?.unchangedItems}
                      onChange={() => toggleReportSection(room)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{room}</span>
                  </label>
                  
                  <div className="ml-6 space-y-1">
                    {changedItems.length > 0 && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomConfig?.changedItems || false}
                          onChange={() => toggleReportSection(room, 'changedItems')}
                          className="h-3 w-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Itens com Mudanças ({changedItems.length})</span>
                      </label>
                    )}
                    
                    {newItems.length > 0 && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomConfig?.newItems || false}
                          onChange={() => toggleReportSection(room, 'newItems')}
                          className="h-3 w-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Itens Novos na Saída ({newItems.length})</span>
                      </label>
                    )}
                    
                    {missingItems.length > 0 && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomConfig?.missingItems || false}
                          onChange={() => toggleReportSection(room, 'missingItems')}
                          className="h-3 w-3 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Itens Faltando na Saída ({missingItems.length})</span>
                      </label>
                    )}
                    
                    {unchangedItems.length > 0 && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roomConfig?.unchangedItems || false}
                          onChange={() => toggleReportSection(room, 'unchangedItems')}
                          className="h-3 w-3 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Itens Sem Alterações ({unchangedItems.length})</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div ref={reportRef} className="space-y-8">
        <div className="text-center pt-4 report-section">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatório Comparativo de Vistorias</h1>
          <p className="text-gray-600 dark:text-gray-400">{entryData.property.name}</p>
        </div>

        {reportConfig.summary && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-section">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resumo das Diferenças</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalChanges.changed}</div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Itens com Condição Alterada</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalChanges.new}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Itens Novos na Saída</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalChanges.missing}</div>
                <div className="text-sm text-red-600 dark:text-red-400">Itens Faltando na Saída</div>
              </div>
            </div>
          </div>
        )}

        {allRooms.map((room, roomIndex) => {
          const { changedItems, unchangedItems, newItems, missingItems } = getComparisonData(room);
          const hasChanges = changedItems.length > 0 || newItems.length > 0 || missingItems.length > 0;
          const roomConfig = reportConfig.rooms[room];

          if (!hasChanges && unchangedItems.length === 0) return null;

          // Check if any section of this room is selected
          const showRoom = roomConfig && (
            (changedItems.length > 0 && roomConfig.changedItems) ||
            (newItems.length > 0 && roomConfig.newItems) ||
            (missingItems.length > 0 && roomConfig.missingItems) ||
            (unchangedItems.length > 0 && roomConfig.unchangedItems)
          );

          if (!showRoom) return null;

          return (
            <div key={roomIndex} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-room-container">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 flex items-center">
                <GitCompareArrows className="w-5 h-5 mr-3 text-blue-500"/>
                Comparativo: {room}
              </h3>
              
              {!hasChanges && roomConfig.unchangedItems && <p className="text-gray-500 dark:text-gray-400 text-center p-4">Nenhuma mudança detectada neste ambiente.</p>}

              {changedItems.length > 0 && roomConfig.changedItems && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Pencil className="w-4 h-4 text-orange-500"/>Itens com Mudanças</h4>
                  {changedItems.map(item => <ComparisonItem key={item.entry.id} item={item} type="changed" />)}
                </div>
              )}

              {newItems.length > 0 && roomConfig.newItems && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><PlusCircle className="w-4 h-4 text-green-500"/>Itens Novos na Saída</h4>
                  {newItems.map(item => <ComparisonItem key={item.id} item={{ exit: item }} type="new" />)}
                </div>
              )}

              {missingItems.length > 0 && roomConfig.missingItems && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><MinusCircle className="w-4 h-4 text-red-500"/>Itens Faltando na Saída</h4>
                  {missingItems.map(item => <ComparisonItem key={item.id} item={{ entry: item }} type="missing" />)}
                </div>
              )}

              {unchangedItems.length > 0 && roomConfig.unchangedItems && (
                <div className="mt-6">
                  <details>
                    <summary className="font-semibold text-gray-600 dark:text-gray-400 cursor-pointer flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400"/>
                      {unchangedItems.length} Itens Sem Alterações
                    </summary>
                    <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200 dark:border-slate-700">
                      {unchangedItems.map(item => <ComparisonItem key={item.entry.id} item={item} type="unchanged" />)}
                    </div>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompareInspections;
