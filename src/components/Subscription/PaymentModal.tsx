import React, { useState } from 'react';
import { X, CreditCard, Zap, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SubscriptionPlan } from '../../types/subscription';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onConfirm: (paymentMethod: 'BOLETO' | 'CREDIT_CARD') => void;
  loading: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  onConfirm,
  loading
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'BOLETO' | 'CREDIT_CARD'>('CREDIT_CARD');

  if (!plan) return null;

  const getPlanIcon = () => {
    switch (plan.name) {
      case 'Básico':
        return <Zap className="w-8 h-8 text-blue-500" />;
      case 'Profissional':
        return <Crown className="w-8 h-8 text-purple-500" />;
      case 'Empresarial':
        return <Crown className="w-8 h-8 text-yellow-500" />;
      default:
        return <CreditCard className="w-8 h-8 text-gray-500" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return '🏦';
      case 'BOLETO':
        return '🧾';
      case 'CREDIT_CARD':
        return '💳';
      default:
        return '💳';
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'PIX':
        return 'PIX (Instantâneo)';
      case 'BOLETO':
        return 'Boleto Bancário';
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      default:
        return 'PIX';
    }
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'PIX':
        return 'Pagamento instantâneo via PIX. Aprovação imediata.';
      case 'BOLETO':
        return 'Boleto com vencimento em 3 dias úteis.';
      case 'CREDIT_CARD':
        return 'Cobrança recorrente mensal no cartão.';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {getPlanIcon()}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Plano {plan.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    R$ {plan.price.toFixed(0)}/mês
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Escolha a forma de pagamento
                </h3>
                
                <div className="space-y-3">
                  {['BOLETO', 'CREDIT_CARD'].map((method) => (
                    <label
                      key={method}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedMethod === method
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={selectedMethod === method}
                        onChange={(e) => setSelectedMethod(e.target.value as 'BOLETO' | 'CREDIT_CARD')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{getMethodIcon(method)}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {getMethodName(method)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getMethodDescription(method)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Plano {plan.name}</span>
                  <span>R$ {plan.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-gray-900 dark:text-gray-100">
                  <span>Total mensal</span>
                  <span>R$ {plan.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Features Reminder */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Incluído no plano:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• {plan.properties_limit ? `${plan.properties_limit} propriedades` : 'Propriedades ilimitadas'}</li>
                  <li>• {plan.environments_limit ? `${plan.environments_limit} ambientes` : 'Ambientes ilimitados'}</li>
                  <li>• {plan.photos_per_environment_limit} fotos por ambiente</li>
                  <li>• Análise com IA</li>
                  <li>• Relatórios comparativos</li>
                  <li>• Exportação em PDF</li>
                  {plan.name === 'Empresarial' && (
                    <>
                      <li>• Suporte prioritário</li>
                      <li>• API para integrações</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirm(selectedMethod)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;