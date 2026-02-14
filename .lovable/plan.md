

# Cafe Cafe — Analise Completa: O que Falta Construir

Apos revisar todo o sistema atual e cruzar com a lista de requisitos, aqui esta o mapeamento completo.

---

## O que JA ESTA CONSTRUIDO

| Modulo | Status |
|--------|--------|
| Receitas (peso, fatias, custo) | Pronto |
| Producao (balanca -> fatias automatico) | Pronto |
| Estoque em tempo real (barra de vida, alerta 12h) | Pronto |
| PDV / Vendas (deduz estoque automatico) | Pronto |
| 3 Caixas independentes (Caixa 1, 2, Delivery) | Pronto |
| Fechamento por forma de pagamento | Pronto |
| Relatorios 7/15/30 dias com producao vs vendas | Pronto |
| Alertas (estoque baixo, validade 12h, desperdicio) | Pronto |
| CRM com base de clientes | Pronto |
| Aniversarios (6 mensagens, cliente + familiar) | Pronto |
| Reativacao de inativos 30d+ | Pronto |
| Pipeline/Kanban de leads | Pronto |
| Influencia (desconto por seguidores) | Pronto |
| WhatsApp Connect (QR Code preparado) | Pronto |
| Integracao n8n | Pronto |
| Equipe e permissoes | Pronto |
| Dashboard com KPIs | Pronto |

---

## O que FALTA CONSTRUIR (Priorizado)

### PRIORIDADE 1 — Impacto Imediato no Negocio

**1. Promocao Automatica de Bolo Parado 12h+ no Delivery**
- Quando um item passa de 12h no estoque, gerar automaticamente uma oferta com desconto
- Enviar via WhatsApp/n8n para lista de clientes
- Manter qualidade e evitar desperdicio

**2. Relatorio Automatico com Comparacao**
- Sistema gera relatorio e "fala" com o Felipe: "Felipe, fiz o fechamento dos ultimos 7 dias..."
- Compara com semanas anteriores
- Sugere melhorias com base nos dados
- Envia automaticamente (pode usar n8n)

**3. Sugestoes de Upsell por IA**
- Cruzar dados: "80% dos clientes que pedem bolo de morango tambem pedem X"
- Gerar copy para vendedores oferecerem
- Mostrar potencial de ganho: "Esses 40% nao estao entrando"

**4. Balancete de Economia**
- Painel mostrando: quanto eliminou de gasto, quanto lucrou a mais, quanto tempo economizou
- Comparativo antes/depois do sistema

### PRIORIDADE 2 — Cadeia de Suprimentos

**5. Lista de Compras Automatica**
- Baseada no estoque atual + previsao de 7 dias de vendas
- Gerar lista com quantidades necessarias

**6. Cotacao em Fornecedores**
- Tabela com 5 fornecedores atuais + 3 alternativos
- Comparar precos por ingrediente
- Destaque automatico do mais barato

**7. Negociacao com Fornecedor via IA**
- Gerar script de negociacao: "Olha, ja sou cliente ha um tempo e encontrei preco melhor..."
- Enviar mensagem automatica e deixar pedido pendente (so pagamento)

### PRIORIDADE 3 — Inteligencia Preditiva

**8. Previsao de Demanda**
- Cruzar: clima (chuva/calor), dia da semana, historico de vendas
- Sinalizar: "Hoje vai chover a tarde, previsao de vendas sera X para delivery e Y para balcao"
- Sugerir producao ideal

**9. Integracao iFood**
- Buscar dados de tendencias: "Em tal data vende mais isso, no inverno vende mais aquilo"
- Aumentar previsibilidade de producao

### PRIORIDADE 4 — CRM Avancado

**10. Social Seller Funnel**
- Novo seguidor -> mensagem automatica: "30% de cashback, pague 1kg e leve 1,7kg"
- Cadencia de follow-up para novos leads

**11. Bot WhatsApp Humanizado**
- Audio e texto
- Respostas humanizadas sem parecer bot
- Integrado com estoque e agenda

**12. Sistema de Atendimento Inteligente**
- Acesso a agenda, estoque e cozinha
- Previsao de entrega ao cliente
- Aviso automatico quando pronto
- Sugestoes alternativas com 30% cashback se nao der no prazo

### PRIORIDADE 5 — Marketing e Engajamento

**13. Banco de Fotos + Criativos + Post Automatico**
- Upload de fotos de produtos
- IA gera criativos e copy
- Posta direto nas redes sociais

**14. IA Festa Surpresa**
- Sugestoes de como organizar festa
- Montar cardapio personalizado
- Integrado com dados do cliente (aniversario do familiar)

**15. Estrategia de Download do App**
- No login: pedir telefone + nome do familiar + data de aniversario
- Gamificacao para incentivar cadastro

**16. Conferencia de Estoque via Foto/Camera**
- Tirar foto do estoque
- IA identifica e compara com o sistema

**17. Checkout no App**
- Pagamento direto pelo aplicativo
- Integrado com maquininha

**18. Sugestoes de Acao de Vendas**
- Oportunidades de mercado baseadas em dados
- IA incentivando: "Por que esses 40% nao estao entrando?"

---

## Recomendacao de Implementacao

Sugiro comecar pela **Prioridade 1** pois gera impacto imediato sem grande complexidade:

1. Promocao automatica de bolo 12h+ (usa dados que ja existem)
2. Relatorio inteligente com comparacao (ja temos os dados de vendas)
3. Sugestoes de upsell (cruzamento de dados existentes)
4. Balancete de economia (dashboard novo)

Depois avancar para fornecedores (Prioridade 2) e previsao de demanda (Prioridade 3).

As prioridades 4 e 5 dependem de APIs externas (WhatsApp Business, OpenAI, iFood, redes sociais) e podem ser implementadas gradualmente.

---

## Detalhes Tecnicos

### Novas tabelas Supabase necessarias
- `suppliers` — fornecedores com precos
- `purchase_lists` — listas de compra geradas
- `purchase_items` — itens da lista
- `supplier_quotes` — cotacoes recebidas
- `demand_forecasts` — previsoes de demanda
- `auto_promotions` — promocoes automaticas geradas
- `content_library` — banco de fotos/criativos
- `ai_reports` — relatorios gerados por IA

### Novas Edge Functions
- `generate-report` — gera relatorio inteligente com comparacao
- `demand-forecast` — previsao de demanda com clima
- `auto-promotion` — gera promocao para bolos 12h+
- `upsell-suggestions` — analisa padroes de compra
- `supplier-negotiate` — gera scripts de negociacao

### Novas paginas
- `/suppliers` — gestao de fornecedores e cotacoes
- `/purchase-list` — lista de compras automatica
- `/forecast` — previsao de demanda

### Integracao com APIs externas (futuro)
- OpenWeatherMap — dados de clima
- WhatsApp Business API — bot humanizado
- OpenAI/Claude — geracao de conteudo e analises
- iFood API — tendencias de mercado (se disponivel)

