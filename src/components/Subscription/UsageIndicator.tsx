import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { FileText, MapPin, Camera, Infinity } from 'lucide-react';

interface UsageIndicatorProps {
  type: 'properties' | 'environments';
  className?: string;
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({ type, className = '' }) => {
  const { getRemainingUsage, userLimits, loading } = useSubscription();

  if (loading || !userLimits) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded h-6 w-24 ${className}`}></div>
    );
  }

  const usage = getRemainingUsage(type);
  const percentage = usage.unlimited ? 0 : (usage.used / (usage.used + usage.remaining)) * 100;
  
  const getIcon = () => {
    switch (type) {
      case 'properties':
        return <FileText className="w-4 h-4" />;
      case 'environments':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Camera className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'properties':
        return 'Propriedades';
      case 'environments':
        return 'Ambientes';
      default:
        return 'Uso';
    }
  };

  const getColorClass = () => {
    if (usage.unlimited) return 'text-green-600 dark:text-green-400';
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getProgressColor = () => {
    if (usage.unlimited) return 'bg-green-500';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${getColorClass()}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {getLabel()}
          </span>
          <span className={`font-semibold ${getColorClass()}`}>
            {usage.used} / {usage.unlimited ? <Infinity className="w-4 h-4 inline" /> : (usage.unlimited ? '∞' : usage.used + usage.remaining)}
          </span>
        </div>
        
        {!usage.unlimited && (
          <div className="mt-1">
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {usage.unlimited && (
          <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
            Ilimitado
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageIndicator;