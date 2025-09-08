import React from 'react';
import { Trash2, X, Loader } from 'lucide-react';
import { InspectionPhoto, AIAnalysisResult } from '../../types';
import PhotoUpload from './PhotoUpload';
import AnalysisResult from './AnalysisResult';

interface RoomInspectionCardProps {
  roomName: string;
  photos: InspectionPhoto[];
  onPhotoAnalyzed: (file: File, roomName: string) => void;
  onUpdateAnalysis: (photoId: string, newAnalysis: AIAnalysisResult) => void;
  onDeleteRoom: () => void;
  onDeletePhoto: (photo: InspectionPhoto) => void;
  uploadError?: string | null;
  clearError: () => void;
  isAnalyzing: boolean;
}

const RoomInspectionCard: React.FC<RoomInspectionCardProps> = ({
  roomName,
  photos,
  onPhotoAnalyzed,
  onUpdateAnalysis,
  onDeleteRoom,
  onDeletePhoto,
  uploadError,
  clearError,
  isAnalyzing,
}) => {
  const photoCount = photos.length;
  const canUpload = photoCount < 5;

  const handleUploadForThisRoom = (file: File) => {
    onPhotoAnalyzed(file, roomName);
  };
  
  const sanitizedRoomName = roomName.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{roomName}</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
            {photoCount} / 5 fotos
          </span>
          <button
            onClick={onDeleteRoom}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50"
            title="Excluir este ambiente e todas as suas fotos permanentemente."
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir Ambiente
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-red-700 dark:text-red-200 flex items-center justify-between">
          <p className="text-sm">{uploadError}</p>
          <button onClick={clearError} className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {isAnalyzing && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-200 flex items-center justify-center">
          <Loader className="w-5 h-5 mr-3 animate-spin" />
          <p className="text-sm font-medium">Analisando imagem com a IA...</p>
        </div>
      )}

      <div className="space-y-4">
        {photos.map((photo) => (
          <AnalysisResult
            key={photo.id}
            photoId={photo.id}
            analysis={photo.analysisResult}
            photoUrl={photo.url}
            onUpdateAnalysis={onUpdateAnalysis}
            onDeletePhoto={() => onDeletePhoto(photo)}
          />
        ))}
      </div>

      {canUpload && !isAnalyzing ? (
        <div className="mt-6">
          <PhotoUpload 
            onPhotoUploaded={handleUploadForThisRoom} 
            idSuffix={sanitizedRoomName} 
            roomName={roomName}
          />
        </div>
      ) : !isAnalyzing && (
        <div className="mt-6 text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <p className="font-medium text-green-700 dark:text-green-300">
            Limite de 5 fotos atingido para este ambiente.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomInspectionCard;
