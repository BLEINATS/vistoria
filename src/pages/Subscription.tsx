import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionManagement } from '../hooks/useSubscriptionManagement';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft, Check, CreditCard, FileText, Zap, Crown, Sparkles } from 'lucide-react';
import PaymentModal from '../components/Subscription/PaymentModal';

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans, userLimits, loading, getRemainingUsage } = useSubscription();
  const { createSubscription, simulateUpgrade, loading: upgradeLoading } = useSubscriptionManagement();
  const { addToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [planToUpgrade, setPlanToUpgrade] = useState<any>(null);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    // For free plan, use direct upgrade
    if (plan.price === 0) {
      setSelectedPlan(planId);
      const result = await simulateUpgrade(plan);
      
      if (result.success) {
        addToast(result.message, 'success');
        window.location.reload();
      } else {
        addToast(result.message, 'error');
      }
      
      setSelectedPlan(null);
      return;
    }

    // For paid plans, show payment modal
    setPlanToUpgrade(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => {
    if (!planToUpgrade) return;
    
    const result = await createSubscription(planToUpgrade, paymentMethod);
    
    if (result.success) {
      addToast(result.message, 'success');
      setShowPaymentModal(false);
      setPlanToUpgrade(null);
      // Optionally redirect to a success page or refresh
      setTimeout(() => window.location.reload(), 2000);
    } else {
      addToast(result.message, 'error');
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPlanToUpgrade(null);
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Gratuito':
        return <Sparkles className="w-6 h-6" />;
      case 'Básico':
        return <Zap className="w-6 h-6" />;
      case 'Premium':
        return <Crown className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'Gratuito':
        return 'from-gray-500 to-gray-600';
      case 'Básico':
        return 'from-blue-500 to-blue-600';
      case 'Premium':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Carregando planos...</div>
        </div>
      </div>
    );
  }

  const propertiesUsage = getRemainingUsage('properties');
  const environmentsUsage = getRemainingUsage('environments');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Escolha seu Plano
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Gerencie mais propriedades e tenha acesso a recursos exclusivos
            </p>
          </div>
        </div>
      </div>

      {/* Current Usage Summary */}
      {userLimits && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-white text-lg font-semibold mb-4">Seu Uso Atual</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Propriedades</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {propertiesUsage.used} / {propertiesUsage.unlimited ? '∞' : propertiesUsage.used + propertiesUsage.remaining}
                </div>
                <p className="text-white/60 text-sm">
                  Plano: {userLimits.plan_name}
                </p>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">Ambientes</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {environmentsUsage.used} / {environmentsUsage.unlimited ? '∞' : environmentsUsage.used + environmentsUsage.remaining}
                </div>
                <p className="text-white/60 text-sm">
                  Por propriedade
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = userLimits?.plan_name === plan.name;
            const isPopular = plan.name === 'Básico';
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white/10 backdrop-blur-sm rounded-xl border-2 transition-all duration-300 hover:transform hover:scale-105 ${
                  isCurrentPlan 
                    ? 'border-green-400 shadow-2xl shadow-green-400/20' 
                    : isPopular
                    ? 'border-blue-400 shadow-2xl shadow-blue-400/20'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                      MAIS POPULAR
                    </div>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                      PLANO ATUAL
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${getPlanColor(plan.name)} flex items-center justify-center mx-auto mb-4 text-white`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-white mb-1">
                      {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(0)}`}
                    </div>
                    {plan.price > 0 && (
                      <p className="text-white/60">por mês</p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">
                        {plan.properties_limit ? `${plan.properties_limit} propriedades` : 'Propriedades ilimitadas'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">
                        {plan.environments_limit ? `${plan.environments_limit} ambientes por propriedade` : 'Ambientes ilimitados'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">
                        {plan.photos_per_environment_limit} fotos por ambiente
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">
                        Análise com IA
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">
                        Relatórios comparativos
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">
                        Exportação em PDF
                      </span>
                    </div>

                    {plan.name === 'Premium' && (
                      <>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-white">
                            Suporte prioritário
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-white">
                            API para integrações
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="text-center">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full bg-green-500/20 text-green-400 border border-green-400 py-3 px-6 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Plano Atual
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgradeLoading && selectedPlan === plan.id}
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                          plan.name === 'Gratuito' 
                            ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                            : `bg-gradient-to-r ${getPlanColor(plan.name)} text-white hover:shadow-lg hover:shadow-blue-500/25`
                        } ${upgradeLoading && selectedPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {upgradeLoading && selectedPlan === plan.id ? 'Processando...' : 
                         plan.name === 'Gratuito' ? 'Fazer Downgrade' : 'Escolher Plano'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ/Benefits */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Por que escolher um plano pago?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 rounded-lg p-6">
              <CreditCard className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Sem Limites</h3>
              <p className="text-white/60 text-sm">
                Gerencie quantas propriedades precisar sem restrições
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-6">
              <Zap className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Mais Eficiência</h3>
              <p className="text-white/60 text-sm">
                Análises completas com IA e relatórios profissionais
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-6">
              <Crown className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Suporte Premium</h3>
              <p className="text-white/60 text-sm">
                Atendimento prioritário e recursos exclusivos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        plan={planToUpgrade}
        onConfirm={handlePaymentConfirm}
        loading={upgradeLoading}
      />
    </div>
  );
};

export default Subscription;