import { faker } from '@faker-js/faker';
import { AIAnalysisResult } from '../types';

export const generateMockAIAnalysis = (): AIAnalysisResult => ({
  objectsDetected: [
    {
      name: 'Sofá',
      confidence: 0.95,
      condition: faker.helpers.arrayElement(['new', 'good', 'worn', 'damaged']),
    },
    {
      name: 'Mesa de centro',
      confidence: 0.89,
      condition: faker.helpers.arrayElement(['new', 'good', 'worn', 'damaged']),
    },
    {
      name: 'Televisão',
      confidence: 0.92,
      condition: faker.helpers.arrayElement(['new', 'good', 'worn', 'damaged']),
    }
  ],
  issues: [
    {
      type: 'Rachadura na parede',
      severity: faker.helpers.arrayElement(['low', 'medium', 'high']),
      description: 'Pequena rachadura identificada na parede próxima à janela',
      location: 'Parede lateral direita',
      confidence: 0.87
    },
    {
      type: 'Pintura descascada',
      severity: 'low',
      description: 'Áreas com pintura descascada no rodapé',
      location: 'Rodapé da parede frontal',
      confidence: 0.78
    }
  ],
  roomCondition: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
  confidence: Number(faker.number.float({ min: 0.7, max: 0.99 }).toFixed(2)),
  description: 'Ambiente em boas condições gerais, com alguns pontos de atenção identificados pela análise automática.'
});

export const simulateAIAnalysis = (file: File): Promise<AIAnalysisResult> => {
  console.log('Simulating AI analysis for file:', file.name);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockAIAnalysis());
    }, 2000); // Simula 2 segundos de processamento
  });
};
