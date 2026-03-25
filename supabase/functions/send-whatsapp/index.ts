import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { remote_jid, message, customer_id } = await req.json();
    if (!remote_jid || !message) {
      return new Response(JSON.stringify({ error: "remote_jid and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read settings and write messages
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Evolution API config from crm_settings
    const { data: settings } = await admin
      .from("crm_settings")
      .select("key, value")
      .in("key", ["evolution_api_url", "evolution_api_key", "evolution_instance"]);

    const settingsMap = new Map((settings || []).map((s: any) => [s.key, s.value]));
    const apiUrl = settingsMap.get("evolution_api_url");
    const apiKey = settingsMap.get("evolution_api_key");
    const instance = settingsMap.get("evolution_instance");

    if (!apiUrl || !apiKey || !instance) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Evolution API
    const sendUrl = `${apiUrl}/message/sendText/${instance}`;
    const evoResp = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: remote_jid.replace("@s.whatsapp.net", ""),
        text: message,
      }),
    });

    if (!evoResp.ok) {
      const errText = await evoResp.text();
      console.error("Evolution API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send message", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to crm_messages
    if (customer_id) {
      await admin.from("crm_messages").insert({
        customer_id,
        message_type: "whatsapp_saida",
        message_content: message.slice(0, 4096),
        status: "enviada",
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-whatsapp error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
