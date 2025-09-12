import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, CreditCard } from 'lucide-react';
import { useCredits } from '../../hooks/useCredits';
import type { CreditPackage } from '../../hooks/useCredits';

interface CreditPackagesProps {
  onSelectPackage: (pkg: CreditPackage) => void;
  loading?: boolean;
}

const CreditPackages: React.FC<CreditPackagesProps> = ({ onSelectPackage, loading = false }) => {
  const { creditPackages, userCredits } = useCredits();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getPricePerCredit = (pkg: CreditPackage) => {
    return pkg.price / pkg.credits;
  };

  return (
    <div className="space-y-6">
      {/* Current Credits Display */}
      {userCredits && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Seus Créditos
              </h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {userCredits.remaining_credits}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {userCredits.used_credits} utilizados de {userCredits.total_credits} totais
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      )}

      {/* Credit Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {creditPackages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 ${
              pkg.popular
                ? 'border-purple-300 dark:border-purple-600 shadow-lg scale-105'
                : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
            onClick={() => onSelectPackage(pkg)}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Mais Popular
                </div>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {pkg.name}
              </h3>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(pkg.price)}
                </div>
                {pkg.discount > 0 && (
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {pkg.discount}% de desconto
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatPrice(getPricePerCredit(pkg))} por crédito
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  {pkg.credits} {pkg.credits === 1 ? 'propriedade' : 'propriedades'}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  Créditos sem validade
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500" />
                  Vistoria completa por crédito
                </div>
              </div>

              <button
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  pkg.popular
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Processando...' : 'Comprar Créditos'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          💡 <strong>Como funciona:</strong> 1 crédito = 1 propriedade cadastrada = 1 vistoria completa (entrada + saída)
        </p>
      </div>
    </div>
  );
};

export default CreditPackages;