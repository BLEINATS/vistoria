import React, { useState } from 'react';
import { DetectedObject } from '../../types';
import { translateObjectCondition, formatObjectDescription } from '../../utils/translations';
import { ArrowRight, ZoomIn } from 'lucide-react';
import { getConditionStyle } from '../../utils/styleUtils';
import ImageLightbox from '../common/ImageLightbox';

type ComparisonType = 'changed' | 'unchanged' | 'new' | 'missing';

interface ComparisonItemProps {
  item: {
    entry?: DetectedObject;
    exit?: DetectedObject;
    exitPhotoUrl?: string;
    entryPhotoUrl?: string;
  };
  type: ComparisonType;
}

interface PhotoWithMarkersProps {
  label: string;
  imageUrl?: string;
  detectedObject?: DetectedObject;
  missingObject?: DetectedObject; // Object that should be here but is missing
}

const PhotoWithMarkers: React.FC<PhotoWithMarkersProps> = ({ 
  label, 
  imageUrl, 
  detectedObject, 
  missingObject 
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!imageUrl) {
    return (
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <div className="w-full h-24 bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center text-xs text-gray-400 report-image-container">
          Sem foto
        </div>
      </div>
    );
  }

  // Remove unused variables

  return (
    <>
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <div 
          className="w-full h-24 bg-gray-100 dark:bg-slate-700 rounded-md relative cursor-pointer group overflow-hidden report-image-container"
          onClick={() => setIsLightboxOpen(true)}
        >
          <img src={imageUrl} alt={label} className="w-full h-full object-contain report-image" />
          
          {/* Marcadores visuais removidos conforme solicitado */}
          
          
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ZoomIn className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
      <ImageLightbox isOpen={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} imageUrl={imageUrl} />
    </>
  );
};

const PhotoThumbnail: React.FC<{ label: string, imageUrl?: string }> = ({ label, imageUrl }) => {
  return <PhotoWithMarkers label={label} imageUrl={imageUrl} />;
};

const ComparisonItem: React.FC<ComparisonItemProps> = ({ item, type }) => {
  
  const renderBadge = (obj: DetectedObject) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle(obj.condition)}`}>
      {translateObjectCondition(obj.condition)}
    </span>
  );

  const renderContent = () => {
    switch (type) {
      case 'changed':
        if (!item.entry || !item.exit) return null;
        if (item.exit.condition === 'not_found') {
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle('not_found')}`}>
              Não encontrada na Saída
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            {renderBadge(item.entry)}
            <ArrowRight className="w-4 h-4 text-gray-400" />
            {renderBadge(item.exit)}
          </div>
        );
      case 'unchanged':
        if (!item.entry) return null;
        return renderBadge(item.entry);
      case 'new':
        if (!item.exit) return null;
        return renderBadge(item.exit);
      case 'missing':
        if (!item.entry) return null;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionStyle('not_found')}`}>
            Faltando na Saída
          </span>
        );
      default:
        return null;
    }
  };

  const itemDescription = item.entry ? formatObjectDescription(item.entry) : formatObjectDescription(item.exit!);

  return (
    <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md report-section">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{itemDescription}</span>
        {renderContent()}
      </div>
      
      {/* Photo Comparison Module */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-slate-600 report-photo-analysis">
        {type === 'missing' ? (
          // For missing items, show the entry photo with green marker and exit photo with red "missing" marker
          <>
            <PhotoWithMarkers 
              label="Entrada" 
              imageUrl={item.entry?.photoUrl} 
              detectedObject={item.entry}
            />
            <PhotoWithMarkers 
              label="Saída" 
              imageUrl={item.exitPhotoUrl} // Use exit photo to show where object is missing
              missingObject={item.entry}
            />
          </>
        ) : type === 'new' ? (
          // For new items, show entry photo for context and exit photo with green marker
          <>
            <PhotoWithMarkers 
              label="Entrada" 
              imageUrl={item.entryPhotoUrl} 
            />
            <PhotoWithMarkers 
              label="Saída" 
              imageUrl={item.exit?.photoUrl} 
              detectedObject={item.exit}
            />
          </>
        ) : (
          // For changed/unchanged items, show both photos with markers
          <>
            <PhotoWithMarkers 
              label="Entrada" 
              imageUrl={item.entry?.photoUrl} 
              detectedObject={item.entry}
            />
            <PhotoWithMarkers 
              label="Saída" 
              imageUrl={item.exit?.photoUrl} 
              detectedObject={item.exit}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ComparisonItem;
