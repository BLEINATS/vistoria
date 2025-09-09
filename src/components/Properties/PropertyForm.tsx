import React, { useState, useEffect } from 'react';
import { X, Camera, Building, MapPin, FileText, Save } from 'lucide-react';
import { Property } from '../../types';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

export type PropertyFormData = {
  id?: string;
  name: string;
  address: string;
  type: Property['type'];
  description: string;
  facadePhotoFile?: File | null;
  facadePhotoPreview?: string | null;
};

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => void;
  propertyToEdit?: Property | null;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ isOpen, onClose, onSubmit, propertyToEdit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    type: 'apartment',
    description: '',
    facadePhotoFile: null,
    facadePhotoPreview: null,
  });

  const isEditing = !!propertyToEdit;
  const { user } = useAuth();

  useEffect(() => {
    if (isEditing && propertyToEdit) {
      setFormData({
        id: propertyToEdit.id,
        name: propertyToEdit.name,
        address: propertyToEdit.address,
        type: propertyToEdit.type,
        description: propertyToEdit.description,
        facadePhotoPreview: propertyToEdit.facadePhoto,
        facadePhotoFile: null,
      });
      setCurrentStep(1); // Start from step 1 even when editing
    } else {
      // Reset form when opening for creation
      setFormData({
        name: '',
        address: '',
        type: 'apartment',
        description: '',
        facadePhotoFile: null,
        facadePhotoPreview: null,
      });
      setCurrentStep(1);
    }
  }, [propertyToEdit, isEditing, isOpen]);


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          facadePhotoFile: file,
          facadePhotoPreview: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      facadePhotoFile: null,
      facadePhotoPreview: null,
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const nextStep = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' && formData.type;
      case 2:
        return formData.address.trim() !== '';
      default:
        return false;
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const types = {
      apartment: 'Apartamento',
      house: 'Casa',
      commercial_room: 'Sala Comercial',
      office: 'Escritório',
      store: 'Loja',
      warehouse: 'Galpão',
      land: 'Terreno'
    };
    return types[type as keyof typeof types] || type;
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Identificação', icon: Building },
    { number: 2, title: 'Localização', icon: MapPin },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-8 py-4 sm:py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{isEditing ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}</h2>
              <p className="text-blue-100 dark:text-blue-200 mt-1 text-sm sm:text-base">{isEditing ? 'Atualize as informações do imóvel' : 'Adicione as informações do imóvel para vistoria'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors p-2 hover:bg-blue-600 rounded-lg flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted 
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400'
                        : isActive 
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="ml-2 sm:ml-3 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-700 dark:text-blue-400' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'
                      }`}>
                        Etapa {step.number}
                      </p>
                      <p className={`text-xs ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                    <div className="ml-2 sm:hidden">
                      <p className={`text-xs font-medium ${
                        isActive ? 'text-blue-700 dark:text-blue-400' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'
                      }`}>
                        {step.number}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
                      currentStep > step.number ? 'bg-green-200 dark:bg-green-800/50' : 'bg-gray-200 dark:bg-slate-700'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 bg-white dark:bg-slate-900">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6 sm:mb-8">
                    <Building className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Identificação do Imóvel</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Vamos começar com as informações básicas</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome/Identificação *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
                        placeholder="Ex: Apartamento Centro, Casa da Praia..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo do Imóvel *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as Property['type'] })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white"
                      >
                        <option value="apartment">Apartamento</option>
                        <option value="house">Casa</option>
                        <option value="commercial_room">Sala Comercial</option>
                        <option value="office">Escritório</option>
                        <option value="store">Loja</option>
                        <option value="warehouse">Galpão</option>
                        <option value="land">Terreno</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Foto da Fachada</label>
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="facade-photo" />
                        <label htmlFor="facade-photo" className="w-full h-32 sm:h-40 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                          {formData.facadePhotoPreview ? (
                            <div className="relative w-full h-full">
                              <img src={formData.facadePhotoPreview} alt="Preview da fachada" className="w-full h-full object-cover rounded-lg" />
                              <button type="button" onClick={(e) => { e.preventDefault(); removePhoto(); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <><Camera className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-slate-400 mb-2" /><span className="text-sm text-gray-600 dark:text-gray-400 text-center px-2">Clique para adicionar foto</span></>
                          )}
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição (Opcional)</label>
                      <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400" placeholder="Informações adicionais..."></textarea>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6 sm:mb-8">
                    <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Localização e Resumo</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Confirme as informações para finalizar</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endereço Completo *</label>
                    <textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={4} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400" placeholder="Rua, número, complemento&#10;Bairro, Cidade, Estado&#10;CEP"></textarea>
                  </div>
                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center"><FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />Resumo</h4>
                    <div className="space-y-3 sm:space-y-4 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div><span className="font-medium text-gray-600 dark:text-gray-400">Nome:</span><p className="text-gray-900 dark:text-gray-100 break-words">{formData.name || 'Não informado'}</p></div>
                        <div><span className="font-medium text-gray-600 dark:text-gray-400">Tipo:</span><p className="text-gray-900 dark:text-gray-100">{getPropertyTypeLabel(formData.type)}</p></div>
                      </div>
                      <div><span className="font-medium text-gray-600 dark:text-gray-400">Endereço:</span><p className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-line">{formData.address || 'Não informado'}</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div><span className="font-medium text-gray-600 dark:text-gray-400">Responsável:</span><p className="text-gray-900 dark:text-gray-100 break-words">{user?.email}</p></div>
                        <div><span className="font-medium text-gray-600 dark:text-gray-400">Foto:</span><p className="text-gray-900 dark:text-gray-100">{formData.facadePhotoPreview ? 'Adicionada ✅' : 'Não adicionada ❌'}</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-8 py-4 sm:py-6 flex-shrink-0">
            <div className="flex justify-between items-center">
              <button type="button" onClick={currentStep === 1 ? onClose : prevStep} className="px-4 sm:px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium text-sm sm:text-base">
                {currentStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>
              
              <div className="flex space-x-3">
                {currentStep < 2 ? (
                  <button type="button" onClick={nextStep} disabled={!isStepValid()} className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 font-medium text-sm sm:text-base">
                    Próximo
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSubmit} 
                    disabled={!isStepValid()} 
                    className={`px-4 sm:px-6 py-2 text-white rounded-lg font-medium flex items-center text-sm sm:text-base ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400 dark:disabled:bg-slate-600`}
                  >
                    {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Building className="w-4 h-4 mr-2" />}
                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Imóvel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyForm;
