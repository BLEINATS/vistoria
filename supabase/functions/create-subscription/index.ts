import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateSubscriptionRequest {
  planId: string
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
}

interface AsaasCustomer {
  id: string
  name: string
  email: string
}

interface AsaasSubscription {
  id: string
  customer: string
  billingType: string
  cycle: string
  value: number
  nextDueDate: string
  status: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization token from request
    const authHeader = req.headers.get('authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { planId, paymentMethod }: CreateSubscriptionRequest = await req.json()

    // Validate paymentMethod server-side to prevent manipulation
    const validPaymentMethods: Array<'PIX' | 'BOLETO' | 'CREDIT_CARD'> = ['PIX', 'BOLETO', 'CREDIT_CARD']
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method. Must be one of: PIX, BOLETO, CREDIT_CARD' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate planId format to prevent injection attacks
    if (!planId || typeof planId !== 'string' || planId.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user profile for customer creation
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User'

    // Get plan details
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (!plans) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create customer in Asaas
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY not configured')
    }

    const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName,
        email: user.email,
      }),
    })

    if (!customerResponse.ok) {
      const error = await customerResponse.text()
      throw new Error(`Failed to create customer: ${error}`)
    }

    const asaasCustomer: AsaasCustomer = await customerResponse.json()

    // Create subscription in Asaas
    const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: asaasCustomer.id,
        billingType: paymentMethod,
        cycle: 'MONTHLY',
        value: plans.price,
        description: `VistorIA - Plano ${plans.name}`,
        nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      }),
    })

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text()
      throw new Error(`Failed to create subscription: ${error}`)
    }

    const asaasSubscription: AsaasSubscription = await subscriptionResponse.json()

    // Store subscription in our database
    const { error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_name: plans.name,
        price: plans.price,
        asaas_subscription_id: asaasSubscription.id,
        asaas_customer_id: asaasCustomer.id,
        status: 'PENDING',
        billing_type: paymentMethod,
        updated_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to save subscription to database')
    }

    // Get payment details for the first charge
    const chargeResponse = await fetch(`https://api.asaas.com/v3/payments?subscription=${asaasSubscription.id}`, {
      headers: {
        'access_token': asaasApiKey,
      },
    })

    let paymentDetails = {}
    if (chargeResponse.ok) {
      const charges = await chargeResponse.json()
      if (charges.data && charges.data.length > 0) {
        const charge = charges.data[0]
        
        if (paymentMethod === 'PIX') {
          // Get PIX details
          const pixResponse = await fetch(`https://api.asaas.com/v3/payments/${charge.id}/pixQrCode`, {
            headers: {
              'access_token': asaasApiKey,
            },
          })
          
          if (pixResponse.ok) {
            const pixData = await pixResponse.json()
            paymentDetails = {
              pixCode: pixData.payload,
              qrCodeUrl: pixData.encodedImage,
            }
          }
        } else if (paymentMethod === 'BOLETO') {
          paymentDetails = {
            boletoUrl: charge.bankSlipUrl,
            invoiceUrl: charge.invoiceUrl,
            dueDate: charge.dueDate,
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Assinatura ${plans.name} criada com sucesso!`,
        subscriptionId: asaasSubscription.id,
        paymentMethod,
        ...paymentDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})