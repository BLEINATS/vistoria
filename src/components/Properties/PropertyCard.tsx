import React, { useState } from 'react';
import { MapPin, FileText, Calendar, User, Pencil, Trash2, ZoomIn, SlidersHorizontal, Camera } from 'lucide-react';
import { Property } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlowCard } from '../ui/spotlight-card';
import ImageLightbox from '../common/ImageLightbox';
import InspectionStatusBadge from './InspectionStatusBadge';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onViewReport: (property: Property) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onViewDetails,
  onEdit,
  onDelete,
  onViewReport
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const typeStyleMapping = {
    apartment: { glow: 'blue', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 border border-blue-200 dark:border-blue-400/50' },
    house: { glow: 'green', badge: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200 border border-green-200 dark:border-green-400/50' },
    commercial_room: { glow: 'purple', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200 border border-purple-200 dark:border-purple-400/50' },
    office: { glow: 'orange', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200 border border-orange-200 dark:border-orange-400/50' },
    store: { glow: 'red', badge: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200 border border-red-200 dark:border-red-400/50' },
    warehouse: { glow: 'blue', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-400/50' },
    land: { glow: 'green', badge: 'bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-200 border border-lime-200 dark:border-lime-400/50' }
  };
  
  const style = typeStyleMapping[property.type as keyof typeof typeStyleMapping] || typeStyleMapping.apartment;

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
  
  const imageUrl = property.facadePhoto || `https://source.unsplash.com/random/800x600?building&sig=${property.id}`;

  const canViewReport = property.inspections.some(i => i.status === 'completed');
  
  const entryInspection = property.inspections.find(i => i.inspection_type === 'entry');
  const exitInspection = property.inspections.find(i => i.inspection_type === 'exit');

  return (
    <>
      <GlowCard 
        glowColor={style.glow as any}
        customSize={true} 
        className="!p-0 !gap-0 !grid-rows-none !shadow-lg !shadow-black/20"
      >
        <div className="w-full h-full bg-white/70 dark:bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col transition-all duration-300">
          <div 
            className="h-48 bg-slate-100 dark:bg-slate-800 relative cursor-pointer group"
            onClick={() => setIsLightboxOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`Fachada de ${property.name}`}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
              <ZoomIn className="w-8 h-8 text-white" />
            </div>
            <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm backdrop-blur-sm ${style.badge}`}>
              {getPropertyTypeLabel(property.type)}
            </div>
          </div>

          <div className="p-5 flex flex-col flex-grow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{property.name}</h3>
            
            <div className="flex items-start text-gray-700 dark:text-gray-300 mb-3">
              <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
              <span className="text-sm line-clamp-2">{property.address}</span>
            </div>

            <div className="flex items-center text-gray-800 dark:text-gray-200 mb-4">
              <User className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium">{property.responsibleName}</span>
            </div>
            
            <div className="mb-4">
              <InspectionStatusBadge inspections={property.inspections || []} />
            </div>

            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2 space-x-4">
              <div className="flex items-center">
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Entrada: <strong>{entryInspection?.photoCount || 0} fotos</strong>
              </div>
              <div className="flex items-center">
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Saída: <strong>{exitInspection?.photoCount || 0} fotos</strong>
              </div>
            </div>

            <div className="flex-grow" />

            <div className="flex items-center text-gray-500 dark:text-gray-400 my-4">
              <Calendar className="w-4 h-4 mr-1.5" />
              <span className="text-xs">
                Cadastrado em {format(new Date(property.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>

            <div className="border-t border-gray-900/10 dark:border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(property)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-900/5 dark:hover:bg-white/10 rounded-full transition-colors"
                    title="Editar Imóvel"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(property)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-900/5 dark:hover:bg-white/10 rounded-full transition-colors"
                    title="Excluir Imóvel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  {canViewReport && (
                    <button
                      onClick={() => onViewReport(property)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Relatório
                    </button>
                  )}
                  <button
                    onClick={() => onViewDetails(property)}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center shadow-lg shadow-blue-500/20"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                    Gerenciar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={imageUrl}
      />
    </>
  );
};

export default PropertyCard;
