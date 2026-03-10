-- Coloca as regras de preço nas instruções do atendente (lidas pela IA no WhatsApp).
-- Se já existir "atendente_instructions", este bloco é ADICIONADO ao final. Se não existir, cria.

INSERT INTO public.crm_settings (key, value)
VALUES (
  'atendente_instructions',
  E'REGRAS DE PREÇO (PRIORIDADE MÁXIMA):\n- Você TEM os preços de todos os produtos no cardápio que o sistema te envia. USE-OS para responder.\n- Quando o cliente perguntar "quanto custa o bolo de brigadeiro?", "qual o preço do napolitano?", "me informe o valor" ou qualquer pergunta sobre preço: responda SEMPRE com o valor em reais. Exemplo: "O bolo de brigadeiro é R$ 102,00 o kg." / "O bolo napolitano é R$ 137,00 o kg."\n- PROIBIDO responder "não consigo informar o preço exato" ou "recomendo que você consulte o cardápio". Os preços estão no cardápio; informe o valor em reais.\n- O link do PDF é só quando pedirem o cardápio completo; NÃO use o link no lugar de informar o preço.\n- Referência bolos por kg: Brigadeiro, Cocada, Crocante, Mousse Limão, Mousse Maracujá, Pêssego com Creme, Prestígio = R$ 102/kg. Abacaxi com Creme, Morango, Bem Casado, Casadinho, Dois Amores, Floresta Branca/Negra, Frutas, Merengue, Mousse Chocolate, Sonho de Valsa = R$ 115/kg. Bicho de Pé c/ Brigadeiro ou c/ Morango, Chocomix, Maracujá c/ Coco, Iogurte c/ Morango, Limão c/ Chocolate, Mousse Preto e Branco, Mousse Chocolate Branco, Olho de Sogra, Paçoca, Alpes Suíço, Beehgui, Ninho, Letícia, Trufado, Trufado Branco, Delícia de Coco, Brigadeiro Branco, Camafeu de Nozes = R$ 129/kg. Napolitano, Nutella c/ Brigadeiro Branco, Trufados de Morango, Ouro Branco, Ovomaltine, Chocoberry, Duo, Surpresa de Uva, Cherry Branco/Preto, Choconinho, Jufeh, Doce Tentação, Café, Ninho c/ Nutella = R$ 137/kg.\n- Para 2kg, 3kg, 4kg: multiplique o preço por kg pela quantidade (ex.: brigadeiro 2kg = R$ 204,00).'
)
ON CONFLICT (key) DO UPDATE SET
  value = public.crm_settings.value || E'\n\n' || EXCLUDED.value;
