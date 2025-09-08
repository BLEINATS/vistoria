import React, { useCallback, useState } from 'react';
import { Upload, Camera } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoUploaded: (file: File) => void;
  idSuffix: string;
  roomName: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onPhotoUploaded, idSuffix, roomName }) => {
  const [dragActive, setDragActive] = useState(false);
  const uniqueId = `photo-upload-${idSuffix}`;

  const handleFiles = useCallback((files: FileList) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      onPhotoUploaded(file);
    }
  }, [onPhotoUploaded]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id={uniqueId}
      />
      
      <Camera className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Adicionar Foto para Análise da <span className="font-bold text-blue-600 dark:text-blue-400">{roomName}</span>
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Arraste uma foto aqui ou clique para selecionar
      </p>
      
      <label
        htmlFor={uniqueId}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
      >
        <Upload className="w-4 h-4 mr-2" />
        Selecionar Foto
      </label>
      
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
        Formatos suportados: JPG, PNG, WebP
      </p>
    </div>
  );
};

export default PhotoUpload;
