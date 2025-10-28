import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface CreateSubscriptionRequest {
  planId: string
  paymentMethod: 'BOLETO' | 'CREDIT_CARD'
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

interface AsaasPayment {
  id: string
  customer: string
  subscription: string
  status: string
  value: number
  dueDate: string
  bankSlipUrl?: string
  invoiceUrl?: string
}

interface AsaasPixData {
  payload: string
  encodedImage: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Get and validate authorization token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
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
      console.error('User authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate request body
    let requestData: CreateSubscriptionRequest
    try {
      requestData = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { planId, paymentMethod } = requestData

    // Validate paymentMethod server-side to prevent manipulation
    const validPaymentMethods: Array<'BOLETO' | 'CREDIT_CARD'> = ['BOLETO', 'CREDIT_CARD']
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payment method for subscriptions. Must be one of: BOLETO, CREDIT_CARD',
          received: paymentMethod 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate planId format to prevent injection attacks
    if (!planId || typeof planId !== 'string' || planId.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan ID - must be a non-empty string' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user profile for customer creation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError)
    }

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User'
    const userEmail = user.email

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      console.error('Plan not found:', planError)
      return new Response(
        JSON.stringify({ error: 'Subscription plan not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate Asaas API key
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if customer already exists in Asaas
    let asaasCustomer: AsaasCustomer | null = null
    
    const existingCustomerResponse = await fetch(`https://api.asaas.com/v3/customers?email=${encodeURIComponent(userEmail)}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (existingCustomerResponse.ok) {
      const existingCustomers = await existingCustomerResponse.json()
      if (existingCustomers.data && existingCustomers.data.length > 0) {
        asaasCustomer = existingCustomers.data[0]
      }
    }

    // Create customer in Asaas if doesn't exist
    if (!asaasCustomer) {
      const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
        }),
      })

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text()
        console.error('Failed to create customer:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to create customer account' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      asaasCustomer = await customerResponse.json()
    }

    if (!asaasCustomer) {
      return new Response(
        JSON.stringify({ error: 'Failed to create or find customer account' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create subscription in Asaas
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1) // Tomorrow
    
    const subscriptionPayload = {
      customer: asaasCustomer.id,
      billingType: paymentMethod,
      cycle: 'MONTHLY',
      value: plan.price,
      description: `VistorIA - Plano ${plan.name}`,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
    }

    const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    })

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text()
      console.error('Failed to create subscription:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const asaasSubscription: AsaasSubscription = await subscriptionResponse.json()

    // Store subscription in our database using RPC function
    const { error: dbError } = await supabase.rpc('create_user_subscription', {
      user_uuid: user.id,
      plan_name_param: plan.name,
      price_param: plan.price,
      asaas_subscription_id_param: asaasSubscription.id,
      asaas_customer_id_param: asaasCustomer.id,
      status_param: 'PENDING',
      billing_type_param: paymentMethod
    })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save subscription data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get payment details for the first charge
    let paymentDetails: any = {
      subscriptionId: asaasSubscription.id,
      paymentMethod,
    }

    try {
      // Wait a moment for the payment to be created
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const chargeResponse = await fetch(`https://api.asaas.com/v3/payments?subscription=${asaasSubscription.id}&limit=1`, {
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      })

      if (chargeResponse.ok) {
        const charges = await chargeResponse.json()
        if (charges.data && charges.data.length > 0) {
          const charge: AsaasPayment = charges.data[0]
          
          if (paymentMethod === 'BOLETO') {
            paymentDetails.boletoUrl = charge.bankSlipUrl
            paymentDetails.invoiceUrl = charge.invoiceUrl
            paymentDetails.dueDate = charge.dueDate
          } else if (paymentMethod === 'CREDIT_CARD') {
            paymentDetails.chargeId = charge.id
            paymentDetails.status = charge.status
          }
        }
      }
    } catch (paymentError) {
      console.error('Error fetching payment details:', paymentError)
      // Don't fail the whole request if we can't get payment details
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Assinatura ${plan.name} criada com sucesso!`,
        subscription: {
          id: asaasSubscription.id,
          planName: plan.name,
          price: plan.price,
          status: 'PENDING',
          nextDueDate: asaasSubscription.nextDueDate,
        },
        payment: paymentDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
