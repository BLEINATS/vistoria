import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Mic, AlertTriangle } from 'lucide-react';
import { DetectedObject, DetectedIssue, Finish } from '../../types';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

type ItemType = 'object' | 'issue' | 'finish';
type ItemToEdit = DetectedObject | DetectedIssue | Finish | undefined;

interface AnalysisItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  itemType: ItemType;
  itemToEdit?: ItemToEdit;
}

const AnalysisItemForm: React.FC<AnalysisItemFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  itemType,
  itemToEdit,
}) => {
  const isEditing = !!itemToEdit;
  const [formData, setFormData] = useState<any>({});
  const [speechTarget, setSpeechTarget] = useState<string | null>(null);

  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    hasRecognitionSupport,
    error: speechError,
    clearError: clearSpeechError,
  } = useSpeechRecognition();

  useEffect(() => {
    if (isEditing && itemToEdit) {
      setFormData(itemToEdit);
    } else {
      // Reset form
      if (itemType === 'object') {
        setFormData({ item: '', color: '', material: '', condition: 'good' });
      } else if (itemType === 'issue') {
        setFormData({ type: '', description: '', location: '', severity: 'low' });
      } else {
        setFormData({ element: 'piso', material: '', color: '', condition: 'good' });
      }
    }
    clearSpeechError();
  }, [isOpen, isEditing, itemToEdit, itemType, clearSpeechError]);

  useEffect(() => {
    if (transcript && speechTarget) {
      setFormData((prev: any) => ({
        ...prev,
        [speechTarget]: prev[speechTarget] ? `${prev[speechTarget]} ${transcript}` : transcript,
      }));
    }
  }, [transcript, speechTarget]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleMicClick = (fieldName: string) => {
    if (isListening) {
      stopListening();
      setSpeechTarget(null);
    } else {
      clearSpeechError();
      setSpeechTarget(fieldName);
      startListening();
    }
  };

  if (!isOpen) return null;

  const title = isEditing
    ? `Editar ${itemType === 'object' ? 'Objeto' : itemType === 'issue' ? 'Problema' : 'Acabamento'}`
    : `Adicionar Novo ${itemType === 'object' ? 'Objeto' : itemType === 'issue' ? 'Problema' : 'Acabamento'}`;

  const renderSpeechButton = (fieldName: string) => {
    if (!hasRecognitionSupport) return null;
    const isMicActive = isListening && speechTarget === fieldName;
    return (
      <button
        type="button"
        onClick={() => handleMicClick(fieldName)}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
          isMicActive ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
        }`}
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  };

  const renderObjectForm = () => (
    <>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item</label>
        <input type="text" name="item" value={formData.item || ''} onChange={handleChange} required className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('item')}
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor</label>
        <input type="text" name="color" value={formData.color || ''} onChange={handleChange} className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('color')}
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
        <input type="text" name="material" value={formData.material || ''} onChange={handleChange} className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('material')}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condição</label>
        <select name="condition" value={formData.condition || 'good'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white">
          <option value="new">Novo</option>
          <option value="good">Bom</option>
          <option value="worn">Desgastado</option>
          <option value="damaged">Danificado</option>
          <option value="not_found">Não encontrada</option>
        </select>
      </div>
    </>
  );

  const renderIssueForm = () => (
    <>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo do Problema</label>
        <input type="text" name="type" value={formData.type || ''} onChange={handleChange} required placeholder="Ex: Rachadura na parede" className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('type')}
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
        <textarea name="description" value={formData.description || ''} onChange={handleChange} required rows={3} className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white resize-none" />
        {renderSpeechButton('description')}
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localização</label>
        <input type="text" name="location" value={formData.location || ''} onChange={handleChange} required placeholder="Ex: Canto superior direito" className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('location')}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severidade</label>
        <select name="severity" value={formData.severity || 'low'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white">
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
      </div>
    </>
  );

  const renderFinishForm = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Elemento</label>
        <select name="element" value={formData.element || 'piso'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white">
          <option value="piso">Piso</option>
          <option value="parede">Parede</option>
          <option value="teto">Teto</option>
          <option value="esquadria">Esquadria</option>
          <option value="bancada">Bancada</option>
          <option value="etc">Outro</option>
        </select>
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
        <input type="text" name="material" value={formData.material || ''} onChange={handleChange} required className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('material')}
      </div>
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor</label>
        <input type="text" name="color" value={formData.color || ''} onChange={handleChange} className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
        {renderSpeechButton('color')}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condição</label>
        <select name="condition" value={formData.condition || 'good'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white">
          <option value="new">Novo</option>
          <option value="good">Bom</option>
          <option value="worn">Desgastado</option>
          <option value="damaged">Danificado</option>
          <option value="not_found">Não encontrada</option>
        </select>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {speechError && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-400 dark:text-red-200 p-4 rounded-md" role="alert">
                <div className="flex">
                  <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" /></div>
                  <div>
                    <p className="font-bold">Permissão Necessária</p>
                    <p className="text-sm">{speechError}</p>
                  </div>
                  <button type="button" onClick={clearSpeechError} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:ring-2 focus:ring-red-400 inline-flex h-8 w-8">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {itemType === 'object' && renderObjectForm()}
            {itemType === 'issue' && renderIssueForm()}
            {itemType === 'finish' && renderFinishForm()}
          </div>

          <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Adicionar Item'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AnalysisItemForm;
