import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Upload, Loader, Image } from 'lucide-react';

interface ImageUploadSettingProps {
  settingKey: string;
  label: string;
  currentImageUrl: string;
  onUpdate: (key: string, newUrl: string) => void;
}

const ImageUploadSetting: React.FC<ImageUploadSettingProps> = ({ settingKey, label, currentImageUrl, onUpdate }) => {
  const { user } = useAuth();
  const { addToast, updateToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      addToast('Por favor, selecione um arquivo de imagem.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      addToast('A imagem não pode ter mais de 5MB.', 'error');
      return;
    }

    setUploading(true);
    const toastId = addToast('Enviando imagem...', 'loading');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const filePath = `public/${user.id}/${settingKey}-${Date.now()}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('public_assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public_assets')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('landing_page_settings')
        .upsert({ key: settingKey, value: publicUrl, description: label });

      if (dbError) throw dbError;

      onUpdate(settingKey, publicUrl);
      updateToast(toastId, 'Imagem atualizada com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error uploading image setting:', error);
      updateToast(toastId, `Falha ao atualizar imagem: ${error.message}`, 'error');
      setPreview(currentImageUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg flex items-center gap-4">
      <div className="w-24 h-16 bg-gray-200 dark:bg-slate-600 rounded-md overflow-hidden flex-shrink-0">
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Image className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="flex-grow">
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {/* URL removida para um layout mais limpo */}
      </div>
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-wait"
        >
          {uploading ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {uploading ? 'Enviando...' : 'Alterar'}
        </button>
      </div>
    </div>
  );
};

export default ImageUploadSetting;
