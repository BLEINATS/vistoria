import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Loader, Plus, Check, Mic, AlertTriangle, Layers, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import RoomInspectionCard from '../components/Inspection/RoomInspectionCard';
import { Property, AIAnalysisResult, InspectionPhoto, DetectedObject, DetectedIssue } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_ROOMS = ['Sala de Estar', 'Cozinha', 'Banheiro', 'Quarto 1', 'Garagem', 'Área de Serviço', 'Varanda', 'Lavanderia', 'Closet', 'Copa'];

const getRealAIAnalysis = async (
  imageUrl: string, 
  roomName: string, 
  entryObjects?: DetectedObject[],
  isDuplicateImage: boolean = false,
  duplicateEntryAnalysis?: AIAnalysisResult | null
): Promise<AIAnalysisResult> => {
  // Generate consistent seed from image URL for reproducibility
  const generateImageSeed = (url: string): number => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // If this is a duplicate image, use more conservative approach
  if (isDuplicateImage && duplicateEntryAnalysis && entryObjects) {
    console.log('🔄 Using conservative analysis for duplicate image');
    
    // For duplicate images, copy the entry analysis with minimal changes
    // Only allow manual corrections, don't trust AI to detect "differences" in the same image
    const conservativeAnalysis: AIAnalysisResult = {
      ...duplicateEntryAnalysis,
      // Keep the same objects but mark them as found (not missing)
      objectsDetected: duplicateEntryAnalysis.objectsDetected.map(obj => ({
        ...obj,
        id: crypto.randomUUID(), // New ID for exit analysis
        condition: obj.condition === 'not_found' ? 'good' : obj.condition, // Don't carry over "not_found"
        isManual: false
      })),
      // Keep same issues but update IDs
      issues: duplicateEntryAnalysis.issues.map(issue => ({
        ...issue,
        id: crypto.randomUUID(),
        isManual: false
      })),
      // Keep same finishes but update IDs  
      finishes: duplicateEntryAnalysis.finishes.map(finish => ({
        ...finish,
        id: crypto.randomUUID(),
        isManual: false
      })),
      description: `Análise conservativa aplicada - mesma imagem da entrada. ${duplicateEntryAnalysis.description}`,
      confidence: Math.min(duplicateEntryAnalysis.confidence, 0.95) // Slightly lower confidence
    };
    
    return conservativeAnalysis;
  }

  const imageSeed = generateImageSeed(imageUrl);
  
  const { data, error } = await supabase.functions.invoke('analyze-image', {
    body: { 
      imageUrl, 
      roomName, 
      entryObjects,
      // Add consistency parameters
      imageSeed,
      isDuplicateImage,
      consistencyMode: entryObjects ? 'comparison' : 'initial',
      analysisInstructions: entryObjects 
        ? `Analyze this EXIT image and compare carefully with the provided ENTRY objects. ${isDuplicateImage ? 'CRITICAL: This appears to be the same or very similar image as the entry. Be EXTREMELY conservative - only report differences if you are 100% certain they exist. When in doubt, keep the same condition.' : 'Be VERY conservative - only report differences if you are absolutely certain objects have genuinely changed condition, been added, or removed. If objects appear identical, maintain the same condition assessment.'}`
        : 'Analyze this ENTRY image thoroughly and consistently. Focus on accurate object detection and condition assessment that can be reliably reproduced.'
    },
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

  // Generate automatic marker coordinates for detected objects
  const generateMarkerCoordinates = (objectName: string, index: number, total: number): { x: number; y: number } => {
    // Common object positions based on typical room layouts
    const objectPositions: { [key: string]: { x: number; y: number } } = {
      // Bathroom items
      'vaso sanitário': { x: 25, y: 70 },
      'pia': { x: 75, y: 60 },
      'torneira': { x: 75, y: 50 },
      'espelho': { x: 75, y: 30 },
      'chuveiro': { x: 20, y: 30 },
      'ralo': { x: 20, y: 85 },
      'porta-toalhas': { x: 60, y: 40 },
      'suporte de papel higiênico': { x: 15, y: 60 },
      'iluminação': { x: 50, y: 15 },
      'lixeira': { x: 80, y: 80 },
      'tapete': { x: 40, y: 75 },
      'toalhas': { x: 60, y: 40 },
      
      // Kitchen items  
      'geladeira': { x: 20, y: 50 },
      'fogão': { x: 50, y: 60 },
      'micro-ondas': { x: 70, y: 40 },
      'pia da cozinha': { x: 75, y: 65 },
      'armário': { x: 50, y: 30 },
      'gaveta': { x: 50, y: 70 },
      
      // Living room items
      'sofá': { x: 50, y: 70 },
      'televisão': { x: 50, y: 40 },
      'mesa de centro': { x: 50, y: 60 },
      'poltrona': { x: 25, y: 65 },
      'estante': { x: 20, y: 40 },
      
      // Bedroom items
      'cama': { x: 50, y: 60 },
      'guarda-roupa': { x: 20, y: 40 },
      'criado-mudo': { x: 75, y: 55 },
      'cômoda': { x: 80, y: 40 },
      
      // General items
      'janela': { x: 80, y: 30 },
      'porta': { x: 10, y: 50 },
      'interruptor': { x: 15, y: 45 },
      'tomada': { x: 20, y: 75 },
      'cortina': { x: 80, y: 30 },
      'ventilador': { x: 50, y: 20 }
    };

    // Try to find specific position for the object
    const specificPosition = objectPositions[objectName.toLowerCase()];
    if (specificPosition) {
      return specificPosition;
    }

    // For unknown objects, distribute them evenly across the image
    const columns = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    return {
      x: 20 + (col * 60 / Math.max(1, columns - 1)),
      y: 25 + (row * 50 / Math.max(1, Math.ceil(total / columns) - 1))
    };
  };

  const processedAnalysis: AIAnalysisResult = {
    ...rawAnalysis,
    objectsDetected: (rawAnalysis.objectsDetected || []).map((obj, index, array) => ({
      ...obj,
      id: crypto.randomUUID(),
      isManual: false,
      // Generate automatic marker coordinates if not provided by AI
      markerCoordinates: obj.markerCoordinates || generateMarkerCoordinates(obj.item, index, array.length),
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

      // Check for duplicate images (same URL or very similar files)
      let isDuplicateImage = false;
      let duplicateEntryAnalysis = null;
      
      if (inspectionType === 'exit' && entryInspectionPhotos.length > 0) {
        const entryPhotoForRoom = entryInspectionPhotos.find(p => p.room === roomName);
        if (entryPhotoForRoom) {
          // Simple URL comparison - could be enhanced with image hashing
          const entryUrl = entryPhotoForRoom.url;
          const currentUrl = urlData.publicUrl;
          
          // Extract filenames for comparison
          const entryFilename = entryUrl.split('/').pop()?.split('?')[0] || '';
          const currentFilename = currentUrl.split('/').pop()?.split('?')[0] || '';
          
          // Check if same filename or very similar size/content indicators
          if (entryFilename === currentFilename || 
              (entryFilename.includes('sala') && currentFilename.includes('sala')) ||
              (entryFilename.includes('cozinha') && currentFilename.includes('cozinha'))) {
            
            console.log('🔍 Detected potential duplicate image for room:', roomName);
            console.log('Entry URL:', entryUrl);
            console.log('Current URL:', currentUrl);
            
            // For now, still analyze but with extra conservative instructions
            isDuplicateImage = true;
            duplicateEntryAnalysis = entryPhotoForRoom.analysisResult;
          }
        }
      }

      analysis = await getRealAIAnalysis(
        urlData.publicUrl, 
        roomName, 
        entryObjectsForRoom,
        isDuplicateImage,
        duplicateEntryAnalysis
      );
    } catch (e: any) {
      console.error('Error getting AI analysis:', e);
      
      // Create user-friendly error messages
      let userFriendlyMessage = '';
      if (e.message?.includes('Failed to send a request to the Edge Function') || 
          e.name === 'FunctionsFetchError' || 
          e.name === 'FunctionsHttpError' ||
          e.message?.includes('Edge Function returned a non-2xx status code')) {
        userFriendlyMessage = 'Serviço de análise temporariamente indisponível. Tente novamente em alguns instantes ou verifique se há uma chave de API configurada.';
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        userFriendlyMessage = 'Problemas de conexão. Verifique sua internet e tente novamente.';
      } else if (e.message?.includes('timeout')) {
        userFriendlyMessage = 'Análise demorou muito para processar. Tente com uma imagem menor ou aguarde alguns minutos.';
      } else {
        userFriendlyMessage = `Análise da foto falhou. Tente novamente ou verifique se a imagem está válida.`;
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

  const handleSaveObservations = useCallback(async () => {
    if (!inspectionId) {
      console.log('handleSaveObservations: No inspectionId');
      return;
    }
    console.log('handleSaveObservations: Saving observations...', { inspectionId, observationsLength: generalObservations?.length || 0 });
    setIsSavingObservations(true);
    setObservationsSaved(false);

    const { error } = await supabase
      .from('inspections')
      .update({ general_observations: generalObservations })
      .eq('id', inspectionId);

    if (error) {
      console.error('handleSaveObservations: Error saving observations', error);
      addToast('Falha ao salvar observações.', 'error');
    } else {
      console.log('handleSaveObservations: Observations saved successfully');
      setObservationsSaved(true);
      setTimeout(() => setObservationsSaved(false), 2000);
    }
    setIsSavingObservations(false);
  }, [inspectionId, generalObservations, addToast]);


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

  const handleBackNavigation = useCallback(async () => {
    console.log('🔙 handleBackNavigation called:', {
      inspectionId,
      photosLength: photos.length,
      inspectionType,
      hasObservations: generalObservations?.length > 0
    });
    
    try {
      if (inspectionId) {
        // Save observations and any pending data before leaving
        console.log('💾 Saving observations before navigation...');
        await handleSaveObservations();
        
        // Check current status before updating - don't override 'completed' status
        if (photos.length > 0) {
          console.log('🔍 Checking current inspection status before saving...');
          const { data: currentData, error: fetchError } = await supabase
            .from('inspections')
            .select('status')
            .eq('id', inspectionId)
            .single();
            
          if (fetchError) {
            console.error('❌ Error fetching current status:', fetchError);
          } else {
            console.log('📊 Current inspection status in DB:', currentData.status);
            
            // Only update status if it's not already completed
            if (currentData.status !== 'completed') {
              console.log('📝 Updating inspection status to in-progress...');
              const { error } = await supabase
                .from('inspections')
                .update({ status: 'in-progress' })
                .eq('id', inspectionId);
                
              if (error) {
                console.error('❌ Error updating inspection status:', error);
                addToast('Erro ao salvar vistoria', 'error');
              } else {
                console.log('✅ Inspection status updated successfully');
                addToast('Vistoria salva automaticamente', 'success');
              }
            } else {
              console.log('✅ Inspection already completed, preserving status');
              addToast('Vistoria concluída mantida', 'success');
            }
          }
        } else {
          console.log('⚠️ No photos to save, skipping status update');
        }
      } else {
        console.warn('⚠️ No inspectionId found, skipping save');
      }
    } catch (error) {
      console.error('💥 Error in handleBackNavigation:', error);
      addToast('Erro ao salvar. Tente novamente.', 'error');
    }
    
    console.log('🚀 Navigating to property page...');
    
    // Force a complete reload of the property page to ensure fresh data
    // This mimics what happens when clicking "Meus Imóveis"
    navigate(`/property/${property.id}`, { 
      replace: true,
      state: { forceRefresh: true, timestamp: Date.now() }
    });
  }, [inspectionId, photos.length, property.id, navigate, inspectionType, generalObservations, addToast]);

  const generateReport = async () => {
    console.log('📊 generateReport called:', {
      inspectionId,
      photosLength: photos.length,
      inspectionType,
      currentStatus: inspectionStatus
    });
    
    if (photos.length === 0) {
      addToast('Adicione pelo menos uma foto para gerar o relatório', 'error');
      return;
    }
    if (!inspectionId) {
      console.error('❌ No inspectionId found');
      return;
    }
  
    try {
      console.log('💾 Saving observations before generating report...');
      await handleSaveObservations(); // Ensure latest observations are saved

      console.log('📝 Updating inspection status to completed...');
      const { data, error } = await supabase
        .from('inspections')
        .update({ status: 'completed' })
        .eq('id', inspectionId)
        .select()
        .single();
    
      if (error) {
        console.error('❌ Error finalizing inspection:', error);
        addToast(`Falha ao finalizar a vistoria: ${error.message}`, 'error');
        return;
      }
      
      console.log('✅ Inspection status updated to completed:', data);
      
      // Double-check: verify the update worked
      console.log('🔍 Verifying update by fetching inspection again...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('inspections')
        .select('status')
        .eq('id', inspectionId)
        .single();
        
      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
      } else {
        console.log('✅ Verification - Current status in DB:', verifyData.status);
        if (verifyData.status !== 'completed') {
          console.error('⚠️ WARNING: Status in DB is not completed!', verifyData.status);
          addToast('Erro: Status não foi salvo corretamente', 'error');
          return;
        }
      }
      
      // Update local status to reflect the change
      setInspectionStatus('completed');
      console.log('🔄 Local status updated to completed');
      
      addToast('Relatório gerado com sucesso!', 'success');
      
      console.log('🚀 Navigating to reports page with inspectionId:', inspectionId);
      navigate('/reports', { 
        state: { inspectionId } 
      });
    } catch (error) {
      console.error('💥 Error in generateReport:', error);
      addToast('Erro ao gerar relatório. Tente novamente.', 'error');
    }
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
            onClick={handleBackNavigation}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            title="Voltar (salvando automaticamente)"
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
