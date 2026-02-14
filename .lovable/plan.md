

# Substituir Botao "Novo Cliente" por Botao WhatsApp

Remover o componente `CustomerForm` (botao "+ Novo Cliente") da barra de ferramentas da aba Clientes e adicionar um botao de WhatsApp no lugar.

---

## Alteracao

**Arquivo: `src/pages/Crm.tsx`**

Na secao de busca/filtro da aba "Clientes" (linha ~113), remover o `<CustomerForm />` e substituir por um botao de WhatsApp que abre o WhatsApp Web/App com um link direto (`https://wa.me/`).

O botao tera:
- Icone do WhatsApp (usando `MessageCircle` do Lucide, ja que nao ha icone nativo do WhatsApp)
- Texto "WhatsApp"
- Cor verde caracteristica do WhatsApp (`bg-emerald-500`)
- Ao clicar, abre `https://wa.me/` em nova aba (permite ao usuario digitar o numero ou pode ser configurado)

## Detalhes Tecnicos

- Remover import do `CustomerForm` em `Crm.tsx`
- Adicionar import de `MessageCircle` do lucide-react (ou reutilizar existente)
- Substituir `<CustomerForm />` por um `<Button>` com `onClick={() => window.open('https://wa.me/', '_blank')}`
- Estilizacao: `bg-emerald-600 hover:bg-emerald-500 text-white`

