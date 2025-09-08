import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property, InspectionPhoto, DetectedObject } from '../types';
import { Loader, ArrowLeft, GitCompareArrows, Download, Printer, Share2, Pencil, CheckCircle, PlusCircle, MinusCircle } from 'lucide-react';
import ComparisonItem from '../components/Compare/ComparisonItem';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';

interface FullInspectionData {
  property: Property;
  photos: InspectionPhoto[];
  inspectionDate: Date;
  inspectorName: string | null;
}

const CompareInspections: React.FC = () => {
  const { entryInspectionId, exitInspectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entryData, setEntryData] = useState<FullInspectionData | null>(null);
  const [exitData, setExitData] = useState<FullInspectionData | null>(null);
  const [loading, setLoading] = useState(true);

  const reportRef = useRef<HTMLDivElement>(null);
  const { handlePrint, handleShare, handleDownloadPdf } = useReportActions(reportRef);

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
      property: mapToProperty(inspectionData.properties as any, profileData?.full_name),
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
      setLoading(false);
    };
    loadAllData();
  }, [entryInspectionId, exitInspectionId, fetchInspectionData]);
  
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
      
      <div ref={reportRef} className="space-y-8">
        <div className="text-center pt-4 report-section">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatório Comparativo de Vistorias</h1>
          <p className="text-gray-600 dark:text-gray-400">{entryData.property.name}</p>
        </div>

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

        {allRooms.map((room, roomIndex) => {
          const { changedItems, unchangedItems, newItems, missingItems } = getComparisonData(room);
          const hasChanges = changedItems.length > 0 || newItems.length > 0 || missingItems.length > 0;

          if (!hasChanges && unchangedItems.length === 0) return null;

          return (
            <div key={roomIndex} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 report-room-container">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 flex items-center">
                <GitCompareArrows className="w-5 h-5 mr-3 text-blue-500"/>
                Comparativo: {room}
              </h3>
              
              {!hasChanges && <p className="text-gray-500 dark:text-gray-400 text-center p-4">Nenhuma mudança detectada neste ambiente.</p>}

              {changedItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Pencil className="w-4 h-4 text-orange-500"/>Itens com Mudanças</h4>
                  {changedItems.map(item => <ComparisonItem key={item.entry.id} item={item} type="changed" />)}
                </div>
              )}

              {newItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><PlusCircle className="w-4 h-4 text-green-500"/>Itens Novos na Saída</h4>
                  {newItems.map(item => <ComparisonItem key={item.id} item={{ exit: item }} type="new" />)}
                </div>
              )}

              {missingItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><MinusCircle className="w-4 h-4 text-red-500"/>Itens Faltando na Saída</h4>
                  {missingItems.map(item => <ComparisonItem key={item.id} item={{ entry: item }} type="missing" />)}
                </div>
              )}

              {unchangedItems.length > 0 && (
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
