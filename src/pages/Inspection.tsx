import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Loader, Plus, Trash2, Check, Mic, AlertTriangle, Layers, Save, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import RoomInspectionCard from '../components/Inspection/RoomInspectionCard';
import { Property, AIAnalysisResult, InspectionPhoto, DetectedObject, DetectedIssue } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_ROOMS = ['Sala de Estar', 'Cozinha', 'Banheiro', 'Quarto 1', 'Garagem', 'Área de Serviço', 'Varanda', 'Lavanderia', 'Closet', 'Copa'];

const getRealAIAnalysis = async (imageUrl: string, roomName: string, entryObjects?: DetectedObject[]): Promise<AIAnalysisResult> => {
  const { data, error } = await supabase.functions.invoke('analyze-image', {
    body: { imageUrl, roomName, entryObjects },
  });

  if (error) {
    console.error('Error invoking edge function:', error);
    const functionError = (error as any).context?.error?.message || error.message;
    throw new Error(functionError);
  }

  const rawAnalysis = data as Omit<AIAnalysisResult, 'objectsDetected' | 'issues'> & {
    objectsDetected: Omit<DetectedObject, 'id' | 'isManual'>[];
    issues: Omit<DetectedIssue, 'id' | 'isManual'>[];
  };

  const processedAnalysis: AIAnalysisResult = {
    ...rawAnalysis,
    objectsDetected: (rawAnalysis.objectsDetected || []).map(obj => ({
      ...obj,
      id: crypto.randomUUID(),
      isManual: false,
    })),
    issues: (rawAnalysis.issues || []).map(issue => ({
      ...issue,
      id: crypto.randomUUID(),
      isManual: false,
    })),
    finishes: (rawAnalysis.finishes || []).map(finish => ({
      ...finish,
      id: crypto.randomUUID(),
      isManual: false,
    })),
  };

  return processedAnalysis;
};


const Inspection: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const property = location.state?.property as Property;
  const inspectionType = location.state?.inspectionType as 'entry' | 'exit';
  const existingInspectionId = location.state?.inspectionId as string | undefined;

  const [inspectionId, setInspectionId] = useState<string | null>(existingInspectionId || null);
  const [inspectionStatus, setInspectionStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [roomNames, setRoomNames] = useState<string[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Iniciando nova vistoria...');
  const [generalObservations, setGeneralObservations] = useState('');
  const [isSavingObservations, setIsSavingObservations] = useState(false);
  const [observationsSaved, setObservationsSaved] = useState(false);

  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);

  const [photoToDelete, setPhotoToDelete] = useState<InspectionPhoto | null>(null);
  const [isDeletePhotoModalOpen, setIsDeletePhotoModalOpen] = useState(false);
  
  const { transcript, isListening, startListening, stopListening, hasRecognitionSupport, error: speechError, clearError: clearSpeechError } = useSpeechRecognition();
  const { addToast, updateToast } = useToast();
  
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [analyzingRoom, setAnalyzingRoom] = useState<string | null>(null);
  const [roomErrors, setRoomErrors] = useState<{ [key: string]: string | null }>({});

  const [entryInspectionPhotos, setEntryInspectionPhotos] = useState<InspectionPhoto[]>([]);

  useEffect(() => {
    if (transcript) {
      setNewRoomName(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  const fetchExistingInspection = useCallback(async (id: string) => {
    setLoadingMessage('Carregando vistoria existente...');
    setLoading(true);
  
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        *,
        inspection_photos (
          id,
          photo_url,
          room,
          ai_analysis_result,
          created_at
        )
      `)
      .eq('id', id)
      .single();
  
    if (error || !data) {
      console.error('Error fetching existing inspection with photos:', error);
      setLoading(false);
      return;
    }
  
    const inspectionData = data;
    const photosData = data.inspection_photos || [];
  
    const fetchedPhotos: InspectionPhoto[] = photosData.map((p: any) => ({
      id: p.id,
      url: p.photo_url,
      room: p.room,
      analysisResult: p.ai_analysis_result,
      uploadedAt: new Date(p.created_at)
    }));
  
    setPhotos(fetchedPhotos);
    setInspectionStatus(inspectionData.status);
    setGeneralObservations(inspectionData.general_observations || '');
  
    const uniqueRooms = [...new Set(fetchedPhotos.map(p => p.room))].filter(r => r);
    setRoomNames(uniqueRooms);
  
    setLoading(false);
  }, []);

  const createInspection = useCallback(async () => {
    if (!property || !inspectionType || !user) return;
    setLoadingMessage('Iniciando nova vistoria...');
    setLoading(true);

    const { data, error } = await supabase
      .from('inspections')
      .insert({
        property_id: property.id,
        inspection_date: new Date().toISOString(),
        status: 'in-progress',
        inspection_type: inspectionType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inspection:', error);
    } else {
      setInspectionId(data.id);
      setInspectionStatus('in-progress');
    }
    setLoading(false);
  }, [property, inspectionType, user]);
  
  const loadEntryDataForExit = useCallback(async () => {
    if (!property) return;
    setLoadingMessage('Carregando ambientes da vistoria de entrada...');
    setLoading(true);

    const entryInspection = property.inspections.find(i => i.inspection_type === 'entry');
    if (!entryInspection) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', entryInspection.id);

    if (error) {
      console.error('Error fetching entry inspection photos:', error);
    } else {
      const entryPhotos: InspectionPhoto[] = data.map((p: any) => ({
        id: p.id,
        url: p.photo_url,
        room: p.room,
        analysisResult: p.ai_analysis_result,
        uploadedAt: new Date(p.created_at)
      }));
      setEntryInspectionPhotos(entryPhotos);
      const uniqueRooms = [...new Set(entryPhotos.map(p => p.room))].filter(r => r);
      setRoomNames(uniqueRooms);
    }
  }, [property]);

  useEffect(() => {
    if (!property || !inspectionType) {
      setLoading(false);
      return;
    }

    if (existingInspectionId) {
      fetchExistingInspection(existingInspectionId);
    } else if (inspectionType === 'exit') {
      loadEntryDataForExit().then(() => createInspection());
    } else {
      createInspection();
    }
  }, [property, inspectionType, existingInspectionId, createInspection, fetchExistingInspection, loadEntryDataForExit]);
  
  if (!property || !inspectionType) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">Informações incompletas para iniciar a vistoria.</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Por favor, inicie a vistoria a partir da página de detalhes do imóvel.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Voltar para o Dashboard
        </button>
      </div>
    );
  }

  const handlePhotoAnalyzed = async (file: File, roomName: string) => {
    if (!inspectionId) {
      addToast('ID da vistoria não encontrado. Recarregue a página.', 'error');
      return;
    }
    
    setAnalyzingRoom(roomName);
    setRoomErrors(prev => ({ ...prev, [roomName]: null }));
    const toastId = addToast(`Analisando imagem para ${roomName}...`, 'loading');
  
    const fileExtension = file.name.split('.').pop() || 'png';
    const sanitizedFileName = file.name
      .replace(`.${fileExtension}`, '')
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
      
    const filePath = `${inspectionId}/${Date.now()}-${sanitizedFileName}.${fileExtension}`;
    
    const { error: uploadError } = await supabase.storage
      .from('inspection_photos')
      .upload(filePath, file);
  
    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      updateToast(toastId, `Falha no upload da foto: ${uploadError.message}`, 'error');
      setAnalyzingRoom(null);
      setRoomErrors(prev => ({ ...prev, [roomName]: `Falha no upload: ${uploadError.message}` }));
      return;
    }
  
    const { data: urlData } = supabase.storage
      .from('inspection_photos')
      .getPublicUrl(filePath);
  
    let analysis;
    try {
      const entryObjectsForRoom = inspectionType === 'exit'
        ? entryInspectionPhotos
            .filter(p => p.room === roomName)
            .flatMap(p => p.analysisResult?.objectsDetected || [])
        : undefined;

      analysis = await getRealAIAnalysis(urlData.publicUrl, roomName, entryObjectsForRoom);
    } catch (e: any) {
      console.error('Error getting AI analysis:', e);
      
      // Create user-friendly error messages
      let userFriendlyMessage = '';
      if (e.message?.includes('Failed to send a request to the Edge Function') || e.name === 'FunctionsFetchError') {
        userFriendlyMessage = 'Serviço de análise temporariamente indisponível. Tente novamente em alguns instantes.';
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        userFriendlyMessage = 'Problemas de conexão. Verifique sua internet e tente novamente.';
      } else {
        userFriendlyMessage = `Falha na análise da IA: ${e.message}`;
      }
      
      updateToast(toastId, userFriendlyMessage, 'error');
      setAnalyzingRoom(null);
      setRoomErrors(prev => ({ ...prev, [roomName]: userFriendlyMessage }));
      await supabase.storage.from('inspection_photos').remove([filePath]);
      return;
    }
  
    const { data: newPhotoData, error: insertError } = await supabase
      .from('inspection_photos')
      .insert({
        inspection_id: inspectionId,
        photo_url: urlData.publicUrl,
        room: roomName,
        ai_analysis_result: analysis,
      })
      .select()
      .single();
  
    if (insertError) {
      console.error('Error inserting photo data:', insertError);
      updateToast(toastId, `Falha ao salvar dados: ${insertError.message}`, 'error');
      setAnalyzingRoom(null);
      setRoomErrors(prev => ({ ...prev, [roomName]: `Falha ao salvar: ${insertError.message}` }));
      return;
    }
  
    const newPhoto: InspectionPhoto = {
      id: newPhotoData.id,
      url: newPhotoData.photo_url,
      room: newPhotoData.room,
      analysisResult: newPhotoData.ai_analysis_result,
      uploadedAt: new Date(newPhotoData.created_at),
    };
  
    setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
    updateToast(toastId, 'Análise concluída com sucesso!', 'success');
    setAnalyzingRoom(null);
  };
  
  const handleUpdateAnalysis = async (photoId: string, newAnalysis: AIAnalysisResult) => {
    const { error } = await supabase
      .from('inspection_photos')
      .update({ ai_analysis_result: newAnalysis })
      .eq('id', photoId);

    if (error) {
      console.error('Error updating analysis:', error);
      addToast('Falha ao salvar alterações.', 'error');
    } else {
      setPhotos(prevPhotos =>
        prevPhotos.map(photo =>
          photo.id === photoId ? { ...photo, analysisResult: newAnalysis } : photo
        )
      );
      addToast('Análise atualizada!', 'success');
    }
  };

  const handleSaveObservations = async () => {
    if (!inspectionId) return;
    setIsSavingObservations(true);
    setObservationsSaved(false);

    const { error } = await supabase
      .from('inspections')
      .update({ general_observations: generalObservations })
      .eq('id', inspectionId);

    if (error) {
      addToast('Falha ao salvar observações.', 'error');
    } else {
      setObservationsSaved(true);
      setTimeout(() => setObservationsSaved(false), 2000);
    }
    setIsSavingObservations(false);
  };


  const handleAddCustomRoom = () => {
    const trimmedName = newRoomName.trim();
    if (trimmedName && !roomNames.includes(trimmedName)) {
      setRoomNames([...roomNames, trimmedName]);
      setSelectedRoom(trimmedName);
      setNewRoomName('');
    }
  };

  const handleAddPredefinedRoom = (room: string) => {
    if (!roomNames.includes(room)) {
      setRoomNames([...roomNames, room]);
    }
    setSelectedRoom(room);
  };

  const handleDeleteRoom = (roomName: string) => {
    setRoomToDelete(roomName);
    setIsDeleteRoomModalOpen(true);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete || !inspectionId) return;

    const photosToDelete = photos.filter(p => p.room === roomToDelete);
    const photoIdsToDelete = photosToDelete.map(p => p.id);

    if (photoIdsToDelete.length > 0) {
      const { error: dbError } = await supabase
        .from('inspection_photos')
        .delete()
        .in('id', photoIdsToDelete);

      if (dbError) {
        console.error('Error deleting photos from DB:', dbError);
        setIsDeleteRoomModalOpen(false);
        return;
      }

      const filePaths = photosToDelete.map(p => p.url.split('/inspection_photos/').pop() || '');
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('inspection_photos')
          .remove(filePaths);
        if (storageError) console.error('Error deleting photos from storage:', storageError);
      }
    }
    
    setPhotos(photos.filter(p => p.room !== roomToDelete));
    setRoomNames(roomNames.filter(name => name !== roomToDelete));
    if (selectedRoom === roomToDelete) {
      setSelectedRoom(null);
    }

    setIsDeleteRoomModalOpen(false);
    setRoomToDelete(null);
  };

  const handleDeletePhoto = (photo: InspectionPhoto) => {
    setPhotoToDelete(photo);
    setIsDeletePhotoModalOpen(true);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    const { error: dbError } = await supabase
      .from('inspection_photos')
      .delete()
      .eq('id', photoToDelete.id);

    if (dbError) {
      console.error('Error deleting photo from DB:', dbError);
      setIsDeletePhotoModalOpen(false);
      return;
    }

    const filePath = photoToDelete.url.split('/inspection_photos/').pop();
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('inspection_photos')
        .remove([filePath]);
      if (storageError) {
        console.error('Error deleting photo from storage:', storageError);
      }
    }

    const updatedPhotos = photos.filter(p => p.id !== photoToDelete.id);
    setPhotos(updatedPhotos);

    const remainingPhotosInRoom = updatedPhotos.filter(p => p.room === photoToDelete.room);
    if (remainingPhotosInRoom.length === 0) {
      setRoomNames(roomNames.filter(name => name !== photoToDelete.room));
      setSelectedRoom(null);
    }

    setIsDeletePhotoModalOpen(false);
    setPhotoToDelete(null);
  };

  const generateReport = async () => {
    if (photos.length === 0) {
      addToast('Adicione pelo menos uma foto para gerar o relatório', 'error');
      return;
    }
    if (!inspectionId) return;
  
    await handleSaveObservations(); // Ensure latest observations are saved

    const { error } = await supabase
      .from('inspections')
      .update({ status: 'completed' })
      .eq('id', inspectionId)
      .select()
      .single();
  
    if (error) {
      console.error('Error finalizing inspection:', error);
      addToast(`Falha ao finalizar a vistoria: ${error.message}`, 'error');
      return;
    }
    
    navigate('/reports', { 
      state: { inspectionId } 
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">{loadingMessage}</h3>
        <p className="text-gray-600 dark:text-gray-400">Aguarde enquanto preparamos tudo para você.</p>
      </div>
    );
  }

  const isCompleted = inspectionStatus === 'completed';
  const filteredRoomNames = selectedRoom ? [selectedRoom] : roomNames;

  return (
    <div className="space-y-6">
      <ConfirmationModal
        isOpen={isDeleteRoomModalOpen}
        onClose={() => setIsDeleteRoomModalOpen(false)}
        onConfirm={handleConfirmDeleteRoom}
        title="Confirmar Exclusão de Ambiente"
        message={`Atenção! Você está prestes a excluir o ambiente "${roomToDelete}". Todas as fotos e análises contidas nele serão removidas permanentemente. Deseja continuar?`}
        confirmText="Excluir Ambiente"
        cancelText="Cancelar"
      />
      <ConfirmationModal
        isOpen={isDeletePhotoModalOpen}
        onClose={() => setIsDeletePhotoModalOpen(false)}
        onConfirm={handleConfirmDeletePhoto}
        title="Confirmar Exclusão de Foto"
        message="Tem certeza que deseja excluir esta foto e sua análise? Esta ação não pode ser desfeita."
        confirmText="Excluir Foto"
        cancelText="Cancelar"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/property/${property.id}`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Vistoria de {inspectionType === 'entry' ? 'Entrada' : 'Saída'}
            </h1>
            <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{property.name} - {property.address}</span>
            </div>
          </div>
        </div>
        {photos.length > 0 && (
          <button
            onClick={generateReport}
            className={`inline-flex items-center justify-center px-6 py-3 text-white rounded-lg transition-colors font-medium ${
              isCompleted 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20' 
              : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20'
            }`}
          >
            <FileText className="w-5 h-5 mr-2" />
            {isCompleted ? 'Atualizar Relatório' : 'Gerar Relatório Completo'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Gerenciar e Filtrar Ambientes</h2>
        
        {speechError && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-400 dark:text-red-200 p-4 rounded-md" role="alert">
            <div className="flex">
              <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" /></div>
              <div>
                <p className="font-bold">Permissão Necessária</p>
                <p className="text-sm">{speechError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filtre por ambiente:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRoom(null)}
              className={`flex items-center px-3 py-1.5 text-sm rounded-full transition-colors ${
                !selectedRoom
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Todos os Ambientes
            </button>
            {DEFAULT_ROOMS.map(room => (
              <button
                key={room}
                onClick={() => handleAddPredefinedRoom(room)}
                className={`flex items-center px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedRoom === room
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {roomNames.includes(room) ? <Check className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                {room}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ou adicione um ambiente personalizado:</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomRoom()}
                placeholder="Ex: Escritório, Varanda Gourmet..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white"
              />
              {hasRecognitionSupport && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : () => { clearSpeechError(); startListening(); }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleAddCustomRoom}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredRoomNames.map((roomName, index) => (
          <motion.div
            key={roomName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <RoomInspectionCard
              roomName={roomName}
              photos={photos.filter(p => p.room === roomName)}
              onPhotoAnalyzed={handlePhotoAnalyzed}
              onUpdateAnalysis={handleUpdateAnalysis}
              onDeleteRoom={() => handleDeleteRoom(roomName)}
              onDeletePhoto={handleDeletePhoto}
              isAnalyzing={analyzingRoom === roomName}
              uploadError={roomErrors[roomName]}
              clearError={() => setRoomErrors(prev => ({ ...prev, [roomName]: null }))}
            />
          </motion.div>
        ))}
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2 text-blue-500" />
          Observações Gerais da Vistoria
        </h2>
        <div className="relative">
          <textarea
            value={generalObservations}
            onChange={(e) => setGeneralObservations(e.target.value)}
            onBlur={handleSaveObservations}
            placeholder="Adicione aqui qualquer observação geral sobre a vistoria..."
            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white resize-y min-h-[100px]"
            rows={4}
          />
          {hasRecognitionSupport && (
            <button
              type="button"
              onClick={isListening ? stopListening : () => { clearError: clearSpeechError(); startListening(); }}
              className={`absolute right-2 top-3 p-1.5 rounded-full transition-colors ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="h-5 mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
          {isSavingObservations ? (
            <><Loader className="w-3 h-3 mr-1.5 animate-spin" /> Salvando...</>
          ) : observationsSaved ? (
            <><Check className="w-3 h-3 mr-1.5 text-green-500" /> Salvo</>
          ) : (
            <span>As alterações serão salvas automaticamente.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inspection;
