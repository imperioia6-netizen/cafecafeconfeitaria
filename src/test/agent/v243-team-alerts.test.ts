/**
 * v243 — alertas automáticos pra equipe (3 cenários do proprietário):
 *   1. Cliente mandou comprovante (PDF) → notifica equipe com detalhes do pedido
 *   2. Cliente pergunta sobre vitrine do dia → notifica equipe responder direto
 *   3. IA disse "vou verificar com a equipe" → notifica equipe ajudar
 *
 * Dedup por tipo em janela de 30-60 min (não spam o dono).
 */
import { describe, it, expect } from "vitest";
import {
  asksAboutVitrine,
  llmSaysCheckingTeam,
  canAlertNow,
  markAlertSent,
  buildTeamAlertMessage,
  decideTeamAlert,
} from "../../../supabase/functions/_shared/teamAlerts.ts";

describe("asksAboutVitrine — detector de perguntas sobre vitrine do dia", () => {
  it("'tem bolo pronto?' → true", () => {
    expect(asksAboutVitrine("tem bolo pronto?")).toBe(true);
  });

  it("'quais sabores vocês têm hoje?' → true", () => {
    expect(asksAboutVitrine("quais sabores vocês têm hoje?")).toBe(true);
  });

  it("'tem fatia do dia?' → true", () => {
    expect(asksAboutVitrine("tem fatia do dia?")).toBe(true);
  });

  it("'o que tem pronto pra levar agora' → true", () => {
    expect(asksAboutVitrine("o que tem pronto pra levar agora")).toBe(true);
  });

  it("'tem algo pronto na vitrine' → true", () => {
    expect(asksAboutVitrine("tem algo pronto na vitrine?")).toBe(true);
  });

  it("'quais bolos vocês têm agora' → true", () => {
    expect(asksAboutVitrine("quais bolos vocês têm agora?")).toBe(true);
  });

  it("'sabores do dia' → true", () => {
    expect(asksAboutVitrine("quais os sabores do dia?")).toBe(true);
  });

  it("pedido de encomenda SEM menção à vitrine → false", () => {
    expect(
      asksAboutVitrine("quero encomendar um bolo de chocolate 3kg pra amanhã")
    ).toBe(false);
  });

  it("saudação pura → false", () => {
    expect(asksAboutVitrine("oi")).toBe(false);
  });

  it("pergunta sobre preço de um sabor específico → false (não é vitrine)", () => {
    expect(asksAboutVitrine("quanto custa o brigadeiro?")).toBe(false);
  });
});

describe("llmSaysCheckingTeam — detecta quando IA consulta a equipe", () => {
  it("'vou verificar com a equipe' → true", () => {
    expect(llmSaysCheckingTeam("Vou verificar com a equipe!")).toBe(true);
  });

  it("'vou consultar a equipe' → true", () => {
    expect(llmSaysCheckingTeam("Me deixa, vou consultar a equipe pra você.")).toBe(
      true
    );
  });

  it("'deixe-me verificar' → true", () => {
    expect(llmSaysCheckingTeam("Deixe-me verificar isso e já retorno.")).toBe(
      true
    );
  });

  it("'ver se conseguimos' → true", () => {
    expect(llmSaysCheckingTeam("Vou ver se conseguimos fazer esse sabor.")).toBe(
      true
    );
  });

  it("resposta normal sem menção a equipe → false", () => {
    expect(llmSaysCheckingTeam("Beleza! Qual o peso do bolo?")).toBe(false);
  });
});

describe("canAlertNow / markAlertSent — dedup temporal", () => {
  it("sessionMemory sem registro anterior → canAlert=true", () => {
    expect(canAlertNow({}, "proof")).toBe(true);
  });

  it("registro de 1 hora atrás → canAlert=true (janela 30min)", () => {
    const mem = {
      last_team_alert_proof_at: new Date(
        Date.now() - 60 * 60 * 1000
      ).toISOString(),
    };
    expect(canAlertNow(mem, "proof", 30)).toBe(true);
  });

  it("registro de 5 min atrás → canAlert=false (janela 30min)", () => {
    const mem = {
      last_team_alert_proof_at: new Date(
        Date.now() - 5 * 60 * 1000
      ).toISOString(),
    };
    expect(canAlertNow(mem, "proof", 30)).toBe(false);
  });

  it("tipos diferentes: dedup independente", () => {
    const mem = {
      last_team_alert_proof_at: new Date().toISOString(), // agora
    };
    expect(canAlertNow(mem, "proof")).toBe(false); // mesmo tipo bloqueado
    expect(canAlertNow(mem, "vitrine")).toBe(true); // outro tipo liberado
  });

  it("markAlertSent retorna objeto com chave correta", () => {
    const out = markAlertSent("vitrine");
    expect(out).toHaveProperty("last_team_alert_vitrine_at");
    const ts = out.last_team_alert_vitrine_at;
    expect(new Date(ts).getTime()).toBeGreaterThan(0);
  });
});

describe("buildTeamAlertMessage — mensagem formatada", () => {
  it("kind=proof inclui nome, telefone, pedido e instrução de aprovar", () => {
    const msg = buildTeamAlertMessage({
      kind: "proof",
      clientName: "Maria Silva",
      clientPhone: "5511999999999",
      clientMessage: "(PDF anexado)",
      lastPedidoSummary:
        "🎂 Bolo Morango 3kg | 🥟 25 mini coxinhas | 💳 Total R$388,75",
    });
    expect(msg).toContain("COMPROVANTE RECEBIDO");
    expect(msg).toContain("Maria Silva");
    expect(msg).toContain("5511999999999");
    expect(msg).toContain("Bolo Morango 3kg");
    expect(msg.toLowerCase()).toMatch(/aprove|aprovar|confira/);
  });

  it("kind=vitrine inclui pergunta do cliente", () => {
    const msg = buildTeamAlertMessage({
      kind: "vitrine",
      clientName: "João",
      clientPhone: "5511888888888",
      clientMessage: "tem fatia do dia?",
    });
    expect(msg).toContain("VITRINE");
    expect(msg).toContain("tem fatia do dia?");
    expect(msg.toLowerCase()).toMatch(/responda|vitrine|hoje/);
  });

  it("kind=llm_checks inclui pergunta E resposta da IA", () => {
    const msg = buildTeamAlertMessage({
      kind: "llm_checks",
      clientName: "Pedro",
      clientPhone: "5511777777777",
      clientMessage: "vocês fazem bolo vegano?",
      iaReply: "Vou verificar com a equipe se conseguimos fazer.",
    });
    expect(msg).toContain("IA NÃO SOUBE");
    expect(msg).toContain("bolo vegano");
    expect(msg).toContain("Vou verificar");
  });

  it("lastPedidoSummary vazio → mostra placeholder", () => {
    const msg = buildTeamAlertMessage({
      kind: "proof",
      clientName: "X",
      clientPhone: "1",
      clientMessage: "",
      lastPedidoSummary: "",
    });
    expect(msg.toLowerCase()).toContain("resumo do pedido não encontrado");
  });
});

describe("decideTeamAlert — prioridade + dedup", () => {
  it("PDF + sem dedup → prioridade proof", () => {
    expect(
      decideTeamAlert({
        gotPdfDocument: true,
        clientMessage: "aqui o comprovante",
        iaReply: "ok",
        sessionMemory: {},
      })
    ).toBe("proof");
  });

  it("pergunta de vitrine + sem dedup → vitrine", () => {
    expect(
      decideTeamAlert({
        gotPdfDocument: false,
        clientMessage: "tem bolo pronto hoje?",
        iaReply: "...",
        sessionMemory: {},
      })
    ).toBe("vitrine");
  });

  it("IA diz 'vou verificar' → llm_checks", () => {
    expect(
      decideTeamAlert({
        gotPdfDocument: false,
        clientMessage: "vocês fazem bolo vegano?",
        iaReply: "Vou verificar com a equipe!",
        sessionMemory: {},
      })
    ).toBe("llm_checks");
  });

  it("PDF + dedup recente de proof → null (não spam)", () => {
    expect(
      decideTeamAlert({
        gotPdfDocument: true,
        clientMessage: "outro comprovante",
        iaReply: "ok",
        sessionMemory: {
          last_team_alert_proof_at: new Date(
            Date.now() - 2 * 60 * 1000
          ).toISOString(),
        },
      })
    ).toBe(null);
  });

  it("PDF + vitrine + IA-checks TODOS verdadeiros → proof (prioridade)", () => {
    expect(
      decideTeamAlert({
        gotPdfDocument: true,
        clientMessage: "tem bolo pronto hoje?",
        iaReply: "Vou verificar com a equipe!",
        sessionMemory: {},
      })
    ).toBe("proof");
  });

  it("nenhum cenário → null", () => {
    expect(
      decideTeamAlert({
        gotPdfDocument: false,
        clientMessage: "oi",
        iaReply: "Oi! Como posso ajudar?",
        sessionMemory: {},
      })
    ).toBe(null);
  });
});
