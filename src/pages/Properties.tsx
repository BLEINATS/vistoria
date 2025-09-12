import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Home, Loader, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import PropertyCard from '../components/Properties/PropertyCard';
import PropertyForm, { PropertyFormData } from '../components/Properties/PropertyForm';
import ConfirmationModal from '../components/common/ConfirmationModal';
import PlanLimitGuard from '../components/Subscription/PlanLimitGuard';
import UsageIndicator from '../components/Subscription/UsageIndicator';
import { Property } from '../types';
import { useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

const Properties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateUsage, userLimits } = useSubscription();

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_properties_with_details');

      if (rpcError) {
        console.error('Error fetching properties from RPC:', rpcError);
        setProperties([]);
      } else if (rpcData && Array.isArray(rpcData)) {
        const mappedProperties = rpcData.map((p: any) => mapToProperty(p)).filter(Boolean) as Property[];
        setProperties(mappedProperties);
      }
    } catch (error) {
      console.error("An unexpected error occurred while fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user, fetchProperties]);

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveProperty = async (data: PropertyFormData) => {
    if (!user) {
      console.error("User not available");
      return;
    }
    
    const { facadePhotoFile, id, ...propertyData } = data;
    let facade_photo_url = propertyToEdit?.facadePhoto || null;

    if (facadePhotoFile) {
      const fileExtension = facadePhotoFile.name.split('.').pop() || 'png';
      const sanitizedFileName = facadePhotoFile.name
        .replace(`.${fileExtension}`, '')
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      
      const filePath = `${user.id}/${Date.now()}-${sanitizedFileName}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('property_facades')
        .upload(filePath, facadePhotoFile);

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('property_facades')
        .getPublicUrl(filePath);
      
      facade_photo_url = urlData.publicUrl;

      if (propertyToEdit?.facadePhoto) {
        const oldFilePath = propertyToEdit.facadePhoto.split('/property_facades/').pop();
        if (oldFilePath) {
          await supabase.storage.from('property_facades').remove([oldFilePath]);
        }
      }
    } else if (!data.facadePhotoPreview && propertyToEdit?.facadePhoto) {
      const oldFilePath = propertyToEdit.facadePhoto.split('/property_facades/').pop();
      if (oldFilePath) {
        await supabase.storage.from('property_facades').remove([oldFilePath]);
      }
      facade_photo_url = null;
    }

    const dbData = {
      name: propertyData.name,
      address: propertyData.address,
      type: propertyData.type,
      description: propertyData.description,
      facade_photo_url: facade_photo_url,
      user_id: user.id,
    };

    if (id) {
      const { error } = await supabase.from('properties').update(dbData).eq('id', id);
      if (error) console.error('Error updating property:', error);
    } else {
      const { error } = await supabase.from('properties').insert(dbData);
      if (error) console.error('Error creating property:', error);
      else {
        // Update usage tracking for new property
        await updateUsage('properties', 1);
      }
    }

    fetchProperties();
    setShowForm(false);
    setPropertyToEdit(null);
  };

  const handleOpenFormForCreate = () => {
    setPropertyToEdit(null);
    setShowForm(true);
  };

  const handleEditProperty = (property: Property) => {
    setPropertyToEdit(property);
    setShowForm(true);
  };

  const handleDeleteProperty = (property: Property) => {
    setPropertyToDelete(property);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
  
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('id')
      .eq('property_id', propertyToDelete.id);
  
    if (inspectionsError) {
      console.error('Error fetching inspections for deletion:', inspectionsError);
      return;
    }
  
    if (inspections && inspections.length > 0) {
      const inspectionIds = inspections.map(i => i.id);
      const { data: photos, error: photosError } = await supabase
        .from('inspection_photos')
        .select('photo_url')
        .in('inspection_id', inspectionIds);
  
      if (photosError) {
        console.error('Error fetching inspection photos for deletion:', photosError);
        return;
      }
  
      if (photos && photos.length > 0) {
        const filePaths = photos.map(p => p.photo_url.split('/inspection_photos/').pop()).filter(Boolean) as string[];
        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage.from('inspection_photos').remove(filePaths);
          if (storageError) console.error('Error deleting inspection photos from storage:', storageError);
        }
      }
    }
  
    if (propertyToDelete.facadePhoto) {
      const filePath = propertyToDelete.facadePhoto.split('/property_facades/').pop();
      if (filePath) {
        await supabase.storage.from('property_facades').remove([filePath]);
      }
    }
  
    const { error: deletePropertyError } = await supabase.from('properties').delete().eq('id', propertyToDelete.id);
    if (deletePropertyError) {
      console.error('Error deleting property:', deletePropertyError);
    } else {
      fetchProperties();
    }
  
    setIsDeleteModalOpen(false);
    setPropertyToDelete(null);
  };

  const handleViewDetails = (property: Property) => {
    navigate(`/property/${property.id}`);
  };

  const handleViewReport = (property: Property) => {
    const completed = property.inspections.filter(i => i.status === 'completed');
    
    if (completed.length === 0) {
      return; 
    }

    const entry = completed.find(i => i.inspection_type === 'entry');
    const exit = completed.find(i => i.inspection_type === 'exit');

    if (entry && exit) {
      navigate(`/compare/${entry.id}/${exit.id}`);
      return;
    }

    const latestCompleted = completed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    if (latestCompleted) {
      navigate(`/reports/${latestCompleted.id}`);
    }
  };
  
  const deleteMessage = propertyToDelete
    ? `Tem certeza que deseja excluir o imóvel "${propertyToDelete.name}"? ${
        propertyToDelete.inspections && propertyToDelete.inspections.length > 0
          ? 'Todas as vistorias associadas a ele também serão excluídas permanentemente. '
          : ''
      }Esta ação não pode ser desfeita.`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        
        {/* Header Section */}
        <div className="mb-8 lg:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-base lg:text-lg">Gerencie seus imóveis e vistorias</p>
            </div>
            <PlanLimitGuard action="create_property">
              <button
                onClick={handleOpenFormForCreate}
                className="inline-flex items-center justify-center px-6 py-3 lg:px-8 lg:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm lg:text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Imóvel
              </button>
            </PlanLimitGuard>
          </div>
        </div>

        {/* Usage Indicators - Improved Desktop Layout */}
        <div className="mb-8 lg:mb-12">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 lg:mb-6">Status da Conta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-slate-700">
              <UsageIndicator type="properties" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-slate-700">
              <UsageIndicator type="environments" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 lg:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-slate-700 md:col-span-2 xl:col-span-1">
              <div className="flex items-center gap-3">
                <div className="text-blue-600 dark:text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-medium text-sm lg:text-base">
                      Plano Atual
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm lg:text-base">
                      {userLimits?.plan_name || 'Carregando...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8 lg:mb-10">
          <div className="relative max-w-md lg:max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 lg:py-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base"
            />
          </div>
        </div>

        {/* Properties Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="flex justify-center items-center py-16 lg:py-24">
              <Loader className="w-12 h-12 lg:w-16 lg:h-16 text-blue-500 animate-spin" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-16 lg:py-24 px-4">
              <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8">
                <Home className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
                {searchTerm ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel cadastrado'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 lg:mb-8 max-w-md lg:max-w-lg mx-auto text-base lg:text-lg">
                {searchTerm 
                  ? 'Tente ajustar sua pesquisa para encontrar o imóvel desejado' 
                  : 'Comece adicionando seu primeiro imóvel para realizar vistorias'
                }
              </p>
              {!searchTerm && (
                <PlanLimitGuard action="create_property">
                  <button
                    onClick={handleOpenFormForCreate}
                    className="inline-flex items-center px-6 py-3 lg:px-8 lg:py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm lg:text-base"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Cadastrar Primeiro Imóvel
                  </button>
                </PlanLimitGuard>
              )}
            </div>
          ) : (
            <div className="p-4 lg:p-6">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">Meus Imóveis</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base mt-1">Total: {filteredProperties.length} imóvel{filteredProperties.length !== 1 ? 's' : ''}</p>
              </div>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {filteredProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <PropertyCard
                      property={property}
                      onViewDetails={handleViewDetails}
                      onEdit={handleEditProperty}
                      onDelete={handleDeleteProperty}
                      onViewReport={handleViewReport}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </div>

      </div>
      
      <PropertyForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setPropertyToEdit(null); }}
        onSubmit={handleSaveProperty}
        propertyToEdit={propertyToEdit}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={deleteMessage}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default Properties;
