import { AsaasClient } from 'asaas';
import type { AsaasCustomer, AsaasSubscription } from '../types/subscription';

// Initialize Asaas client
const asaasApiKey = process.env.VITE_ASAAS_API_KEY || '';
const isProduction = process.env.NODE_ENV === 'production';

export const asaas = new AsaasClient(asaasApiKey, {
  sandbox: !isProduction
});

// Customer management
export const createAsaasCustomer = async (customerData: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}): Promise<AsaasCustomer> => {
  try {
    const customer = await asaas.customers.create({
      name: customerData.name,
      email: customerData.email,
      ...(customerData.cpfCnpj && { cpfCnpj: customerData.cpfCnpj }),
      ...(customerData.phone && { phone: customerData.phone })
    });
    
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      cpfCnpj: customer.cpfCnpj,
      phone: customer.phone
    };
  } catch (error) {
    console.error('Error creating Asaas customer:', error);
    throw new Error('Falha ao criar cliente no sistema de pagamento');
  }
};

// Subscription management
export const createAsaasSubscription = async (subscriptionData: {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  cycle: 'MONTHLY' | 'YEARLY';
  value: number;
  description: string;
}): Promise<AsaasSubscription> => {
  try {
    const subscription = await asaas.subscriptions.create({
      customer: subscriptionData.customer,
      billingType: subscriptionData.billingType,
      cycle: subscriptionData.cycle,
      value: subscriptionData.value,
      description: subscriptionData.description,
      nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    });

    return {
      id: subscription.id,
      customer: subscription.customer,
      billingType: subscription.billingType as 'BOLETO' | 'CREDIT_CARD' | 'PIX',
      cycle: subscription.cycle as 'MONTHLY' | 'YEARLY',
      value: subscription.value,
      nextDueDate: subscription.nextDueDate,
      status: subscription.status as 'ACTIVE' | 'CANCELLED' | 'SUSPENDED'
    };
  } catch (error) {
    console.error('Error creating Asaas subscription:', error);
    throw new Error('Falha ao criar assinatura');
  }
};

// Cancel subscription
export const cancelAsaasSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    await asaas.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error('Error cancelling Asaas subscription:', error);
    throw new Error('Falha ao cancelar assinatura');
  }
};

// Get subscription details
export const getAsaasSubscription = async (subscriptionId: string): Promise<AsaasSubscription> => {
  try {
    const subscription = await asaas.subscriptions.getById(subscriptionId);
    
    return {
      id: subscription.id,
      customer: subscription.customer,
      billingType: subscription.billingType as 'BOLETO' | 'CREDIT_CARD' | 'PIX',
      cycle: subscription.cycle as 'MONTHLY' | 'YEARLY',
      value: subscription.value,
      nextDueDate: subscription.nextDueDate,
      status: subscription.status as 'ACTIVE' | 'CANCELLED' | 'SUSPENDED'
    };
  } catch (error) {
    console.error('Error fetching Asaas subscription:', error);
    throw new Error('Falha ao buscar detalhes da assinatura');
  }
};

// Webhook signature validation (for security)
export const validateWebhookSignature = (payload: string, signature: string): boolean => {
  // Implement Asaas webhook signature validation if provided by their API
  // For now, we'll return true, but in production you should validate the signature
  return true;
};