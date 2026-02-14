

# Padronizar Design dos Filtros e Abas do CRM com o Estoque

Aplicar o mesmo estilo visual de "pills" arredondadas com gradiente dourado do Estoque nos botoes de abas e filtros do CRM.

---

## Problema Atual

- **Abas do CRM** (Clientes, Pipeline, Aniversarios, etc.) usam `TabsTrigger` com estilo padrao do shadcn
- **Filtros de status** (Todos, Ativos, Inativos, Novos) usam `Badge` com cores distintas
- **Estoque** usa botoes `<button>` com `rounded-full`, gradiente marrom/dourado no ativo, e fundo sutil no inativo — visual muito mais polido

## Solucao

### 1. Filtros de Status (Todos, Ativos, Inativos, Novos)

Substituir os `Badge` clicaveis por botoes pill identicos aos do Estoque:

- `rounded-full`, `px-5 py-2`, `text-sm font-medium`
- Ativo: `background: linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))` com `text-primary-foreground`, `depth-shadow`, `scale-105`
- Inativo: `background: hsl(var(--muted) / 0.5)` com `text-muted-foreground`
- Transicao suave: `transition-all duration-500`

### 2. Abas do CRM (Clientes, Pipeline, Aniversarios, etc.)

Substituir o `TabsList` + `TabsTrigger` padrao por botoes pill com o mesmo estilo, mantendo a funcionalidade de `Tabs` por baixo. As tabs continuarao controlando o conteudo, mas os triggers terao aparencia de pills arredondadas com gradiente.

- Aplicar o mesmo padrao visual: pill arredondada, gradiente no ativo
- Manter os icones existentes (Users, Columns3, Cake, etc.)

## Detalhes Tecnicos

### Arquivo Modificado
- `src/pages/Crm.tsx`

### Alteracoes Especificas

**TabsList**: remover `glass-card border-border/30 p-1` e aplicar `flex gap-2 bg-transparent`

**TabsTrigger**: sobrescrever estilo para usar:
```
className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-500 data-[state=active]:text-primary-foreground data-[state=active]:depth-shadow data-[state=active]:scale-105 data-[state=inactive]:text-muted-foreground"
style={ isActive ? { background: 'linear-gradient(135deg, hsl(24 60% 23%), hsl(36 70% 40%))' } : { background: 'hsl(var(--muted) / 0.5)' }}
```

**Filtros de status**: substituir `Badge` por `<button>` com estilo identico ao usado em `Inventory.tsx` (linhas 81-95).

