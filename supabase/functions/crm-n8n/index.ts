import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action_type, customer_data } = body

    if (!action_type || !customer_data) {
      return new Response(JSON.stringify({ error: 'action_type e customer_data são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get n8n webhook URL from settings
    const { data: setting } = await supabase
      .from('crm_settings')
      .select('value')
      .eq('key', 'n8n_webhook_url')
      .maybeSingle()

    if (!setting?.value) {
      return new Response(JSON.stringify({ error: 'URL do webhook n8n não configurada. Vá em CRM > Configurações.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const webhookUrl = setting.value

    // Call n8n webhook with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    let n8nResponse: any = null
    let messageStatus: string = 'pendente'
    let messageContent: string | null = null

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type, customer_data }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        n8nResponse = await res.json()
        messageContent = n8nResponse?.message || n8nResponse?.content || JSON.stringify(n8nResponse)
        messageStatus = 'enviada'
      } else {
        messageContent = `Erro do n8n: ${res.status} ${res.statusText}`
        messageStatus = 'erro'
      }
    } catch (fetchError: any) {
      clearTimeout(timeout)
      messageContent = fetchError.name === 'AbortError'
        ? 'Timeout: n8n não respondeu em 30s'
        : `Erro de conexão: ${fetchError.message}`
      messageStatus = 'erro'
    }

    // Save message to crm_messages
    if (customer_data.customer_id) {
      await supabase.from('crm_messages').insert({
        customer_id: customer_data.customer_id,
        message_type: action_type,
        message_content: messageContent,
        status: messageStatus,
        sent_at: messageStatus === 'enviada' ? new Date().toISOString() : null,
      })
    }

    return new Response(JSON.stringify({
      success: messageStatus !== 'erro',
      status: messageStatus,
      message: messageContent,
      n8n_response: n8nResponse,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
