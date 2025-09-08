import React from 'react';
import { InspectionSummary } from '../../types';
import { CheckCircle, Clock, GitCompareArrows, CircleDotDashed, AlertCircle } from 'lucide-react';

interface InspectionStatusBadgeProps {
  inspections: InspectionSummary[];
}

const InspectionStatusBadge: React.FC<InspectionStatusBadgeProps> = ({ inspections }) => {
  const entryInspection = inspections.find(i => i.inspection_type === 'entry');
  const exitInspection = inspections.find(i => i.inspection_type === 'exit');

  let status: { text: string; icon: React.ElementType; color: string };

  if (!entryInspection) {
    status = { text: 'Nenhuma Vistoria', icon: CircleDotDashed, color: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200' };
  } else if (entryInspection.status === 'in-progress') {
    status = { text: 'Entrada em Andamento', icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
  } else if (entryInspection.status === 'completed' && !exitInspection) {
    status = { text: 'Aguardando Saída', icon: CheckCircle, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' };
  } else if (exitInspection?.status === 'in-progress') {
    status = { text: 'Saída em Andamento', icon: Clock, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' };
  } else if (entryInspection.status === 'completed' && exitInspection?.status === 'completed') {
    status = { text: 'Vistorias Concluídas', icon: GitCompareArrows, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
  } else {
    // Fallback for any other state
    status = { text: 'Status Indefinido', icon: AlertCircle, color: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200' };
  }

  const Icon = status.icon;

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${status.color}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {status.text}
    </div>
  );
};

export default InspectionStatusBadge;
