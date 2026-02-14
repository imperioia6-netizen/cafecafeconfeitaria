

# Remover secao "Paga com Influencia"

Remover o card "Paga com Influencia" do painel de configuracoes do CRM.

---

## Alteracoes

### Arquivo: `src/components/crm/N8nSettingsPanel.tsx`

- Remover o card inteiro que contem "Paga com Influencia" (icone Instagram, campos Min. Seguidores, % Desconto, botao Salvar Regras)
- Remover os estados `minFollowers` e `discountPercent`
- Remover a funcao `saveInfluence`
- Remover a inicializacao desses valores no bloco `if (settings && !loaded)`
- Remover import do icone `Instagram` se nao for usado em outro lugar

Nenhuma alteracao no banco de dados necessaria.

