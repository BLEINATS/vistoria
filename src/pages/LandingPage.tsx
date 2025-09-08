import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, GitCompareArrows, FileText, Mic, Sparkles, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/Layout/ThemeToggle';
import { motion } from 'framer-motion';

const LandingHeader = () => (
  <header className="absolute top-0 left-0 right-0 z-10 py-4">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <Link to="/" className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">VistorIA</span>
      </Link>
      <div className="flex items-center space-x-2">
        <ThemeToggle />
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Acessar Plataforma
        </Link>
      </div>
    </div>
  </header>
);

const LandingFooter = () => (
  <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>&copy; {new Date().getFullYear()} VistorIA. Todos os direitos reservados.</p>
    </div>
  </footer>
);

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <motion.div 
    className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700"
    whileHover={{ y: -5, scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
  </motion.div>
);

const LandingPage: React.FC = () => {
  const features = [
    { icon: Sparkles, title: 'Análise com IA', description: 'Nossa IA identifica objetos, problemas e condições do ambiente a partir de fotos, gerando descrições automáticas.' },
    { icon: GitCompareArrows, title: 'Relatórios Comparativos', description: 'Compare vistorias de entrada e saída lado a lado e veja exatamente o que mudou, com destaques automáticos.' },
    { icon: FileText, title: 'Gestão Completa', description: 'Cadastre imóveis, gerencie vistorias e tenha controle total sobre os relatórios gerados, tudo em um só lugar.' },
    { icon: Mic, title: 'Ditado por Voz', description: 'Adicione observações, descreva problemas e edite relatórios usando apenas a sua voz, otimizando o trabalho em campo.' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-28">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              className="text-4xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Vistorias de Imóveis com <span className="text-blue-600 dark:text-blue-400">Inteligência Artificial</span>
            </motion.h1>
            <motion.p 
              className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Otimize seu tempo, gere relatórios precisos e compare vistorias de entrada e saída com o poder da IA. Transforme a maneira como você gerencia imóveis.
            </motion.p>
            <motion.div 
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white dark:bg-slate-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Uma Plataforma Completa</h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Tudo o que você precisa para vistorias eficientes e profissionais.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
