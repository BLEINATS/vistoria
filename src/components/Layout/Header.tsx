import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Camera, LogOut, User, Home, Settings, ChevronDown, KeyRound, CreditCard } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserName(data.full_name);
        } else if (error) {
          console.log("Info: No profile found for user");
        }
      } else {
        // Reset user name when no user is logged in
        setUserName(null);
      }
    };
    fetchProfile();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    console.log('Iniciando logout...');
    try {
      // Limpar dados locais primeiro
      localStorage.clear();
      sessionStorage.clear();
      
      // Tentar logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('Aviso no logout:', error.message);
        // Mesmo com erro, continuar o logout local
      } else {
        console.log('Logout realizado com sucesso');
      }
      
      // Aguardar um pouco para garantir que o AuthContext processe o logout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Sempre navegar para login, independente de erro na sessão
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.log('Erro inesperado no logout, fazendo logout local:', error);
      // Limpar dados e navegar mesmo com erro
      localStorage.clear();
      sessionStorage.clear();
      // Aguardar antes de navegar
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate('/login', { replace: true });
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Meus Imóveis', href: '/properties', icon: Home },
  ];

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">VistorIA</span>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            {/* User Menu Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                  Olá, {userName || user?.email?.split('@')[0]}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {userName || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Configurações
                  </Link>
                  
                  <Link
                    to="/profile/password"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 mr-3" />
                    Alterar Senha
                  </Link>
                  
                  <Link
                    to="/subscription"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 mr-3" />
                    Planos e Assinatura
                  </Link>
                  
                  <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sair
                  </button>
                </div>
              )}
            </div>
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
