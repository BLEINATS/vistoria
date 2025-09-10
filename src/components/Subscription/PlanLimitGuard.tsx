import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { CreditCard, Lock, Zap } from 'lucide-react';

interface PlanLimitGuardProps {
  action: 'create_property' | 'add_environment' | 'upload_photo';
  children: React.ReactNode;
  fallbackMessage?: string;
}

const PlanLimitGuard: React.FC<PlanLimitGuardProps> = ({ 
  action, 
  children, 
  fallbackMessage 
}) => {
  const { canPerformAction, userLimits, getRemainingUsage, loading } = useSubscription();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-slate-700 rounded h-10"></div>;
  }

  const canPerform = canPerformAction(action);
  
  if (canPerform) {
    return <>{children}</>;
  }

  // Show limit reached message
  const getActionMessage = () => {
    switch (action) {
      case 'create_property':
        const propertiesUsage = getRemainingUsage('properties');
        return {
          title: 'Limite de Propriedades Atingido',
          message: `Você atingiu o limite de ${propertiesUsage.used + propertiesUsage.remaining} propriedades do plano ${userLimits?.plan_name}.`,
          cta: 'Fazer Upgrade para Criar Mais Propriedades'
        };
      
      case 'add_environment':
        const environmentsUsage = getRemainingUsage('environments');
        return {
          title: 'Limite de Ambientes Atingido',
          message: `Você atingiu o limite de ${environmentsUsage.used + environmentsUsage.remaining} ambientes do plano ${userLimits?.plan_name}.`,
          cta: 'Fazer Upgrade para Adicionar Mais Ambientes'
        };
      
      default:
        return {
          title: 'Limite Atingido',
          message: fallbackMessage || 'Você atingiu o limite do seu plano atual.',
          cta: 'Fazer Upgrade de Plano'
        };
    }
  };

  const { title, message, cta } = getActionMessage();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto mb-4">
        <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        {message}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/subscription"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Zap className="w-4 h-4" />
          {cta}
        </Link>
        
        <Link
          to="/subscription"
          className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Ver Todos os Planos
        </Link>
      </div>
      
      {userLimits && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Plano atual: {userLimits.plan_name}
        </div>
      )}
    </div>
  );
};

export default PlanLimitGuard;