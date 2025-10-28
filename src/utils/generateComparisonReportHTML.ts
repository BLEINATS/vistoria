import { InspectionPhoto, DetectedObject, Property } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FullInspectionData {
  property: Property;
  photos: InspectionPhoto[];
  inspectionDate: Date;
}

interface UserProfile {
  inspectorName: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
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

const getComparisonData = (room: string, entryData: FullInspectionData, exitData: FullInspectionData) => {
    const entryObjects = entryData.photos
      .filter(p => p.room === room)
      .flatMap(p => (p.analysisResult.objectsDetected || []).map(obj => ({ ...obj, photoUrl: p.url })));
      
    const exitObjects = exitData.photos
      .filter(p => p.room === room)
      .flatMap(p => (p.analysisResult.objectsDetected || []).map(obj => ({ ...obj, photoUrl: p.url })));

    const exitRoomPhoto = exitData.photos.find(p => p.room === room)?.url;
    const entryRoomPhoto = entryData.photos.find(p => p.room === room)?.url;

    const pairedItems: { entry: DetectedObject, exit: DetectedObject }[] = [];
    const newItems: DetectedObject[] = [];
    const missingItems: DetectedObject[] = [...entryObjects];

    exitObjects.forEach(exitObj => {
      if (exitObj.condition === 'not_found') return;

      const bestMatchIndex = missingItems.findIndex(entryObj => 
        entryObj.item.toLowerCase().trim() === exitObj.item.toLowerCase().trim()
      );

      if (bestMatchIndex > -1) {
        const entryObj = missingItems.splice(bestMatchIndex, 1)[0];
        pairedItems.push({ entry: entryObj, exit: exitObj });
      } else {
        newItems.push(exitObj);
      }
    });

    const changedItems = pairedItems.filter(p => p.entry.condition !== p.exit.condition);
    const unchangedItems = pairedItems.filter(p => p.entry.condition === p.exit.condition);

    const missingItemsWithContext = missingItems.map(item => ({
      entry: item,
      exitPhotoUrl: exitRoomPhoto
    }));

    const newItemsWithContext = newItems.map(item => ({
      exit: item,
      entryPhotoUrl: entryRoomPhoto
    }));

    return { changedItems, unchangedItems, newItems: newItemsWithContext, missingItems: missingItemsWithContext };
};

export const generateComparisonReportHTML = (
  entryData: FullInspectionData,
  exitData: FullInspectionData,
  reportConfig: ReportConfig,
  userProfile: UserProfile
): string => {
  const allRooms = [...new Set([...entryData.photos.map(p => p.room), ...exitData.photos.map(p => p.room)])];
  
  const totalChanges = allRooms.reduce((acc, room) => {
    const data = getComparisonData(room, entryData, exitData);
    acc.changed += data.changedItems.length;
    acc.new += data.newItems.length;
    acc.missing += data.missingItems.length;
    return acc;
  }, { changed: 0, new: 0, missing: 0 });

  let roomsHtml = '';
  allRooms.forEach(room => {
    const { changedItems, unchangedItems, newItems, missingItems } = getComparisonData(room, entryData, exitData);
    const roomConfig = reportConfig.rooms[room];
    const entryPhoto = entryData.photos.find(p => p.room === room)?.url || 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/e2e8f0/4a5568?text=Sem+Foto';
    const exitPhoto = exitData.photos.find(p => p.room === room)?.url || 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/e2e8f0/4a5568?text=Sem+Foto';
    
    let itemsHtml = '';

    if (roomConfig?.missingItems && missingItems.length > 0) {
        const listItems = missingItems.map(item => `<li>${item.entry.item} (${item.entry.material}, ${item.entry.color})</li>`).join('');
        itemsHtml += `
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h4 class="font-bold text-red-700">Itens Faltando na Saída</h4>
                <ul class="list-disc list-inside text-gray-700 mt-2 space-y-1">${listItems}</ul>
            </div>`;
    }

    if (roomConfig?.newItems && newItems.length > 0) {
        const listItems = newItems.map(item => `<li>${item.exit.item} (${item.exit.material}, ${item.exit.color})</li>`).join('');
        itemsHtml += `
            <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <h4 class="font-bold text-green-700">Itens Novos na Saída</h4>
                <ul class="list-disc list-inside text-gray-700 mt-2 space-y-1">${listItems}</ul>
            </div>`;
    }

    if (roomConfig?.changedItems && changedItems.length > 0) {
        const listItems = changedItems.map(item => {
            const desc = `${item.entry.item} (${item.entry.material}, ${item.entry.color})`;
            const conditions = `${item.entry.condition} ➔ ${item.exit.condition}`;
            return `<li>${desc}: <span class="font-medium">${conditions}</span></li>`;
        }).join('');
        itemsHtml += `
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <h4 class="font-bold text-yellow-700">Itens com Condição Alterada</h4>
                <ul class="list-disc list-inside text-gray-700 mt-2 space-y-1">${listItems}</ul>
            </div>`;
    }

    if (roomConfig?.unchangedItems && unchangedItems.length > 0) {
        itemsHtml += `
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <h4 class="font-bold text-blue-700">Itens Sem Alterações (${unchangedItems.length})</h4>
                <p class="text-gray-600 mt-1 text-sm">Nenhum problema encontrado nestes itens.</p>
            </div>`;
    }

    if (itemsHtml) {
      roomsHtml += `
        <div class="report-page max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Comparativo: ${room}</h2>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <h3 class="font-semibold text-lg text-center mb-2">Entrada</h3>
                    <div class="h-80 rounded-lg overflow-hidden border bg-gray-100">
                        <img src="${entryPhoto}" alt="${room} na entrada" class="w-full h-full object-contain">
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold text-lg text-center mb-2">Saída</h3>
                    <div class="h-80 rounded-lg overflow-hidden border bg-gray-100">
                        <img src="${exitPhoto}" alt="${room} na saída" class="w-full h-full object-contain">
                    </div>
                </div>
            </div>
            <div class="space-y-4">${itemsHtml}</div>
        </div>
      `;
    }
  });

  return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Comparativo de Vistorias</title>
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
                ${userProfile.companyLogoUrl ? `<img src="${userProfile.companyLogoUrl}" alt="Logo da Empresa" class="h-16 w-auto mb-4 mx-auto rounded-full">` : ''}
                <h1 class="text-3xl font-bold text-gray-800">Relatório Comparativo de Vistorias</h1>
                <p class="text-xl text-gray-600 mt-2">${entryData.property.name}</p>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div><p><strong>Empresa:</strong> ${userProfile.companyName || 'Não informado'}</p></div>
                <div><p><strong>Vistoriador:</strong> ${userProfile.inspectorName || 'Não informado'}</p></div>
                <div><p><strong>Endereço:</strong> ${entryData.property.address}</p></div>
                <div><p><strong>Data da Entrada:</strong> ${format(entryData.inspectionDate, 'dd/MM/yyyy', { locale: ptBR })}</p></div>
                <div><p><strong>Data da Saída:</strong> ${format(exitData.inspectionDate, 'dd/MM/yyyy', { locale: ptBR })}</p></div>
            </div>
            <div class="mt-6 border-t pt-6">
                <h3 class="font-semibold text-lg text-gray-800 mb-2">Apontamentos da Vistoria</h3>
                <p class="text-xs text-gray-600 leading-relaxed">
                    O presente relatório tem como objetivo registrar o estado de conservação e funcionamento do imóvel na data da vistoria, em conformidade com a Lei nº 8.245/91 (Lei do Inquilinato).
                    <br>A vistoria foi realizada por observação visual, avaliando aspectos estéticos, acabamentos e funcionamento aparente do imóvel.
                    <br>Não são contemplados neste relatório: análises estruturais, fundações, solidez da construção ou eventuais vícios ocultos que não sejam perceptíveis no momento da vistoria.
                </p>
            </div>
        </div>
        ${reportConfig.summary ? `
        <div class="report-page max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <div class="p-6 bg-gray-50 rounded-lg">
                <h2 class="text-2xl font-semibold text-gray-700 mb-4 text-center">Resumo das Diferenças</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div class="bg-yellow-100 p-4 rounded-lg">
                        <p class="text-4xl font-bold text-yellow-600">${totalChanges.changed}</p>
                        <p class="text-sm font-medium text-yellow-800">Itens com Condição Alterada</p>
                    </div>
                    <div class="bg-green-100 p-4 rounded-lg">
                        <p class="text-4xl font-bold text-green-600">${totalChanges.new}</p>
                        <p class="text-sm font-medium text-green-800">Itens Novos na Saída</p>
                    </div>
                    <div class="bg-red-100 p-4 rounded-lg">
                        <p class="text-4xl font-bold text-red-600">${totalChanges.missing}</p>
                        <p class="text-sm font-medium text-red-800">Itens Faltando na Saída</p>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
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
