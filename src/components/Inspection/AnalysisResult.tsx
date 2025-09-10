import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Edit3, ZoomIn, Plus, Trash2, Shield, Wrench, Palette, LayoutGrid, MapPin, MousePointerClick } from 'lucide-react';
import { AIAnalysisResult, DetectedObject, DetectedIssue, Finish } from '../../types';
import ImageLightbox from '../common/ImageLightbox';
import AnalysisItemForm from './AnalysisItemForm';
import { translateObjectCondition, translateRoomCondition, translateSeverity, formatObjectDescription, formatOptionalField } from '../../utils/translations';
import { getConditionStyle, getSeverityStyle } from '../../utils/styleUtils';

interface AnalysisResultProps {
  analysis: AIAnalysisResult;
  photoId: string;
  photoUrl: string;
  onUpdateAnalysis: (photoId: string, newAnalysis: AIAnalysisResult) => void;
  onDeletePhoto: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ 
  analysis,
  photoId,
  photoUrl, 
  onUpdateAnalysis,
  onDeletePhoto
}) => {
  const [currentAnalysis, setCurrentAnalysis] = useState(analysis);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDescription, setEditedDescription] = useState(analysis.description);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ type: 'object' | 'issue' | 'finish', item?: DetectedObject | DetectedIssue | Finish } | null>(null);
  const [markingFor, setMarkingFor] = useState<DetectedObject | null>(null);

  useEffect(() => {
    setCurrentAnalysis(analysis);
    setEditedDescription(analysis.description);
  }, [analysis]);

  const handleUpdate = (updatedAnalysis: AIAnalysisResult) => {
    setCurrentAnalysis(updatedAnalysis);
    onUpdateAnalysis(photoId, updatedAnalysis);
  };

  const handleSaveDescription = () => {
    const updatedAnalysis = { ...currentAnalysis, description: editedDescription };
    handleUpdate(updatedAnalysis);
    setIsEditingDesc(false);
  };

  const handleOpenModal = (type: 'object' | 'issue' | 'finish', item?: DetectedObject | DetectedIssue | Finish) => {
    setModalConfig({ type, item });
    setIsModalOpen(true);
  };

  const handleDeleteItem = (type: 'object' | 'issue' | 'finish', itemId: string) => {
    let updatedAnalysis: AIAnalysisResult;
    if (type === 'object') {
      updatedAnalysis = {
        ...currentAnalysis,
        objectsDetected: currentAnalysis.objectsDetected.filter(o => o.id !== itemId),
      };
    } else if (type === 'issue') {
      updatedAnalysis = {
        ...currentAnalysis,
        issues: currentAnalysis.issues.filter(i => i.id !== itemId),
      };
    } else {
      updatedAnalysis = {
        ...currentAnalysis,
        finishes: currentAnalysis.finishes.filter(f => f.id !== itemId),
      };
    }
    handleUpdate(updatedAnalysis);
  };

  const handleFormSubmit = (itemData: any) => {
    if (!modalConfig) return;
    const { type, item } = modalConfig;
    let updatedAnalysis: AIAnalysisResult;

    const newItem = {
      ...itemData,
      id: item ? (item as any).id : crypto.randomUUID(),
      isManual: true,
      confidence: 1,
    };

    if (type === 'object') {
      const objects = item 
        ? currentAnalysis.objectsDetected.map(o => o.id === newItem.id ? newItem : o)
        : [...currentAnalysis.objectsDetected, newItem];
      updatedAnalysis = { ...currentAnalysis, objectsDetected: objects };
    } else if (type === 'issue') {
      const issues = item
        ? currentAnalysis.issues.map(i => i.id === newItem.id ? newItem : i)
        : [...currentAnalysis.issues, newItem];
      updatedAnalysis = { ...currentAnalysis, issues: issues };
    } else { // finish
      const finishes = item
        ? currentAnalysis.finishes.map(f => f.id === newItem.id ? newItem : f)
        : [...currentAnalysis.finishes, newItem];
      updatedAnalysis = { ...currentAnalysis, finishes: finishes };
    }
    
    handleUpdate(updatedAnalysis);
    setIsModalOpen(false);
    setModalConfig(null);
  };
  
  const handleMarkLocation = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!markingFor) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const updatedObjects = currentAnalysis.objectsDetected.map(obj => 
      obj.id === markingFor.id ? { ...obj, markerCoordinates: { x, y } } : obj
    );

    handleUpdate({ ...currentAnalysis, objectsDetected: updatedObjects });
    setMarkingFor(null);
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'excellent': case 'good': case 'new': return <CheckCircle className="w-4 h-4" />;
      case 'fair': case 'worn': return <AlertTriangle className="w-4 h-4" />;
      case 'poor': case 'damaged': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden relative">
        <button
          onClick={onDeletePhoto}
          className="absolute top-3 right-3 z-10 p-2 text-gray-500 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Excluir esta foto e análise"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div>
            <div 
              className={`relative w-full h-64 rounded-lg overflow-hidden group bg-slate-100 dark:bg-slate-900/50 ${markingFor ? 'cursor-crosshair' : 'cursor-pointer'}`}
              onClick={markingFor ? handleMarkLocation : () => setIsLightboxOpen(true)}
            >
              <img 
                src={photoUrl} 
                alt="Foto analisada"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {!markingFor && (
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300"
                  onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                >
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              )}
              {markingFor && (
                <div className="absolute inset-0 bg-blue-500/30 flex flex-col items-center justify-center text-white p-4 text-center">
                  <MousePointerClick className="w-10 h-10 mb-2" />
                  <p className="font-bold">Clique na imagem</p>
                  <p className="text-sm">Marque onde o item "{markingFor.item}" deveria estar.</p>
                </div>
              )}
              {/* Marcadores visuais removidos para melhor experiência */}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getConditionStyle(currentAnalysis.roomCondition)}`}>
                {getConditionIcon(currentAnalysis.roomCondition)}
                <span className="ml-1.5 capitalize">{translateRoomCondition(currentAnalysis.roomCondition)}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Confiança: {(currentAnalysis.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Descrição do Ambiente</h3>
                <button
                  onClick={() => setIsEditingDesc(!isEditingDesc)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded-full"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white"
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <button onClick={handleSaveDescription} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Salvar</button>
                    <button onClick={() => { setIsEditingDesc(false); setEditedDescription(currentAnalysis.description); }} className="px-3 py-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-slate-500">Cancelar</button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">{editedDescription}</p>
              )}
            </div>
            
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><LayoutGrid className="w-4 h-4 mr-2 text-gray-500"/>Objetos Identificados</h4>
                <button onClick={() => handleOpenModal('object')} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"><Plus className="w-3 h-3 mr-1"/>Adicionar</button>
              </div>
              <div className="space-y-2">
                {currentAnalysis.objectsDetected?.map((object, index) => (
                  <div key={`object-${object.id || index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-md group">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatObjectDescription(object)}</span>
                      {object.isManual && <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Manual</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle(object.condition)}`}>{translateObjectCondition(object.condition)}</span>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {object.condition === 'not_found' && (
                          <button onClick={() => setMarkingFor(object)} className="p-1 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" title="Marcar Local na Foto">
                            <MapPin className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => handleOpenModal('object', object)} className="p-1 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteItem('object', object.id)} className="p-1 text-gray-500 hover:text-red-500 dark:hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><Palette className="w-4 h-4 mr-2 text-gray-500"/>Acabamentos</h4>
                <button onClick={() => handleOpenModal('finish')} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"><Plus className="w-3 h-3 mr-1"/>Adicionar</button>
              </div>
              <div className="space-y-2">
                {currentAnalysis.finishes?.map((finish, index) => (
                  <div key={`finish-${finish.id || index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-md group">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{finish.element}: {formatOptionalField(finish.material)} ({formatOptionalField(finish.color)})</span>
                      {finish.isManual && <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Manual</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle(finish.condition)}`}>{translateObjectCondition(finish.condition)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-gray-500"/>Problemas Identificados</h4>
                <button onClick={() => handleOpenModal('issue')} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"><Plus className="w-3 h-3 mr-1"/>Adicionar</button>
              </div>
              <div className="space-y-2">
                {currentAnalysis.issues?.map((issue, index) => (
                  <div key={`issue-${issue.id || index}`} className="p-3 border border-gray-200 dark:border-slate-700 rounded-md group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{issue.type}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(issue.severity)}`}>{translateSeverity(issue.severity)}</span>
                        {issue.isManual && <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Manual</span>}
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal('issue', issue)} className="p-1 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteItem('issue', issue.id)} className="p-1 text-gray-500 hover:text-red-500 dark:hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{issue.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{issue.location}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><Shield className="w-4 h-4 mr-2 text-gray-500"/>Segurança</h4>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p><strong>Fechaduras:</strong> {formatOptionalField(currentAnalysis.safety?.locks)}</p>
                <p><strong>Elétrica:</strong> {formatOptionalField(currentAnalysis.safety?.electrical)}</p>
                {currentAnalysis.safety?.hazards?.map((hazard, i) => <p key={i}><strong>Risco:</strong> {hazard}</p>)}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center"><Wrench className="w-4 h-4 mr-2 text-gray-500"/>Recomendações</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {currentAnalysis.maintenanceRecommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <ImageLightbox isOpen={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} imageUrl={photoUrl} />
      {isModalOpen && modalConfig && (
        <AnalysisItemForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          itemType={modalConfig.type}
          itemToEdit={modalConfig.item}
        />
      )}
    </>
  );
};

export default AnalysisResult;
