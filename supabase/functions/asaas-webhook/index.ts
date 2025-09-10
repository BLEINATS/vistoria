import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface WebhookEvent {
  event: string
  dateCreated: string
  payment?: {
    id: string
    customer: string
    subscription: string
    status: string
    value: number
    billingType: string
  }
  subscription?: {
    id: string
    customer: string
    status: string
    cycle: string
    value: number
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Validate Asaas webhook authentication token
    const asaasWebhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    if (!asaasWebhookToken) {
      console.error('ASAAS_WEBHOOK_TOKEN not configured')
      return new Response('Internal server error', { status: 500 })
    }

    // Get the authentication token from request headers
    const receivedToken = req.headers.get('asaas-access-token')
    if (!receivedToken) {
      console.warn('Webhook request missing asaas-access-token header')
      return new Response('Unauthorized - Missing authentication token', { status: 401 })
    }

    // Validate the authentication token
    if (receivedToken !== asaasWebhookToken) {
      console.warn('Webhook request with invalid authentication token')
      return new Response('Unauthorized - Invalid authentication token', { status: 401 })
    }

    // Create Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const webhookEvent: WebhookEvent = await req.json()
    console.log('Webhook event received from authenticated source:', webhookEvent.event)

    switch (webhookEvent.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        // Payment was successful - activate subscription
        if (webhookEvent.payment?.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'ACTIVE',
              updated_at: new Date().toISOString(),
            })
            .eq('asaas_subscription_id', webhookEvent.payment.subscription)

          if (updateError) {
            console.error('Error updating subscription status:', updateError)
            throw updateError
          }

          console.log('Subscription activated:', webhookEvent.payment.subscription)
        }
        break

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
        // Payment failed - suspend subscription
        if (webhookEvent.payment?.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'SUSPENDED',
              updated_at: new Date().toISOString(),
            })
            .eq('asaas_subscription_id', webhookEvent.payment.subscription)

          if (updateError) {
            console.error('Error updating subscription status:', updateError)
            throw updateError
          }

          console.log('Subscription suspended:', webhookEvent.payment.subscription)
        }
        break

      case 'SUBSCRIPTION_DELETED':
        // Subscription was cancelled
        if (webhookEvent.subscription?.id) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'CANCELLED',
              updated_at: new Date().toISOString(),
            })
            .eq('asaas_subscription_id', webhookEvent.subscription.id)

          if (updateError) {
            console.error('Error updating subscription status:', updateError)
            throw updateError
          }

          console.log('Subscription cancelled:', webhookEvent.subscription.id)
        }
        break

      default:
        console.log('Unhandled webhook event:', webhookEvent.event)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})