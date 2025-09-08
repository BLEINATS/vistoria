import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Loader, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'loading';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    color: 'bg-green-500 border-green-600',
    iconColor: 'text-white',
  },
  error: {
    icon: XCircle,
    color: 'bg-red-500 border-red-600',
    iconColor: 'text-white',
  },
  loading: {
    icon: Loader,
    color: 'bg-blue-500 border-blue-600',
    iconColor: 'text-white',
  },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (type !== 'loading') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-dismiss after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex items-center w-full max-w-sm p-4 text-white ${config.color} rounded-lg shadow-lg border-b-4`}
      role="alert"
    >
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${config.iconColor}`}>
        <Icon className={`w-6 h-6 ${type === 'loading' ? 'animate-spin' : ''}`} />
      </div>
      <div className="ml-3 text-sm font-normal flex-1">{message}</div>
      {type !== 'loading' && (
        <button
          type="button"
          className="ml-auto -mx-1.5 -my-1.5 bg-white/10 text-white hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100/50 inline-flex items-center justify-center h-8 w-8"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  );
};

export default Toast;
