import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOwner, isOwnerPhoneInList, parseOwnerPhonesList, normalizePhone } from "../_shared/getOwner.ts";
import { runAssistente } from "../_shared/agentLogic.ts";
import { sanitizeMessage, sanitizeHistory } from "../_shared/security.ts";
import { extractTextFromPdf } from "../_shared/pdfExtract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_REPLY = "Olá! Sou o assistente do Café Café Confeitaria. Para informações internas e relatórios, acesse o painel como proprietário ou entre em contato pelo canal oficial.";
const ERROR_REPLY = "Desculpe, ocorreu um erro. Tente novamente em instantes.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { message, origin = "app", remotePhone, history: rawHistory, pdfBase64 } = body as {
      message?: unknown;
      origin?: string;
      remotePhone?: unknown;
      history?: unknown;
      pdfBase64?: string;
    };
    let userMessage = sanitizeMessage(message);
    const history = sanitizeHistory(rawHistory);

    if (typeof pdfBase64 === "string" && pdfBase64.length > 0) {
      try {
        const bin = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
        if (bin.length > 0 && bin.length <= 5 * 1024 * 1024) {
          const pdfText = await extractTextFromPdf(bin);
          if (pdfText) {
            userMessage = userMessage
              ? `${userMessage}\n\n[Conteúdo do PDF anexado]:\n${pdfText}`
              : `O usuário enviou um documento PDF.\n\n[Conteúdo do PDF]:\n${pdfText}`;
          }
        }
      } catch (_e) {
        // ignora falha no PDF e segue só com a mensagem
      }
    }

    if (!userMessage || !userMessage.trim()) {
      return new Response(JSON.stringify({ error: "Campo message é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let isOwner = false;

    if (origin === "whatsapp" && remotePhone != null) {
      const owner = await getOwner(supabase);
      const { data: ownerSettingsRows } = await supabase.from("crm_settings").select("key, value").in("key", ["owner_phones", "owner_phone_override"]);
      const ownerPhonesMap = new Map((ownerSettingsRows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
      const combined = [ownerPhonesMap.get("owner_phones"), ownerPhonesMap.get("owner_phone_override")].filter(Boolean).join("\n");
      let ownerPhonesList = parseOwnerPhonesList(combined);
      if (owner?.ownerPhone) {
        const n = normalizePhone(owner.ownerPhone);
        if (n.length >= 10 && !ownerPhonesList.includes(n)) ownerPhonesList = [...ownerPhonesList, n];
      }
      isOwner = ownerPhonesList.length > 0 && isOwnerPhoneInList(String(remotePhone), ownerPhonesList);
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace(/^\s*Bearer\s+/i, "").trim();
      if (!token) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "owner").maybeSingle();
      isOwner = !!roleRow;
    }

    if (!isOwner) {
      return new Response(JSON.stringify({ reply: GENERIC_REPLY, isOwner: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = await runAssistente(supabase, userMessage, history);

    return new Response(JSON.stringify({ reply, isOwner: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-chat error:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: "Erro interno", reply: ERROR_REPLY }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
