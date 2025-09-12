import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { useCredits } from '../../hooks/useCredits';
import { Lock, CreditCard, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export type SecurityAction = 
  | 'create_property' 
  | 'add_environment' 
  | 'upload_photo' 
  | 'use_ai_analysis'
  | 'generate_report';

interface PlanSecurityGuardProps {
  action: SecurityAction;
  children: React.ReactNode;
  requiresCredit?: boolean; // For pay-per-use actions
  fallbackComponent?: React.ReactNode;
}

const PlanSecurityGuard: React.FC<PlanSecurityGuardProps> = ({
  action,
  children,
  requiresCredit = false,
  fallbackComponent
}) => {
  const { canPerformAction, userLimits, getRemainingUsage, loading } = useSubscription();
  const { userCredits } = useCredits();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg h-20 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Verificando permissões...</div>
      </div>
    );
  }

  // Check if user is on pay-per-use and action requires credit
  const isPayPerUse = userLimits?.plan_name === 'Pay-per-use';
  const needsCredit = requiresCredit && (isPayPerUse || action === 'create_property');

  // For pay-per-use: check credits first (use client-side credit count as it's already fetched)
  const hasCredits = userCredits ? userCredits.remaining_credits > 0 : false;
  if (needsCredit && !hasCredits) {
    return fallbackComponent || (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Créditos Insuficientes
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {userCredits?.remaining_credits === 0 
            ? 'Você não possui créditos disponíveis.'
            : 'Esta ação requer créditos para ser executada.'
          }
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/subscription"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Comprar Créditos
          </Link>
        </div>
      </div>
    );
  }

  // For subscription plans: check limits
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
      
      case 'upload_photo':
        return {
          title: 'Limite de Fotos Atingido',
          message: `Você atingiu o limite de fotos por ambiente do plano ${userLimits?.plan_name}.`,
          cta: 'Fazer Upgrade para Mais Fotos'
        };
      
      case 'use_ai_analysis':
        return {
          title: 'Limite de Análises IA Atingido',
          message: `Você atingiu o limite de análises por IA do plano ${userLimits?.plan_name}.`,
          cta: 'Fazer Upgrade para Mais Análises'
        };
      
      case 'generate_report':
        return {
          title: 'Limite de Relatórios Atingido',
          message: `Você atingiu o limite de relatórios do plano ${userLimits?.plan_name}.`,
          cta: 'Fazer Upgrade para Mais Relatórios'
        };
      
      default:
        return {
          title: 'Limite Atingido',
          message: `Você atingiu o limite do seu plano atual (${userLimits?.plan_name}).`,
          cta: 'Fazer Upgrade de Plano'
        };
    }
  };

  const { title, message, cta } = getActionMessage();

  return fallbackComponent || (
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
          <AlertTriangle className="w-4 h-4" />
          {cta}
        </Link>
        
        {action === 'create_property' && (
          <Link
            to="/subscription?tab=credits"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Comprar Créditos Avulsos
          </Link>
        )}
      </div>
    </div>
  );
};

export default PlanSecurityGuard;