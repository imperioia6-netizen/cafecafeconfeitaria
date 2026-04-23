/**
 * v242 — vazamento de contexto antigo para novos turnos.
 *
 * Screenshot real mostrou:
 *  1. Cliente "ola" → LLM "Quer 4kg ou 5kg?" (contexto antigo de 4,5kg)
 *  2. Cliente "novo pedido" → OK
 *  3. Cliente "encomenda" → LLM "Nutella puro a gente não faz, mas temos
 *     Ninho com Nutella. Enquanto isso, me diz pra que data..."
 *     (alucinação: "encomenda" é modalidade, não sabor; contexto de nutella
 *     veio de conversa antiga ainda no banco)
 *
 * 3 linhas de defesa:
 *   A. conversation_reset_at persistido → histórico filtrado no DB
 *   B. enforceIntentAlignment pega "sabor/nutella/morango" em provide_order_type
 *   C. enforceGreetingReset substitui continuação cega quando cliente saudou
 */
import { describe, it, expect } from "vitest";
import {
  enforceIntentAlignment,
  enforceGreetingReset,
} from "../../../supabase/functions/_shared/priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

describe("Defesa B — enforceIntentAlignment pega 'sabor/nutella' em provide_order_type", () => {
  it("cliente 'encomenda' + LLM fala de 'nutella' → substitui por pergunta de modalidade", () => {
    const out = enforceIntentAlignment(
      "Vou verificar com a equipe sobre esses sabores! Nutella puro a gente não faz, mas temos Ninho com Nutella. Enquanto isso, me diz pra que data e horário você precisa?",
      {
        intent: "provide_order_type",
        next_action: "ask_entrega_ou_retirada",
        entities: { order_type: "encomenda" },
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toContain("nutella");
    expect(out.toLowerCase()).not.toContain("ninho com");
    expect(out.toLowerCase()).toMatch(/entrega|retirada|data/);
  });

  it("cliente 'encomenda' + LLM menciona 'sabores' (plural) → substitui", () => {
    const out = enforceIntentAlignment(
      "Vou consultar sobre esses sabores com a equipe!",
      {
        intent: "provide_order_type",
        next_action: "ask_entrega_ou_retirada",
        entities: { order_type: "encomenda" },
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toContain("sabores");
    expect(out.toLowerCase()).toMatch(/entrega|retirada/);
  });

  it("cliente 'delivery' + LLM alucina 'morango' → substitui", () => {
    const out = enforceIntentAlignment(
      "Perfeito! Anotei bolo de morango 2kg. Quer mais algo?",
      {
        intent: "provide_order_type",
        next_action: "continue_conversation",
        entities: { order_type: "delivery" },
        client_short_affirmation: false,
        last_assistant_had_pix: false,
      }
    );
    expect(out.toLowerCase()).not.toContain("morango");
    expect(out.toLowerCase()).toMatch(/vai querer|me diz/);
  });

  it("cliente 'retirada' + LLM resposta apropriada (sem sabor) → preserva", () => {
    const resp = "Beleza! Me diz o que vai querer, por favor 😊";
    const out = enforceIntentAlignment(resp, {
      intent: "provide_order_type",
      next_action: "continue_conversation",
      entities: { order_type: "retirada" },
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out).toBe(resp);
  });
});

describe("Defesa C — enforceGreetingReset substitui continuação cega", () => {
  it("cliente 'ola' + LLM 'Quer que seja de 4kg ou 5kg?' → substitui (sem session)", () => {
    const reply = "A gente trabalha com peso inteiro. Quer que seja de 4kg ou 5kg?";
    const out = enforceGreetingReset(reply, "ola", [], {});
    // Não pode passar intacto — é continuação cega de turno antigo
    expect(out).not.toBe(reply);
    expect(out.toLowerCase()).toMatch(/oi|ol[áa]|bem.?vindo|como posso/);
  });

  it("cliente 'olá' + session tem pedido mas resposta é continuação cega → pergunta continuar/novo", () => {
    const sessionMem = {
      confirmed_flavor: "morango",
      confirmed_weight: "2kg",
      order_items: [] as string[],
    };
    const reply = "Qual forma de pagamento você prefere?";
    const out = enforceGreetingReset(reply, "olá", [], sessionMem);
    expect(out.toLowerCase()).toMatch(/continuar|novo/);
  });

  it("cliente 'oi' + LLM cumprimento legítimo → preserva", () => {
    const reply = "Oi! Bem-vindo à Café Café Confeitaria 😊 Como posso te ajudar hoje?";
    const out = enforceGreetingReset(reply, "oi", [], {});
    expect(out).toBe(reply);
  });

  it("cliente 'oi' + LLM 'Oi de novo! Continuar pedido anterior?' + session com pedido → preserva", () => {
    const sessionMem = {
      confirmed_flavor: "morango",
      confirmed_weight: "2kg",
      order_items: [] as string[],
    };
    const reply =
      "Oi de novo! Você tem um pedido em aberto — quer continuar de onde paramos ou começar um novo?";
    const out = enforceGreetingReset(reply, "oi", [], sessionMem);
    expect(out).toBe(reply);
  });

  it("cliente 'bom dia' + LLM resposta curta neutra → preserva", () => {
    const reply = "Bom dia! Como posso ajudar?";
    const out = enforceGreetingReset(reply, "bom dia", [], {});
    expect(out).toBe(reply);
  });

  it("NÃO é greeting pura ('quero fazer pedido') → passa sem mexer", () => {
    const reply = "Perfeito! Me diz o sabor e o peso, por favor.";
    const out = enforceGreetingReset(reply, "quero fazer pedido", [], {});
    expect(out).toBe(reply);
  });
});

describe("Cenário composto (screenshot real v242)", () => {
  it("encomenda + nutella alucinada → enforceIntentAlignment substitui por modalidade", () => {
    // Exata mensagem que saiu em produção
    const exact =
      "Vou verificar com a equipe sobre esses sabores! Nutella puro a gente não faz, mas temos Ninho com Nutella. Enquanto isso, me diz pra que data e horário você precisa?";
    const out = enforceIntentAlignment(exact, {
      intent: "provide_order_type",
      next_action: "ask_entrega_ou_retirada",
      entities: { order_type: "encomenda" },
      client_short_affirmation: false,
      last_assistant_had_pix: false,
    });
    expect(out).toBe(
      "Ótimo! A encomenda vai ser com entrega ou retirada? E já pode me informar a data, por favor 😊"
    );
  });

  it("ola + continuação cega → enforceGreetingReset substitui por boas-vindas", () => {
    const exact = "A gente trabalha com peso inteiro. Quer que seja de 4kg ou 5kg?";
    const out = enforceGreetingReset(exact, "ola", [], {});
    expect(out.toLowerCase()).toMatch(/oi|como posso|bem.?vindo/);
  });
});
