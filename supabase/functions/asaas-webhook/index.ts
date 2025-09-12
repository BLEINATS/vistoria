import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface WebhookEvent {
  event: string
  dateCreated: string
  payment?: {
    id: string
    customer: string
    subscription?: string // Optional for one-time payments
    status: string
    value: number
    billingType: string
    externalReference?: string // For credit payment tracking
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
        // Payment was successful
        if (webhookEvent.payment) {
          // Check if this is a subscription payment
          if (webhookEvent.payment.subscription) {
            // Handle subscription payment
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
          } else {
            // Check if this is a credit payment (one-time payment)
            const { data: creditPaymentProcessed, error: creditError } = await supabase
              .rpc('process_credit_payment_confirmation', {
                p_asaas_payment_id: webhookEvent.payment.id
              })

            if (creditError) {
              console.error('Error processing credit payment:', creditError)
              throw creditError
            }

            if (creditPaymentProcessed) {
              console.log('Credit payment confirmed and credits added:', webhookEvent.payment.id)
            } else {
              console.log('No pending credit payment found for payment ID:', webhookEvent.payment.id)
            }
          }
        }
        break

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
        // Payment failed
        if (webhookEvent.payment) {
          // Check if this is a subscription payment
          if (webhookEvent.payment.subscription) {
            // Handle subscription payment failure
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
          } else {
            // Handle credit payment failure
            const { data: creditPaymentFailed, error: creditError } = await supabase
              .rpc('process_credit_payment_failure', {
                p_asaas_payment_id: webhookEvent.payment.id
              })

            if (creditError) {
              console.error('Error processing credit payment failure:', creditError)
              throw creditError
            }

            if (creditPaymentFailed) {
              console.log('Credit payment marked as failed:', webhookEvent.payment.id)
            }
          }
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
