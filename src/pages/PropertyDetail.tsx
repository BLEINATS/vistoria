import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, mapToProperty } from '../lib/supabase';
import { Property, InspectionSummary } from '../types';
import { Loader, ArrowLeft, MapPin, Building, Calendar, FileText, Camera, CheckCircle, Clock, AlertCircle, GitCompareArrows, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchProperty = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_property_details_by_id', { p_id: id });
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Imóvel não encontrado");
      
      const mapped = mapToProperty(data[0], profile?.full_name);
      if (!mapped) throw new Error("Falha ao mapear dados do imóvel");

      setProperty(mapped);
    } catch (error) {
      console.error("Failed to fetch property:", error);
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium">Imóvel não encontrado.</h2>
        <Link to="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">Voltar para o Dashboard</Link>
      </div>
    );
  }
  
  // Defensive check: ensure inspections is always an array.
  const inspections = property.inspections || [];
  const entryInspection = inspections.find(i => i.inspection_type === 'entry');
  const exitInspection = inspections.find(i => i.inspection_type === 'exit');

  const canStartExit = entryInspection?.status === 'completed';
  const canCompare = entryInspection?.status === 'completed' && exitInspection?.status === 'completed';

  const handleStartInspection = (type: 'entry' | 'exit') => {
    navigate('/inspection', { state: { property, inspectionType: type } });
  };
  
  const handleContinueInspection = (inspection: InspectionSummary) => {
    navigate('/inspection', { state: { property, inspectionType: inspection.inspection_type, inspectionId: inspection.id } });
  };

  const handleViewReport = (inspectionId: string) => {
    navigate('/reports', { state: { inspectionId } });
  };

  const handleCompare = () => {
    if (canCompare && entryInspection && exitInspection) {
      navigate(`/compare/${entryInspection.id}/${exitInspection.id}`);
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const types = { apartment: 'Apartamento', house: 'Casa', commercial_room: 'Sala Comercial', office: 'Escritório', store: 'Loja', warehouse: 'Galpão', land: 'Terreno' };
    return types[type as keyof typeof types] || type;
  };

  const InspectionCard = ({ title, inspection, onStart, onContinue, onReport, disabled = false, disabledMessage = '' }: { title: string, inspection?: InspectionSummary, onStart: () => void, onContinue: (inspection: InspectionSummary) => void, onReport: (id: string) => void, disabled?: boolean, disabledMessage?: string }) => {
    const isCompleted = inspection?.status === 'completed';
    const isInProgress = inspection?.status === 'in-progress';

    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        {inspection ? (
          <div className="space-y-3 flex-grow flex flex-col">
            <div className="flex items-center">
              {isCompleted ? <CheckCircle className="w-5 h-5 text-green-500 mr-2" /> : <Clock className="w-5 h-5 text-yellow-500 mr-2" />}
              <span className={`font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                Status: {isCompleted ? 'Concluída' : 'Em Andamento'}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Camera className="w-4 h-4 mr-2" />
              <span>Fotos: <strong>{inspection.photoCount || 0}</strong></span>
            </div>
            {inspection.created_at && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Iniciada em: {format(new Date(inspection.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            )}
            <div className="flex-grow" />
            <div className="mt-4">
              {isCompleted && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => onContinue(inspection)} className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar Vistoria
                  </button>
                  <button onClick={() => onReport(inspection.id)} className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Relatório
                  </button>
                </div>
              )}
              {isInProgress && (
                 <button onClick={() => onContinue(inspection)} className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">
                    <Camera className="w-4 h-4 mr-2" />
                    Continuar Vistoria
                 </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex-grow flex flex-col">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="font-medium text-gray-500 dark:text-gray-400">Ainda não realizada</span>
            </div>
            <div className="flex-grow" />
            <div className="mt-4">
              <button onClick={onStart} disabled={disabled} className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
                <Camera className="w-4 h-4 mr-2" />
                Iniciar Vistoria
              </button>
              {disabled && <p className="text-xs text-center text-red-500 dark:text-red-400 mt-2">{disabledMessage}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar para o Dashboard
        </button>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <img src={property.facadePhoto || `https://source.unsplash.com/random/800x600?building&sig=${property.id}`} alt={`Fachada de ${property.name}`} className="w-full md:w-1/3 h-64 object-cover rounded-lg" />
            <div className="flex-1 space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{property.name}</h1>
              <div className="flex items-center text-gray-600 dark:text-gray-400"><Building className="w-4 h-4 mr-2" /><span>{getPropertyTypeLabel(property.type)}</span></div>
              <div className="flex items-center text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 mr-2" /><span>{property.address}</span></div>
              <div className="flex items-center text-gray-600 dark:text-gray-400"><Calendar className="w-4 h-4 mr-2" /><span>Cadastrado em: {format(new Date(property.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span></div>
              {property.description && <p className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-slate-700">{property.description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Gerenciamento de Vistorias</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InspectionCard 
            title="Vistoria de Entrada"
            inspection={entryInspection}
            onStart={() => handleStartInspection('entry')}
            onContinue={handleContinueInspection}
            onReport={handleViewReport}
          />
          <InspectionCard 
            title="Vistoria de Saída"
            inspection={exitInspection}
            onStart={() => handleStartInspection('exit')}
            onContinue={handleContinueInspection}
            onReport={handleViewReport}
            disabled={!canStartExit}
            disabledMessage="Conclua a vistoria de entrada primeiro."
          />
        </div>
      </div>

      {canCompare && (
        <div className="text-center pt-4">
          <button 
            onClick={handleCompare}
            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
          >
            <GitCompareArrows className="w-5 h-5 mr-2" />
            Comparar Vistorias
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
