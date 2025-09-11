import React from 'react';
import { motion } from 'framer-motion';
import { Home, Camera, Clock, AlertTriangle } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalProperties: number;
    totalInspections: number;
    pendingInspections: number;
    criticalIssues: number;
  } | null;
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; bgColor: string; textColor: string; delay: number }> = ({ title, value, icon: Icon, bgColor, textColor, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>
        <Icon className={`w-6 h-6 ${textColor}`} />
      </div>
    </div>
  </motion.div>
);

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statItems = [
    { title: 'Total de Imóveis', value: stats?.totalProperties || 0, icon: Home, bgColor: 'bg-blue-100 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
    { title: 'Total de Vistorias', value: stats?.totalInspections || 0, icon: Camera, bgColor: 'bg-green-100 dark:bg-green-500/20', textColor: 'text-green-600 dark:text-green-400' },
    { title: 'Em Andamento', value: stats?.pendingInspections || 0, icon: Clock, bgColor: 'bg-orange-100 dark:bg-orange-500/20', textColor: 'text-orange-600 dark:text-orange-400' },
    { title: 'Itens Faltando', value: stats?.criticalIssues || 0, icon: AlertTriangle, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <StatCard key={item.title} title={item.title} value={item.value} icon={item.icon} bgColor={item.bgColor} textColor={item.textColor} delay={index * 0.1} />
      ))}
    </div>
  );
};

export default DashboardStats;
