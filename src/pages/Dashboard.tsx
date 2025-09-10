import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Camera, 
  AlertTriangle, 
  Clock, 
  Plus,
  FileText,
  Target,
  Activity
} from 'lucide-react';
// import ReactECharts from 'echarts-for-react'; // Removido pois gráficos foram excluídos
import { motion } from 'framer-motion';

interface DashboardStats {
  totalProperties: number;
  totalInspections: number;
  pendingInspections: number;
  completedInspections: number;
  avgInspectionTime: number;
  criticalIssues: number;
  recentActivity: Array<{
    type: 'property' | 'inspection' | 'report';
    title: string;
    date: Date;
    propertyName?: string;
  }>;
  monthlyInspections: Array<{ month: string; entry: number; exit: number }>;
  issueTypes: Array<{ name: string; count: number; severity: 'low' | 'medium' | 'high' }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastProperty, setLastProperty] = useState<Property | null>(null);
  const [lastReportData, setLastReportData] = useState<{entryId: string, exitId: string} | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      const mappedProperties = propertiesData.map(row => mapToProperty(row)).filter((p): p is Property => p !== null);

      // Fetch inspections
      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from('inspections')
        .select('*, properties!inner(*)')
        .eq('properties.user_id', user!.id);

      if (inspectionsError) throw inspectionsError;

      // Fetch inspection photos for detailed analysis
      const { data: photosData, error: photosError } = await supabase
        .from('inspection_photos')
        .select('*')
        .in('inspection_id', inspectionsData.map(i => i.id));

      if (photosError) throw photosError;

      // Calculate stats
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      
      const recentInspections = inspectionsData.filter(i => 
        new Date(i.created_at) >= sixMonthsAgo
      );

      const completedInspections = inspectionsData.filter(i => i.status === 'completed');
      const pendingInspections = inspectionsData.filter(i => i.status === 'in_progress');

      // Calculate monthly inspections
      const monthlyData: { [key: string]: { entry: number; exit: number } } = {};
      recentInspections.forEach(inspection => {
        const date = new Date(inspection.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { entry: 0, exit: 0 };
        }
        if (inspection.inspection_type === 'entry') {
          monthlyData[monthKey].entry++;
        } else {
          monthlyData[monthKey].exit++;
        }
      });

      const monthlyInspections = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          ...data
        }))
        .slice(-6);

      // Analyze issues from photos - Corrigir lógica de detecção de problemas críticos
      const allIssues: Array<{ name: string; severity: 'low' | 'medium' | 'high' }> = [];
      photosData.forEach(photo => {
        // Verificar em analysis_result.objectsDetected onde estão os problemas reais
        if (photo.analysis_result?.objectsDetected) {
          photo.analysis_result.objectsDetected.forEach((obj: any) => {
            // Problemas críticos são itens danificados ou não encontrados
            if (obj.condition === 'damaged' || obj.condition === 'not_found') {
              const severity = obj.condition === 'not_found' ? 'high' : 
                             obj.condition === 'damaged' ? 'high' : 'medium';
              allIssues.push({ 
                name: obj.item || obj.description || 'Item não identificado', 
                severity 
              });
            }
          });
        }
        // Também verificar se há issues em outros formatos
        if (photo.analysis_result?.issues) {
          photo.analysis_result.issues.forEach((issue: any) => {
            const severity = issue.severity || (issue.condition === 'damaged' ? 'high' : 'medium');
            allIssues.push({ name: issue.description || issue.title, severity });
          });
        }
      });

      const issueTypes = allIssues.reduce((acc, issue) => {
        const existing = acc.find(i => i.name === issue.name);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ name: issue.name, count: 1, severity: issue.severity });
        }
        return acc;
      }, [] as Array<{ name: string; count: number; severity: 'low' | 'medium' | 'high' }>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

      // Recent activity
      const recentActivity = [
        ...mappedProperties.slice(0, 3).map(p => ({
          type: 'property' as const,
          title: `Propriedade "${p.name}" cadastrada`,
          date: new Date(p.createdAt),
          propertyName: p.name
        })),
        ...recentInspections.slice(0, 5).map(i => ({
          type: 'inspection' as const,
          title: `Vistoria ${i.inspection_type === 'entry' ? 'de entrada' : 'de saída'} ${i.status === 'completed' ? 'concluída' : 'iniciada'}`,
          date: new Date(i.created_at),
          propertyName: i.properties?.name
        }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

      // Conta apenas itens faltando da última vistoria
      let criticalIssuesCount = 0;
      
      // Usar a mesma lógica do relatório comparativo para garantir consistência
      const exitInspections = inspectionsData.filter(i => 
        i.status === 'completed' && i.inspection_type === 'exit'
      );
      
      if (exitInspections.length > 0) {
        // Pegar a mais recente vistoria de saída
        const latestExitInspection = exitInspections
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        // Buscar a vistoria de entrada correspondente da mesma propriedade
        const entryInspection = inspectionsData.find(i => 
          i.property_id === latestExitInspection.property_id && 
          i.inspection_type === 'entry' && 
          i.status === 'completed'
        );
        
        if (entryInspection) {
          // Buscar fotos de ambas as vistorias
          const entryPhotos = photosData.filter(p => p.inspection_id === entryInspection.id);
          const exitPhotos = photosData.filter(p => p.inspection_id === latestExitInspection.id);
          
          // Aplicar a mesma lógica do relatório comparativo
          const allRooms = [...new Set([...entryPhotos.map(p => p.room), ...exitPhotos.map(p => p.room)])];
          
          allRooms.forEach(room => {
            const entryObjects = entryPhotos
              .filter(p => p.room === room)
              .flatMap(p => (p.ai_analysis_result?.objectsDetected || p.analysis_result?.objectsDetected || []));
              
            const exitObjects = exitPhotos
              .filter(p => p.room === room)
              .flatMap(p => (p.ai_analysis_result?.objectsDetected || p.analysis_result?.objectsDetected || []));

            const missingItems = [...entryObjects];

            exitObjects.forEach(exitObj => {
              if (exitObj.condition === 'not_found') {
                return; // Não remove do missingItems
              }

              const bestMatchIndex = missingItems.findIndex(entryObj => 
                entryObj.item.toLowerCase().trim() === exitObj.item.toLowerCase().trim()
              );

              if (bestMatchIndex > -1) {
                missingItems.splice(bestMatchIndex, 1); // Remove item pareado
              }
            });
            
            criticalIssuesCount += missingItems.length;
          });
        }
      }

      const dashboardStats: DashboardStats = {
        totalProperties: mappedProperties.length,
        totalInspections: inspectionsData.length,
        pendingInspections: pendingInspections.length,
        completedInspections: completedInspections.length,
        avgInspectionTime: completedInspections.length > 0 ? 
          Math.round(photosData.length / completedInspections.length) : 0,
        criticalIssues: criticalIssuesCount,
        recentActivity,
        monthlyInspections,
        issueTypes
      };

      setStats(dashboardStats);
      
      // Encontrar a última propriedade para ação rápida "Nova Vistoria"
      if (mappedProperties.length > 0) {
        const latestProperty = mappedProperties[0]; // Já ordenado por created_at desc
        setLastProperty(latestProperty);
      }
      
      // Encontrar a última comparação para ação rápida "Relatórios"
      const propertiesWithBothInspections = mappedProperties.filter(property => {
        const entryInspection = property.inspections.find(i => i.inspection_type === 'entry' && i.status === 'completed');
        const exitInspection = property.inspections.find(i => i.inspection_type === 'exit' && i.status === 'completed');
        return entryInspection && exitInspection;
      });
      
      if (propertiesWithBothInspections.length > 0) {
        const latestPropertyWithBoth = propertiesWithBothInspections[0];
        const entryInspection = latestPropertyWithBoth.inspections.find(i => i.inspection_type === 'entry' && i.status === 'completed');
        const exitInspection = latestPropertyWithBoth.inspections.find(i => i.inspection_type === 'exit' && i.status === 'completed');
        
        if (entryInspection && exitInspection) {
          setLastReportData({
            entryId: entryInspection.id,
            exitId: exitInspection.id
          });
        }
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções para ações rápidas inteligentes
  const handleUltimaVistoria = () => {
    if (lastProperty) {
      // Ir direto para o gerenciamento de vistorias da última propriedade
      navigate(`/property/${lastProperty.id}`);
    } else {
      // Nenhuma propriedade, ir para criar uma
      navigate('/properties');
    }
  };

  const handleRelatorios = () => {
    if (lastReportData) {
      // Ir direto para o último relatório comparativo
      navigate(`/compare/${lastReportData.entryId}/${lastReportData.exitId}`);
    } else {
      // Nenhum relatório disponível, ir para página de relatórios
      navigate('/reports');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard VistorIA
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Visão geral das suas vistorias e propriedades
          </p>
        </div>
        <Link
          to="/properties"
          className="mt-4 lg:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Propriedade
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Imóveis</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalProperties || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-full">
              <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Vistorias</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.totalInspections || 0}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-full">
              <Camera className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Em Andamento</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.pendingInspections || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-full">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Itens Faltando da Última Vistoria</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats?.criticalIssues || 0}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráficos removidos conforme solicitado */}

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Atividade Recente
          </h3>
          <div className="space-y-4">
            {stats?.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <div className={`p-2 rounded-full ${
                  activity.type === 'property' ? 'bg-blue-100 dark:bg-blue-500/20' :
                  activity.type === 'inspection' ? 'bg-green-100 dark:bg-green-500/20' :
                  'bg-purple-100 dark:bg-purple-500/20'
                }`}>
                  {activity.type === 'property' ? (
                    <Home className={`w-4 h-4 ${
                      activity.type === 'property' ? 'text-blue-600 dark:text-blue-400' : ''
                    }`} />
                  ) : activity.type === 'inspection' ? (
                    <Camera className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {activity.title}
                  </p>
                  {activity.propertyName && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {activity.propertyName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {activity.date.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                Nenhuma atividade recente
              </p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Ações Rápidas
          </h3>
          <div className="space-y-3">
            <Link
              to="/properties"
              className="w-full flex items-center px-4 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              <Home className="w-4 h-4 mr-3" />
              Gerenciar Imóveis
            </Link>
            <button
              onClick={handleUltimaVistoria}
              className="w-full flex items-center px-4 py-3 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
            >
              <Camera className="w-4 h-4 mr-3" />
              Última Vistoria
            </button>
            <button
              onClick={handleRelatorios}
              className="w-full flex items-center px-4 py-3 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
            >
              <FileText className="w-4 h-4 mr-3" />
              Último Relatórios
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;