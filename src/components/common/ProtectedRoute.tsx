import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader } from 'lucide-react';

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute: loading =', loading, 'user =', user?.id);

  if (loading) {
    console.log('ProtectedRoute: Still loading, showing spinner');
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Entrando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: User authenticated, allowing access');
  return <Outlet />;
};

export default ProtectedRoute;
