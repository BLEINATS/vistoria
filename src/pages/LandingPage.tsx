import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, GitCompareArrows, FileText, Bot, ShieldCheck, ArrowRight, Star, Zap, Users, Building2 } from 'lucide-react';
import ThemeToggle from '../components/Layout/ThemeToggle';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

const LandingHeader = () => (
  <header className="absolute top-0 left-0 right-0 z-50 py-4">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <Link to="/" className="flex items-center space-x-2">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">VistorIA</span>
      </Link>
      <div className="flex items-center space-x-2">
        <ThemeToggle />
        <Link to="/login" className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30">Login</Link>
        <Link to="/signup" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md">Começar Agora</Link>
      </div>
    </div>
  </header>
);

const LandingFooter = () => (
  <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">&copy; {new Date().getFullYear()} VistorIA. Todos os direitos reservados.</p>
        <div className="flex items-center space-x-2">
            <a href="#features" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Funcionalidades</a>
            <a href="#how-it-works" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Como Funciona</a>
        </div>
      </div>
    </div>
  </footer>
);

const BentoCard = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.5 }}
    transition={{ duration: 0.5 }}
    className={`bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 backdrop-blur-sm flex flex-col ${className}`}
  >
    {children}
  </motion.div>
);

const LandingPage: React.FC = () => {
  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase.from('landing_page_settings').select('key, value');
      if (error) {
        console.error('Error fetching landing page images:', error);
      } else {
        const imageMap = data.reduce((acc, { key, value }) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        setPageImages(imageMap);
      }
      setImagesLoading(false);
    };
    fetchImages();
  }, []);

  const testimonials = [
    { name: 'João Silva', role: 'Corretor de Imóveis', text: 'O VistorIA transformou minhas vistorias. O que levava horas agora leva minutos, e os relatórios são incrivelmente profissionais.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { name: 'Maria Oliveira', role: 'Gerente de Locação', text: 'A comparação de entrada e saída é fantástica. Nunca mais perdemos um detalhe e as disputas com inquilinos praticamente acabaram.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705d' },
    { name: 'Carlos Pereira', role: 'Vistoriador Autônomo', text: 'A análise por IA é um divisor de águas. A precisão na identificação de itens e problemas me economiza um tempo enorme em campo.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d' },
  ];

  const benefits = [
    { icon: Bot, text: "Relatórios automáticos com fotos e IA", color: "blue" },
    { icon: Zap, text: "Vistorias até 10x mais rápidas", color: "green" },
    { icon: GitCompareArrows, text: "Comparação inteligente entre vistorias de entrada e saída", color: "purple" },
    { icon: Users, text: "Ideal para proprietários, inquilinos e corretores", color: "orange" },
    { icon: Building2, text: "Perfeito para imobiliárias, construtoras e administradoras", color: "red" },
    { icon: ShieldCheck, text: "Registro confiável e seguro, sem papelada", color: "teal" }
  ];

  const getImage = (key: string, fallback: string) => !imagesLoading ? (pageImages[key] || fallback) : fallback;

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-grow">
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gray-50 dark:bg-slate-900"></div>
            <div className="absolute inset-x-0 top-0 h-[800px] bg-gradient-to-b from-blue-100/50 dark:from-blue-900/20 to-transparent"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="inline-block bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium px-4 py-1.5 rounded-full mb-4 text-sm">A Revolução das Vistorias de Imóveis</motion.div>
            <motion.h1 className="text-4xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>Vistorias <span className="text-blue-600 dark:text-blue-400">10x mais rápidas</span> com Inteligência Artificial</motion.h1>
            <motion.p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>Fotografe, analise e compare. Nossa IA gera relatórios detalhados, identifica problemas e economiza seu tempo.</motion.p>
            <motion.div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Link to="/signup" className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform hover:scale-105 text-lg font-semibold shadow-lg">Crie sua conta grátis<ArrowRight className="w-5 h-5 ml-2" /></Link>
            </motion.div>
            <motion.div className="relative mt-12 lg:mt-20 max-w-5xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}>
              <div className="bg-white dark:bg-slate-800 rounded-t-lg p-2 shadow-2xl shadow-slate-900/10 dark:shadow-blue-500/10"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400"></div><div className="w-3 h-3 rounded-full bg-yellow-400"></div><div className="w-3 h-3 rounded-full bg-green-400"></div></div></div>
              <img src={getImage('hero_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/1200x750/f3f4f6/4a5568?text=Dashboard+Principal+do+VistorIA')} alt="Dashboard do VistorIA" className="w-full h-auto object-cover rounded-b-lg shadow-2xl shadow-slate-900/20 dark:shadow-blue-500/10" />
            </motion.div>
          </div>
        </section>

        <section className="py-20 lg:py-28 bg-white dark:bg-slate-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Por que usar nosso app?
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Simplifique suas vistorias e ganhe tempo, segurança e precisão.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                const colors = {
                    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                    teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
                };
                const colorClass = colors[benefit.color as keyof typeof colors] || colors.blue;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-gray-50 dark:bg-slate-800 p-6 rounded-xl text-center border border-gray-200 dark:border-slate-700"
                  >
                    <div className={`flex items-center justify-center w-16 h-16 ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]} rounded-full mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${colorClass.split(' ')[2]} ${colorClass.split(' ')[3]}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {benefit.text}
                    </h3>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12"><h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Uma plataforma, todas as soluções</h2><p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Do clique ao relatório final, tudo em um só lugar.</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <BentoCard className="lg:col-span-2"><Bot className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" /><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Análise Inteligente com IA</h3><p className="text-gray-600 dark:text-gray-400">Nossa IA identifica objetos, materiais, cores e condições a partir de uma única foto, criando um inventário detalhado automaticamente.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/50 flex-grow"><img src={getImage('feature_analysis_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/800x450/e2e8f0/4a5568?text=Análise+de+Foto+com+IA')} alt="Análise de Foto com IA" className="w-full h-full object-cover"/></div></BentoCard>
              <BentoCard><GitCompareArrows className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" /><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Relatórios Comparativos</h3><p className="text-gray-600 dark:text-gray-400">Compare vistorias de entrada e saída e veja o que mudou, o que está faltando e o que é novo.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/50 flex-grow"><img src={getImage('feature_comparison_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/e2e8f0/4a5568?text=Comparativo+Lado+a+Lado')} alt="Relatório Comparativo" className="w-full h-full object-cover"/></div></BentoCard>
              <BentoCard><FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" /><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">PDFs Profissionais</h3><p className="text-gray-600 dark:text-gray-400">Exporte relatórios completos e comparativos em PDF com um clique, prontos para enviar ao cliente.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/50 flex-grow"><img src={getImage('feature_pdf_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x500/e2e8f0/4a5568?text=Relatório+PDF')} alt="Exemplo de PDF" className="w-full h-full object-cover"/></div></BentoCard>
              <BentoCard className="lg:col-span-2"><ShieldCheck className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" /><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Itens Faltando, Problemas e Segurança</h3><p className="text-gray-600 dark:text-gray-400">Nossa IA vai além de um simples inventário. Ela identifica com precisão o que está faltando em comparação com a vistoria de entrada, aponta problemas como rachaduras e mofo, e verifica itens de segurança cruciais.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/50 flex-grow"><img src={getImage('feature_issues_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/800x450/e2e8f0/4a5568?text=Detecção+de+Problemas')} alt="Detecção de Problemas" className="w-full h-full object-cover"/></div></BentoCard>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 lg:py-28 bg-white dark:bg-slate-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12"><h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Simples como 1, 2, 3</h2><p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Comece a usar em minutos.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.1 }}><div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 text-2xl font-bold text-blue-600 dark:text-blue-400">1</div><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Fotografe os Ambientes</h3><p className="text-gray-600 dark:text-gray-400">Tire fotos dos ambientes do imóvel. Nossa IA cuida do resto.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50 shadow-inner"><img src={getImage('how_it_works_step1_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/e2e8f0/4a5568?text=Upload+de+Foto')} alt="Upload de Foto" className="w-full h-full object-cover"/></div></motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.2 }}><div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 text-2xl font-bold text-blue-600 dark:text-blue-400">2</div><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Valide a Análise da IA</h3><p className="text-gray-600 dark:text-gray-400">Revise e ajuste as informações geradas pela IA com poucos cliques.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50 shadow-inner"><img src={getImage('how_it_works_step2_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/e2e8f0/4a5568?text=Validação+da+Análise')} alt="Validação da Análise" className="w-full h-full object-cover"/></div></motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.3 }}><div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 text-2xl font-bold text-blue-600 dark:text-blue-400">3</div><h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Gere e Compare</h3><p className="text-gray-600 dark:text-gray-400">Crie relatórios individuais ou comparativos de entrada e saída em PDF.</p><div className="mt-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50 shadow-inner"><img src={getImage('how_it_works_step3_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/e2e8f0/4a5568?text=Geração+de+Relatório')} alt="Geração de Relatório" className="w-full h-full object-cover"/></div></motion.div>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12"><h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Aprovado por profissionais do mercado</h2><p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Veja o que nossos usuários estão dizendo.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div key={index} className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                  <div className="flex items-center mb-4"><img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4" /><div><p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p></div></div>
                  <div className="flex mb-2">{[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}</div>
                  <p className="text-gray-600 dark:text-gray-300">"{testimonial.text}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative"><h2 className="text-3xl lg:text-4xl font-extrabold mb-4">Pronto para transformar suas vistorias?</h2><p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">Junte-se a centenas de profissionais que já estão economizando tempo e dinheiro com o VistorIA.</p><Link to="/signup" className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-transform hover:scale-105 text-lg font-semibold shadow-2xl">Começar gratuitamente<ArrowRight className="w-5 h-5 ml-2" /></Link></div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
