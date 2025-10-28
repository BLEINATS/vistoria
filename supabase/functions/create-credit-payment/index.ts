import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface CreateCreditPaymentRequest {
  packageId: string
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
}

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  discount: number
}

interface AsaasCustomer {
  id: string
  name: string
  email: string
}

interface AsaasPayment {
  id: string
  customer: string
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
    let requestData: CreateCreditPaymentRequest
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

    const { packageId, paymentMethod } = requestData

    // Validate paymentMethod server-side to prevent manipulation
    const validPaymentMethods: Array<'PIX' | 'BOLETO' | 'CREDIT_CARD'> = ['PIX', 'BOLETO', 'CREDIT_CARD']
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payment method. Must be one of: PIX, BOLETO, CREDIT_CARD',
          received: paymentMethod 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate packageId format to prevent injection attacks
    if (!packageId || typeof packageId !== 'string' || packageId.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid package ID - must be a non-empty string' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Define credit packages server-side for security (prevent client manipulation)
    const CREDIT_PACKAGES: CreditPackage[] = [
      {
        id: 'credit-1',
        name: '1 Crédito',
        credits: 1,
        price: 49.90,
        discount: 0
      },
      {
        id: 'credit-3',
        name: 'Pacote 3 Créditos',
        credits: 3,
        price: 119.90,
        discount: 20
      },
      {
        id: 'credit-5',
        name: 'Pacote 5 Créditos',
        credits: 5,
        price: 174.90,
        discount: 30
      }
    ];

    // Find selected package server-side (never trust client data)
    const selectedPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
    if (!selectedPackage) {
      return new Response(
        JSON.stringify({ error: 'Credit package not found' }),
        {
          status: 404,
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

    // Create one-time payment in Asaas (not subscription)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3) // 3 days from now
    
    const paymentPayload = {
      customer: asaasCustomer.id,
      billingType: paymentMethod,
      value: selectedPackage.price,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `VistorIA - ${selectedPackage.name}`,
      externalReference: `credits_${user.id}_${Date.now()}`, // For webhook tracking
    }

    const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('Failed to create payment:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const asaasPayment: AsaasPayment = await paymentResponse.json()

    // Store payment record in database using service role for security
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create pending credit payment record (credits added only after webhook confirmation)
    const { error: dbError } = await serviceSupabase
      .from('credit_payments')
      .insert({
        user_id: user.id,
        asaas_payment_id: asaasPayment.id,
        asaas_customer_id: asaasCustomer.id,
        package_id: selectedPackage.id,
        package_name: selectedPackage.name,
        credits_amount: selectedPackage.credits,
        amount: selectedPackage.price,
        payment_method: paymentMethod,
        status: 'PENDING',
        external_reference: paymentPayload.externalReference,
        created_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save payment data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get payment details for the response
    let paymentDetails: any = {
      paymentId: asaasPayment.id,
      paymentMethod,
      dueDate: asaasPayment.dueDate,
      status: asaasPayment.status,
    }

    try {
      if (paymentMethod === 'PIX') {
        // Get PIX details
        const pixResponse = await fetch(`https://api.asaas.com/v3/payments/${asaasPayment.id}/pixQrCode`, {
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json',
          },
        })
        
        if (pixResponse.ok) {
          const pixData: AsaasPixData = await pixResponse.json()
          paymentDetails.pixCode = pixData.payload
          paymentDetails.qrCodeUrl = `data:image/png;base64,${pixData.encodedImage}`
        }
      } else if (paymentMethod === 'BOLETO') {
        paymentDetails.boletoUrl = asaasPayment.bankSlipUrl
        paymentDetails.invoiceUrl = asaasPayment.invoiceUrl
      }
    } catch (paymentError) {
      console.error('Error fetching payment details:', paymentError)
      // Don't fail the whole request if we can't get payment details
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Pagamento para ${selectedPackage.name} criado com sucesso!`,
        package: {
          id: selectedPackage.id,
          name: selectedPackage.name,
          credits: selectedPackage.credits,
          price: selectedPackage.price,
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
