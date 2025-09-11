import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus,
  FileText,
  Target,
  Activity,
  Home,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentActivity from '../components/Dashboard/RecentProperties';

interface DashboardStatsData {
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

const QuickActions: React.FC<{ onUltimaVistoria: () => void, onRelatorios: () => void }> = ({ onUltimaVistoria, onRelatorios }) => (
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
          onClick={onUltimaVistoria}
          className="w-full flex items-center px-4 py-3 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
        >
          <Camera className="w-4 h-4 mr-3" />
          Última Vistoria
        </button>
        <button
          onClick={onRelatorios}
          className="w-full flex items-center px-4 py-3 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
        >
          <FileText className="w-4 h-4 mr-3" />
          Último Relatório
        </button>
      </div>
    </motion.div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastProperty, setLastProperty] = useState<Property | null>(null);
  const [lastReportData, setLastReportData] = useState<{entryId: string, exitId: string} | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if(!user) return;
    try {
      setLoading(true);

      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`*, inspections (id, status, inspection_type, general_observations, created_at)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      const mappedProperties = propertiesData.map(row => mapToProperty(row)).filter((p): p is Property => p !== null);

      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from('inspections')
        .select('*, properties!inner(*)')
        .eq('properties.user_id', user.id);

      if (inspectionsError) throw inspectionsError;

      const { data: photosData, error: photosError } = await supabase
        .from('inspection_photos')
        .select('*')
        .in('inspection_id', inspectionsData.map(i => i.id));

      if (photosError) throw photosError;

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      
      const recentInspections = inspectionsData.filter(i => new Date(i.created_at) >= sixMonthsAgo);
      const completedInspections = inspectionsData.filter(i => i.status === 'completed');
      const pendingInspections = inspectionsData.filter(i => i.status === 'in-progress');

      const monthlyData: { [key: string]: { entry: number; exit: number } } = {};
      recentInspections.forEach(inspection => {
        const date = new Date(inspection.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { entry: 0, exit: 0 };
        if (inspection.inspection_type === 'entry') monthlyData[monthKey].entry++;
        else monthlyData[monthKey].exit++;
      });

      const monthlyInspections = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          ...data
        }))
        .slice(-6);

      const allIssues: Array<{ name: string; severity: 'low' | 'medium' | 'high' }> = [];
      photosData.forEach(photo => {
        if (photo.analysis_result?.objectsDetected) {
          photo.analysis_result.objectsDetected.forEach((obj: any) => {
            if (obj.condition === 'damaged' || obj.condition === 'not_found') {
              const severity = obj.condition === 'not_found' ? 'high' : 'high';
              allIssues.push({ name: obj.item || 'Item não identificado', severity });
            }
          });
        }
        if (photo.analysis_result?.issues) {
          photo.analysis_result.issues.forEach((issue: any) => {
            allIssues.push({ name: issue.description, severity: issue.severity });
          });
        }
      });

      const issueTypes = allIssues.reduce((acc, issue) => {
        const existing = acc.find(i => i.name === issue.name);
        if (existing) existing.count++;
        else acc.push({ name: issue.name, count: 1, severity: issue.severity });
        return acc;
      }, [] as Array<{ name: string; count: number; severity: 'low' | 'medium' | 'high' }>)
      .sort((a, b) => b.count - a.count).slice(0, 8);

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

      let criticalIssuesCount = 0;
      const exitInspections = inspectionsData.filter(i => i.status === 'completed' && i.inspection_type === 'exit');
      if (exitInspections.length > 0) {
        const latestExitInspection = exitInspections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const entryInspection = inspectionsData.find(i => i.property_id === latestExitInspection.property_id && i.inspection_type === 'entry' && i.status === 'completed');
        if (entryInspection) {
          const entryPhotos = photosData.filter(p => p.inspection_id === entryInspection.id);
          const exitPhotos = photosData.filter(p => p.inspection_id === latestExitInspection.id);
          const allRooms = [...new Set([...entryPhotos.map(p => p.room), ...exitPhotos.map(p => p.room)])];
          allRooms.forEach(room => {
            const entryObjects = entryPhotos.filter(p => p.room === room).flatMap(p => (p.ai_analysis_result?.objectsDetected || []));
            const exitObjects = exitPhotos.filter(p => p.room === room).flatMap(p => (p.ai_analysis_result?.objectsDetected || []));
            const missingItems = [...entryObjects];
            exitObjects.forEach(exitObj => {
              if (exitObj.condition === 'not_found') return;
              const bestMatchIndex = missingItems.findIndex(entryObj => entryObj.item.toLowerCase().trim() === exitObj.item.toLowerCase().trim());
              if (bestMatchIndex > -1) missingItems.splice(bestMatchIndex, 1);
            });
            criticalIssuesCount += missingItems.length;
          });
        }
      }

      const dashboardStats: DashboardStatsData = {
        totalProperties: mappedProperties.length,
        totalInspections: inspectionsData.length,
        pendingInspections: pendingInspections.length,
        completedInspections: completedInspections.length,
        avgInspectionTime: completedInspections.length > 0 ? Math.round(photosData.length / completedInspections.length) : 0,
        criticalIssues: criticalIssuesCount,
        recentActivity,
        monthlyInspections,
        issueTypes
      };

      setStats(dashboardStats);
      if (mappedProperties.length > 0) setLastProperty(mappedProperties[0]);
      
      const propertiesWithBothInspections = mappedProperties.filter(p => p.inspections.some(i => i.inspection_type === 'entry' && i.status === 'completed') && p.inspections.some(i => i.inspection_type === 'exit' && i.status === 'completed'));
      if (propertiesWithBothInspections.length > 0) {
        const latestPropertyWithBoth = propertiesWithBothInspections[0];
        const entry = latestPropertyWithBoth.inspections.find(i => i.inspection_type === 'entry' && i.status === 'completed');
        const exit = latestPropertyWithBoth.inspections.find(i => i.inspection_type === 'exit' && i.status === 'completed');
        if (entry && exit) setLastReportData({ entryId: entry.id, exitId: exit.id });
      } else {
        setLastReportData(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUltimaVistoria = () => {
    if (lastProperty) navigate(`/property/${lastProperty.id}`);
    else navigate('/properties');
  };

  const handleRelatorios = () => {
    if (lastReportData) navigate(`/compare/${lastReportData.entryId}/${lastReportData.exitId}`);
    else navigate('/reports');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-pulse text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <RecentActivity activity={stats?.recentActivity} />
        <QuickActions onUltimaVistoria={handleUltimaVistoria} onRelatorios={handleRelatorios} />
      </div>
    </div>
  );
};

export default Dashboard;
