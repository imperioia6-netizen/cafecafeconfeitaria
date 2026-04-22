/**
 * Testa o classificador determinístico. Cada screenshot de bug reportado
 * pelo proprietário vira um caso aqui. Classificação DEVE ser correta
 * independentemente do LLM.
 */
import { describe, it, expect } from "vitest";
import {
  interpretMessage,
  type RecipeLite,
} from "../../../supabase/functions/_shared/agentInterpreter.ts";

type H = { role: "user" | "assistant"; content: string };

const RECIPES: RecipeLite[] = [
  { name: "Brigadeiro", sale_price: 102 },
  { name: "Trufado", sale_price: 129 },
  { name: "Morango", sale_price: 110 },
  { name: "Floresta Negra", sale_price: 115 },
  { name: "Ninho com Nutella", sale_price: 130 },
  { name: "Chocolate", sale_price: 95 },
];

const empty = (): H[] => [];

describe("interpretMessage — saudação", () => {
  it("'oi' → greeting + greet", () => {
    const r = interpretMessage({ message: "oi", history: empty(), recipes: RECIPES });
    expect(r.intent).toBe("greeting");
    expect(r.next_action).toBe("greet");
  });
  it("'Oi, tudo bem?' → greeting", () => {
    const r = interpretMessage({
      message: "Oi, tudo bem?",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("greeting");
  });
  it("'bom dia' → greeting", () => {
    const r = interpretMessage({ message: "bom dia", history: empty(), recipes: RECIPES });
    expect(r.intent).toBe("greeting");
  });
});

describe("interpretMessage — palavras aleatórias NÃO viram sabor", () => {
  it("'quero amanha as 13hrs' → provide_time (não sabor)", () => {
    const r = interpretMessage({
      message: "quero amanha as 13hrs",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.flavor).toBeUndefined();
    expect(r.entities.time_text).toBeTruthy();
  });

  it("'pode ser as 9 de amanhã' → provide_time", () => {
    const r = interpretMessage({
      message: "pode ser as 9 de amanhã",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.flavor).toBeUndefined();
    expect(r.intent).toBe("provide_time");
  });

  it("'quero uma escrita em cima do bolo amo voce' → provide_writing, amo voce como frase", () => {
    const r = interpretMessage({
      message: "quero uma escrita em cima do bolo amo voce",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.writing_phrase?.toLowerCase()).toContain("amo");
    expect(r.entities.flavor).toBeUndefined();
    expect(r.intent).toBe("provide_writing");
  });

  it("'decoração colorida com flores' → provide_decoration (não sabor)", () => {
    const r = interpretMessage({
      message: "decoração colorida com flores",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.decoration_description).toBeTruthy();
    expect(r.entities.flavor).toBeUndefined();
  });
});

describe("interpretMessage — entidades corretas de pedidos", () => {
  it("'bolo trufado 2kg' → start_order, flavor=Trufado, weight=2", () => {
    const r = interpretMessage({
      message: "bolo trufado 2kg",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.flavor).toBe("Trufado");
    expect(r.entities.weight_kg).toBe(2);
  });

  it("'o bolo de 4kg trufado para retirada amanha as 13hrs' → extrai tudo", () => {
    const r = interpretMessage({
      message: "o bolo de 4kg trufado para retirada amanha as 13hrs",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.weight_kg).toBe(4);
    expect(r.entities.flavor).toBe("Trufado");
    expect(r.entities.order_type).toBe("retirada");
    expect(r.entities.time_text).toBeTruthy();
  });

  it("'25 mini coxinhas' → provide_salgados com qty e types", () => {
    const r = interpretMessage({
      message: "25 mini coxinhas",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("provide_salgados");
    expect(r.entities.mini_savory_qty).toBe(25);
    expect(r.entities.mini_savory_types).toContain("coxinha");
  });

  it("'50 brigadeiros' → provide_doces", () => {
    const r = interpretMessage({
      message: "50 brigadeiros",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("provide_doces");
    expect(r.entities.sweets?.[0]).toEqual({ name: "brigadeiro", qty: 50 });
  });
});

describe("interpretMessage — confirmação e fluxo pós-PIX", () => {
  it("'só isso' → confirm_more + ask_payment_method", () => {
    const r = interpretMessage({
      message: "só isso",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("confirm_more");
    expect(r.next_action).toBe("ask_payment_method");
  });

  it("'pode fechar' → confirm_more + ask_payment_method", () => {
    const r = interpretMessage({
      message: "pode fechar",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.next_action).toBe("ask_payment_method");
  });

  it("'ok' após PIX no histórico → payment_done + wait_for_proof", () => {
    const hist: H[] = [
      {
        role: "assistant",
        content:
          "Total: R$250. Chave PIX: 11998287836. Envie o comprovante quando fizer.",
      },
    ];
    const r = interpretMessage({ message: "ok", history: hist, recipes: RECIPES });
    expect(r.intent).toBe("payment_done");
    expect(r.next_action).toBe("wait_for_proof");
  });

  it("'vou fazer o pix' após PIX → payment_done", () => {
    const hist: H[] = [
      { role: "assistant", content: "chave PIX: 11998287836" },
    ];
    const r = interpretMessage({
      message: "vou fazer o pix",
      history: hist,
      recipes: RECIPES,
    });
    expect(r.intent).toBe("payment_done");
  });

  it("PDF attachment → send_proof + confirm_proof_received", () => {
    const r = interpretMessage({
      message: "",
      history: empty(),
      recipes: RECIPES,
      hasPdfAttachment: true,
    });
    expect(r.intent).toBe("send_proof");
    expect(r.next_action).toBe("confirm_proof_received");
  });
});

describe("interpretMessage — cancel e novo pedido", () => {
  it("'cancela tudo' → cancel", () => {
    const r = interpretMessage({
      message: "cancela tudo por favor",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("cancel");
  });

  it("'quero um novo pedido' → new_order", () => {
    const r = interpretMessage({
      message: "quero um novo pedido",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("new_order");
  });

  it("'bolo novo sabor' NÃO é novo pedido", () => {
    const r = interpretMessage({
      message: "quero um bolo novo sabor",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).not.toBe("new_order");
  });
});

describe("interpretMessage — perguntas", () => {
  it("'quanto custa?' → ask_price", () => {
    const r = interpretMessage({
      message: "quanto custa o bolo de chocolate?",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("ask_price");
  });

  it("'me manda o cardápio' → ask_menu", () => {
    const r = interpretMessage({
      message: "me manda o cardápio",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("ask_menu");
  });

  it("'que hora abrem?' → ask_hours", () => {
    const r = interpretMessage({
      message: "que hora abrem?",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("ask_hours");
  });

  it("'onde fica a loja?' → ask_address", () => {
    const r = interpretMessage({
      message: "onde fica a loja?",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("ask_address");
  });
});

describe("interpretMessage — pagamento", () => {
  it("'pix' → payment_method_choice pix", () => {
    const r = interpretMessage({
      message: "pix",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("payment_method_choice");
    expect(r.entities.writes_about_payment_method).toBe("pix");
  });

  it("'vou pagar em dinheiro' → payment_method_choice dinheiro", () => {
    const r = interpretMessage({
      message: "vou pagar em dinheiro",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.writes_about_payment_method).toBe("dinheiro");
  });
});

describe("interpretMessage — comprovante + alinhamento", () => {
  it("enforceIntentAlignment: PDF+PIX tenta mandar PIX novamente → troca por confirmação", () => {
    // Testa apenas que a função separa os fluxos corretamente.
    const r = interpretMessage({
      message: "",
      history: [{ role: "assistant", content: "chave PIX: 1199" }],
      recipes: RECIPES,
      hasPdfAttachment: true,
    });
    expect(r.intent).toBe("send_proof");
    expect(r.next_action).toBe("confirm_proof_received");
  });
});

describe("interpretMessage — robustez", () => {
  it("sabor longo com 'ninho com nutella' bate exato", () => {
    const r = interpretMessage({
      message: "bolo de ninho com nutella 2kg",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.flavor).toBe("Ninho com Nutella");
  });

  it("'brigadeiro' isolado com menção a bolo → entity=Brigadeiro", () => {
    const r = interpretMessage({
      message: "bolo brigadeiro",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.entities.flavor).toBe("Brigadeiro");
  });

  it("mensagem vazia → unclear", () => {
    const r = interpretMessage({
      message: "",
      history: empty(),
      recipes: RECIPES,
    });
    expect(r.intent).toBe("unclear");
  });
});
