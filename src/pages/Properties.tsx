import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Home, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import PropertyCard from '../components/Properties/PropertyCard';
import PropertyForm, { PropertyFormData } from '../components/Properties/PropertyForm';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { Property } from '../types';
import { useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_properties_with_details');

      if (rpcError) {
        console.error('Error fetching properties from RPC:', rpcError);
        setProperties([]);
      } else if (rpcData && Array.isArray(rpcData)) {
        const mappedProperties = rpcData.map((p: any) => mapToProperty(p, p.responsible_name)).filter(Boolean) as Property[];
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
    console.log('🏠 Iniciando salvamento do imóvel:', data);
    
    if (!user) {
      console.error("❌ Usuário não disponível");
      alert("Erro: Usuário não autenticado");
      return;
    }
    
    try {
      const { facadePhotoFile, id, ...propertyData } = data;
      let facade_photo_url = propertyToEdit?.facadePhoto || null;

      // Upload da foto se existir
      if (facadePhotoFile) {
        console.log('📸 Fazendo upload da foto...');
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
          console.error('❌ Erro no upload da foto:', uploadError);
          alert(`Erro ao fazer upload da foto: ${uploadError.message}`);
          return;
        }

        console.log('✅ Foto enviada com sucesso');
        const { data: urlData } = supabase.storage
          .from('property_facades')
          .getPublicUrl(filePath);
        
        facade_photo_url = urlData.publicUrl;

        // Remove foto antiga se estava editando
        if (propertyToEdit?.facadePhoto) {
          const oldFilePath = propertyToEdit.facadePhoto.split('/property_facades/').pop();
          if (oldFilePath) {
            await supabase.storage.from('property_facades').remove([oldFilePath]);
          }
        }
      } else if (!data.facadePhotoPreview && propertyToEdit?.facadePhoto) {
        // Remove foto se foi removida na edição
        const oldFilePath = propertyToEdit.facadePhoto.split('/property_facades/').pop();
        if (oldFilePath) {
          await supabase.storage.from('property_facades').remove([oldFilePath]);
        }
        facade_photo_url = null;
      }

      // Dados para o banco
      const dbData = {
        name: propertyData.name,
        address: propertyData.address,
        type: propertyData.type,
        description: propertyData.description,
        facade_photo_url: facade_photo_url,
        user_id: user.id,
      };

      console.log('💾 Salvando no banco de dados:', dbData);

      let result;
      if (id) {
        // Atualização
        result = await supabase.from('properties').update(dbData).eq('id', id);
        console.log('📝 Resultado da atualização:', result);
      } else {
        // Criação
        result = await supabase.from('properties').insert(dbData);
        console.log('➕ Resultado da criação:', result);
      }

      if (result.error) {
        console.error('❌ Erro ao salvar no banco:', result.error);
        alert(`Erro ao salvar imóvel: ${result.error.message}`);
        return;
      }

      console.log('✅ Imóvel salvo com sucesso!');
      
      // Atualiza a lista e fecha o formulário
      await fetchProperties();
      setShowForm(false);
      setPropertyToEdit(null);
      
      alert(id ? 'Imóvel atualizado com sucesso!' : 'Imóvel cadastrado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      alert(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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
    const entryInspection = property.inspections.find(i => i.inspection_type === 'entry' && i.status === 'completed');
    const exitInspection = property.inspections.find(i => i.inspection_type === 'exit' && i.status === 'completed');

    if (entryInspection && exitInspection) {
      navigate(`/compare/${entryInspection.id}/${exitInspection.id}`);
    } else if (entryInspection) {
      navigate('/reports', { state: { inspectionId: entryInspection.id } });
    } else if (exitInspection) {
      navigate('/reports', { state: { inspectionId: exitInspection.id } });
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie seus imóveis e vistorias</p>
        </div>
        <button
          onClick={handleOpenFormForCreate}
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Imóvel
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-32 h-32 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="w-12 h-12 text-gray-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {searchTerm ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel cadastrado'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchTerm 
              ? 'Tente ajustar sua pesquisa para encontrar o imóvel desejado' 
              : 'Comece adicionando seu primeiro imóvel para realizar vistorias'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenFormForCreate}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Cadastrar Primeiro Imóvel
            </button>
          )}
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
      )}

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
