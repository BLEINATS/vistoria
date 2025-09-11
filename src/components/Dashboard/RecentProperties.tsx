import React from 'react';
import { Home, Camera, FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentActivityProps {
  activity: Array<{
    type: 'property' | 'inspection' | 'report';
    title: string;
    date: Date;
    propertyName?: string;
  }> | undefined;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activity }) => {
  const getIcon = (type: 'property' | 'inspection' | 'report') => {
    switch (type) {
      case 'property': return <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'inspection': return <Camera className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'report': return <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default: return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBgColor = (type: 'property' | 'inspection' | 'report') => {
    switch (type) {
      case 'property': return 'bg-blue-100 dark:bg-blue-500/20';
      case 'inspection': return 'bg-green-100 dark:bg-green-500/20';
      case 'report': return 'bg-purple-100 dark:bg-purple-500/20';
      default: return 'bg-gray-100 dark:bg-gray-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Activity className="w-5 h-5 mr-2" />
        Atividade Recente
      </h3>
      <div className="space-y-4">
        {activity && activity.length > 0 ? activity.map((item, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <div className={`p-2 rounded-full ${getBgColor(item.type)}`}>
              {getIcon(item.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.title}
              </p>
              {item.propertyName && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.propertyName}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {item.date.toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        )) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            Nenhuma atividade recente
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default RecentActivity;
