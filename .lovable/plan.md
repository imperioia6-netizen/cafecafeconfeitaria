

# Reordenar Sidebar — Gestao no Topo

Mudanca simples na ordem do array `navGroups` em `src/components/layout/AppSidebar.tsx`.

## O que muda

O array `navGroups` (linhas 13-38) sera reordenado de:

1. Operacao
2. Gestao
3. Pessoal

Para:

1. **Gestao** (agora no topo)
2. Operacao
3. Pessoal

## Detalhes Tecnicos

Apenas mover o bloco do grupo "Gestao" (linhas 23-31) para a primeira posicao do array, antes de "Operacao". Nenhuma outra alteracao necessaria — o componente ja renderiza os grupos na ordem do array.

