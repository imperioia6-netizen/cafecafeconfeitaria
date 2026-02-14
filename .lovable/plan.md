

# Corrigir cores do texto para preto (tema claro)

O problema: os textos das tabs inativas e dos filtros de status estao com cores claras (cinza/branco) que nao combinam com o tema claro visivel na screenshot. Precisam ser pretos/escuros.

---

## Alteracoes

### Arquivo: `src/pages/Crm.tsx`

1. **Tabs inativas** (linha 125): Mudar de `text-muted-foreground` para `text-foreground` para que o texto fique preto/escuro no tema claro.

2. **Icones das tabs inativas** (linha 131): Remover a classe condicional e deixar os icones herdarem a cor do texto (preto quando inativo, branco quando ativo).

3. **Label "Filtro:"** (linha 143): Mudar o `color` inline de `hsl(36 30% 85%)` (cor clara) para `hsl(24 30% 12%)` ou usar `text-foreground` para ficar preto.

4. **Botoes de filtro inativos** (linhas ~145-160): Mudar o `color` inline de `hsl(36 30% 75%)` (cor clara) para `text-foreground` ou cor escura equivalente.

Essas mudancas garantem que todo texto fora do estado "ativo" apareca em preto, consistente com o tema claro da aplicacao.

