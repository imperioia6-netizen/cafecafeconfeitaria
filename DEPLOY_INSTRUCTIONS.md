# Como fazer o deploy do evolution-webhook (URGENTE)

## Pré-requisito: Instalar Supabase CLI
```bash
npm install -g supabase
```

## Passo 1: Login no Supabase
```bash
supabase login
```
(Vai abrir o navegador para autenticar)

## Passo 2: Linkar o projeto
```bash
cd cafecafeconfeitaria-main
supabase link --project-ref osewboiklhfiunetoxzo
```

## Passo 3: Deploy da função
```bash
supabase functions deploy evolution-webhook --no-verify-jwt
```

## Pronto!
A função será deployada com todos os 22 arquivos corrigidos.

## O que foi corrigido:
1. ✅ Bot não começa mais toda mensagem com "Oi! 😊"
2. ✅ Bot rejeita kg quebrado (3.5kg) e pergunta se quer arredondar
3. ✅ Bot pergunta "Deseja mais alguma coisa?" após informar/adicionar item
4. ✅ Bot mantém contexto e não volta em tópicos já resolvidos
5. ✅ Bot não confunde salgados com bolos
6. ✅ Bot diz "Vou verificar com a equipe!" quando produto não está no cardápio

## Arquivos modificados:
- `supabase/functions/evolution-webhook/index.ts`
- `supabase/functions/_shared/decisionLayer.ts`
- `supabase/functions/_shared/intentDetection.ts`
- `supabase/functions/_shared/priceEngine.ts`
- `supabase/functions/_shared/atendentePromptBase.ts`
- `supabase/functions/_shared/atendentePromptModules.ts`
- `supabase/functions/_shared/routeNotes.ts`
