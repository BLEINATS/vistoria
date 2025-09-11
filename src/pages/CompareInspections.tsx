import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property, InspectionPhoto, DetectedObject } from '../types';
import { Loader, ArrowLeft, GitCompareArrows, Download, Printer, Share2, Pencil, CheckCircle, PlusCircle, MinusCircle, Settings, Check, X } from 'lucide-react';
import ComparisonItem from '../components/Compare/ComparisonItem';
import { useAuth } from '../contexts/AuthContext';
import { useReportActions } from '../hooks/useReportActions';
import { generateComparisonReportHTML } from '../utils/generateComparisonReportHTML';
import { useToast } from '../contexts/ToastContext';

interface FullInspectionData {
  property: Property;
  photos: InspectionPhoto[];
  inspectionDate: Date;
}

interface ReportConfig {
  summary: boolean;
  rooms: { [roomName: string]: {
    changedItems: boolean;
    newItems: boolean;
    missingItems: boolean;
    unchangedItems: boolean;
  }};
}

const CompareInspections: React.FC = () => {
  const { entryInspectionId, exitInspectionId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToast, updateToast } = useToast();
  const [entryData, setEntryData] = useState<FullInspectionData | null>(null);
  const [exitData, setExitData] = useState<FullInspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    summary: true,
    rooms: {}
  });

  const { handlePrint, handleShare } = useReportActions();

  const handleDownloadPdf = () => {
    if (!entryData || !exitData) {
      addToast('Dados do relatório não estão prontos.', 'error');
      return;
    }
    const toastId = addToast('Gerando relatório...', 'loading');

    const userProfile = {
      inspectorName: profile?.full_name || user?.email || null,
      companyName: profile?.company_name || null,
      companyLogoUrl: profile?.avatar_url || null,
    };

    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write('<html><head><title>Gerando Relatório...</title></head><body><h1>Aguarde, preparando seu relatório...</h1></body></html>');
      
      setTimeout(() => {
        try {
          const htmlContent = generateComparisonReportHTML(entryData, exitData, reportConfig, userProfile);
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          printWindow.location.href = url;

          // Cleanup the object URL after a short delay
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          updateToast(toastId, 'Relatório pronto para impressão.', 'success');

        } catch (error: any) {
          console.error('Error generating PDF content:', error);
          printWindow.close();
          updateToast(toastId, `Falha ao gerar o conteúdo do PDF: ${error.message}`, 'error');
        }
      }, 50);
    } else {
      updateToast(toastId, 'Não foi possível abrir a janela de impressão. Verifique se seu navegador está bloqueando pop-ups.', 'error');
    }
  };

  const fetchInspectionData = useCallback(async (inspectionId: string): Promise<FullInspectionData | null> => {
    if (!user) return null;
    const { data: inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .select('*, properties!inner(*)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspectionData) {
      console.error(`Error fetching inspection ${inspectionId}:`, inspectionError);
      return null;
    }

    const { data: photosData, error: photosError } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    if (photosError) {
      console.error(`Error fetching photos for inspection ${inspectionId}:`, photosError);
      return null;
    }

    return {
      property: mapToProperty(inspectionData.properties as any) as Property,
      photos: photosData.map(p => ({
        id: p.id,
        url: p.photo_url,
        room: p.room,
        analysisResult: p.ai_analysis_result,
        uploadedAt: new Date(p.created_at)
      })),
      inspectionDate: new Date(inspectionData.inspection_date),
    };
  }, [user]);

  const initializeReportConfig = useCallback((rooms: string[]) => {
    const roomConfig: { [roomName: string]: any } = {};
    rooms.forEach(room => {
      roomConfig[room] = {
        changedItems: true,
        newItems: true,
        missingItems: true,
        unchangedItems: true
      };
    });
    setReportConfig({
      summary: true,
      rooms: roomConfig
    });
  }, []);

  const loadAllData = useCallback(async (showLoading = true) => {
    if (!entryInspectionId || !exitInspectionId) {
      if (showLoading) setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const [entry, exit] = await Promise.all([
      fetchInspectionData(entryInspectionId),
      fetchInspectionData(exitInspectionId)
    ]);
    setEntryData(entry);
    setExitData(exit);
    
    if (entry && exit) {
      const allRooms = [...new Set([...entry.photos.map(p => p.room), ...exit.photos.map(p => p.room)])];
      initializeReportConfig(allRooms);
    }
    
    if (showLoading) setLoading(false);
  }, [entryInspectionId, exitInspectionId, fetchInspectionData, initializeReportConfig]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const handleFocus = () => loadAllData(false);
    const handleVisibilityChange = () => {
      if (!document.hidden) loadAllData(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllData]);
  
  // ... (rest of the component remains the same)
  return (
    <div className="space-y-8">
        {/* ... JSX remains the same */}
    </div>
  );
};

export default CompareInspections;
