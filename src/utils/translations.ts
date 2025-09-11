import { DetectedObject } from '../types';

const capitalize = (s: string) => {
  if (typeof s !== 'string' || !s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const translateObjectCondition = (condition: string): string => {
  const translations: { [key: string]: string } = {
    new: 'Novo',
    good: 'Bom',
    worn: 'Desgastado',
    damaged: 'Danificado',
    not_found: 'Não encontrada',
  };
  return translations[condition] || condition;
};

export const translateRoomCondition = (condition: string): string => {
  const translations: { [key: string]: string } = {
    excellent: 'Excelente',
    good: 'Bom',
    fair: 'Regular',
    poor: 'Ruim',
  };
  return translations[condition] || condition;
};

export const translateSeverity = (severity: string): string => {
  const translations: { [key: string]: string } = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };
  return translations[severity] || severity;
};

const isFieldValid = (field: string | null | undefined): boolean => {
  return !!field && field.toLowerCase() !== 'not_found' && field.toLowerCase() !== 'n/a' && field.trim() !== '';
};

export const formatOptionalField = (field: string | null | undefined): string => {
  if (!isFieldValid(field)) {
    return 'Não informado';
  }
  return capitalize(field!);
};

export const formatObjectDescription = (object: DetectedObject): string => {
  const details = [
    isFieldValid(object.material) ? capitalize(object.material!) : null,
    isFieldValid(object.color) ? capitalize(object.color!) : null,
  ].filter(Boolean);

  const itemName = capitalize(object.item);

  if (details.length > 0) {
    return `${itemName} (${details.join(', ')})`;
  }
  return itemName;
};
