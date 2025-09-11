import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Property, InspectionPhoto } from '../types';
import { translateObjectCondition, translateSeverity, formatObjectDescription } from './translations';
import { getSeverityStyle } from './styleUtils';

interface ReportData {
  property: Property;
  photos: InspectionPhoto[];
  generatedAt: Date;
  inspection_type: 'entry' | 'exit';
  general_observations: string | null;
}

interface UserProfile {
  inspectorName: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
}

const getPropertyTypeLabel = (type: string) => {
    const types = {
      apartment: 'Apartamento',
      house: 'Casa',
      commercial_room: 'Sala Comercial',
      office: 'Escritório',
      store: 'Loja',
      warehouse: 'Galpão',
      land: 'Terreno'
    };
    return types[type as keyof typeof types] || type;
};

const renderPhotoAnalysis = (photo: InspectionPhoto) => {
    let objectsHtml = '';
    if (photo.analysisResult.objectsDetected?.length > 0) {
        const items = photo.analysisResult.objectsDetected.map(object => `
            <div class="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-md">
                <span>${formatObjectDescription(object)}</span>
                <span class="capitalize px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(object.condition)}">${translateObjectCondition(object.condition)}</span>
            </div>
        `).join('');
        objectsHtml = `
            <div class="space-y-2">
                <h4 class="font-medium text-gray-900 flex items-center">Objetos Identificados</h4>
                ${items}
            </div>
        `;
    }

    let issuesHtml = '';
    if (photo.analysisResult.issues?.length > 0) {
        const items = photo.analysisResult.issues.map(issue => `
            <div class="p-3 border border-red-200 bg-red-50 rounded-md">
                <div class="flex items-center justify-between">
                    <span class="font-medium text-sm text-gray-800">${issue.type}</span>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(issue.severity)}">${translateSeverity(issue.severity)}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${issue.description}</p>
                <p class="text-xs text-gray-500 mt-1">Local: ${issue.location}</p>
            </div>
        `).join('');
        issuesHtml = `
            <div class="space-y-2">
                <h4 class="font-medium text-gray-900 flex items-center">Problemas Identificados</h4>
                ${items}
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="h-80 rounded-lg overflow-hidden border bg-gray-100">
                <img src="${photo.url}" alt="Foto do ambiente ${photo.room}" class="w-full h-full object-contain">
            </div>
            <div class="space-y-4 text-sm">
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Descrição do Ambiente</h4>
                    <p class="text-gray-700">${photo.analysisResult.description}</p>
                </div>
                ${objectsHtml}
                ${issuesHtml}
            </div>
        </div>
    `;
};

export const generateSingleReportHTML = (reportData: ReportData, userProfile: UserProfile): string => {
  const rooms = [...new Set(reportData.photos.map(p => p.room))];
  const inspectionTypeLabel = reportData.inspection_type === 'entry' ? 'Entrada' : 'Saída';

  const roomsHtml = rooms.map(roomName => {
    const roomPhotos = reportData.photos.filter(p => p.room === roomName);
    const photosHtml = roomPhotos.map(renderPhotoAnalysis).join('<div class="my-6 border-t border-dashed"></div>');
    
    return `
      <div class="report-page max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
          <h2 class="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Análise do Ambiente: ${roomName}</h2>
          <div class="space-y-6">${photosHtml}</div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Vistoria - ${inspectionTypeLabel}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; }
            @media print {
                @page { size: A4; margin: 0; }
                body { background-color: #fff; margin: 1cm; }
                .report-page { page-break-inside: avoid; page-break-after: always; box-shadow: none; margin: 0 0 1cm 0; border: none; width: 100%; }
                *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            .report-page:last-child { page-break-after: auto; }
        </style>
    </head>
    <body class="p-4 md:p-8">
        <div class="report-page max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <header class="text-center border-b pb-6 mb-6">
                ${userProfile.companyLogoUrl ? `<img src="${userProfile.companyLogoUrl}" alt="Logo da Empresa" class="h-16 w-auto mb-4 mx-auto">` : ''}
                <h1 class="text-3xl font-bold text-gray-800">Relatório de Vistoria - ${inspectionTypeLabel}</h1>
                <p class="text-xl text-gray-600 mt-2">${reportData.property.name}</p>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div><p><strong>Empresa:</strong> ${userProfile.companyName || 'Não informado'}</p></div>
                <div><p><strong>Vistoriador:</strong> ${userProfile.inspectorName || 'Não informado'}</p></div>
                <div><p><strong>Tipo do Imóvel:</strong> ${getPropertyTypeLabel(reportData.property.type)}</p></div>
                <div><p><strong>Endereço:</strong> ${reportData.property.address}</p></div>
                <div><p><strong>Data da Vistoria:</strong> ${format(reportData.generatedAt, 'dd/MM/yyyy', { locale: ptBR })}</p></div>
            </div>
            ${reportData.general_observations ? `
            <div class="mt-6 border-t pt-6">
                <h3 class="font-semibold text-lg text-gray-800 mb-2">Observações Gerais</h3>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">${reportData.general_observations}</p>
            </div>
            ` : ''}
            <div class="mt-6 border-t pt-6">
                <h3 class="font-semibold text-lg text-gray-800 mb-2">Apontamentos da Vistoria</h3>
                <p class="text-xs text-gray-600 leading-relaxed">
                    O presente relatório tem como objetivo registrar o estado de conservação e funcionamento do imóvel na data da vistoria, em conformidade com a Lei nº 8.245/91 (Lei do Inquilinato).
                    <br>A vistoria foi realizada por observação visual, avaliando aspectos estéticos, acabamentos e funcionamento aparente do imóvel.
                    <br>Não são contemplados neste relatório: análises estruturais, fundações, solidez da construção ou eventuais vícios ocultos que não sejam perceptíveis no momento da vistoria.
                </p>
            </div>
        </div>
        ${roomsHtml}
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            };
        </script>
    </body>
    </html>
  `;
};
