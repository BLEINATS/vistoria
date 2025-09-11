import React from 'react';
import { X, CheckCircle, CreditCard, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  planName: string;
  // Real payment data from backend
  pixCode?: string;
  qrCodeUrl?: string;
  boletoUrl?: string;
  invoiceUrl?: string;
  dueDate?: string;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  subscriptionId,
  paymentMethod,
  planName,
  pixCode,
  qrCodeUrl,
  boletoUrl,
  invoiceUrl,
  dueDate
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getPaymentMessage = () => {
    switch (paymentMethod) {
      case 'PIX':
        return {
          title: 'PIX Gerado com Sucesso!',
          message: 'Use o código PIX abaixo para finalizar seu pagamento. Após a confirmação, seu plano será ativado automaticamente.',
          action: 'Copiar Código PIX'
        };
      case 'BOLETO':
        return {
          title: 'Boleto Gerado com Sucesso!',
          message: 'Seu boleto foi enviado para o seu email. Você também pode imprimi-lo usando o link abaixo.',
          action: 'Imprimir Boleto'
        };
      case 'CREDIT_CARD':
        return {
          title: 'Cobrança Recorrente Ativada!',
          message: 'Sua cobrança mensal foi configurada com sucesso. O plano será ativado após a aprovação do pagamento.',
          action: 'Ver Detalhes'
        };
      default:
        return {
          title: 'Pagamento Processado!',
          message: 'Seu pagamento está sendo processado.',
          action: 'Continuar'
        };
    }
  };

  const payment = getPaymentMessage();

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
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {payment.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Plano {planName}
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
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {payment.message}
                </p>
                
                {paymentMethod === 'PIX' && pixCode && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                    {qrCodeUrl && (
                      <div className="text-center mb-4">
                        <img 
                          src={`data:image/png;base64,${qrCodeUrl}`} 
                          alt="QR Code PIX" 
                          className="mx-auto w-32 h-32"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-slate-600 px-2 py-1 rounded break-all">
                        {pixCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(pixCode)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0 ml-2"
                      >
                        <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'BOLETO' && boletoUrl && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                    <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Vencimento: {dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : 'A definir'}
                    </p>
                    <div className="space-y-2">
                      <a
                        href={boletoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 py-2 px-4 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        Ver Boleto
                      </a>
                      {invoiceUrl && (
                        <a
                          href={invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors text-sm"
                        >
                          Ver Fatura
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === 'CREDIT_CARD' && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Cobrança recorrente ativa
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (paymentMethod === 'PIX' && pixCode) {
                      copyToClipboard(pixCode);
                    } else if (paymentMethod === 'BOLETO' && boletoUrl) {
                      window.open(boletoUrl, '_blank');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  {payment.action}
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>

              {/* Status Info */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                  Após a confirmação do pagamento, seu plano será ativado automaticamente. 
                  Você receberá um email de confirmação quando isso acontecer.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PaymentSuccessModal;
