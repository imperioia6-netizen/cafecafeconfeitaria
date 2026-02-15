
# Carrinho como Sidebar com Endereco e Retirada

## O que muda

Substituir o Dialog (pop-up) de checkout por um **Sheet** (sidebar lateral direita) com design cinematografico, incluindo campos de endereco de entrega ou opcao de retirada no local.

## Alteracoes em `src/pages/Cardapio.tsx`

### 1. Trocar componente Dialog por Sheet

- Remover imports de `Dialog, DialogContent, DialogHeader, DialogTitle`
- Importar `Sheet, SheetContent, SheetHeader, SheetTitle` de `@/components/ui/sheet`
- Importar `RadioGroup, RadioGroupItem` de `@/components/ui/radio-group` para a escolha entrega/retirada
- Importar icone `MapPin, Store` do lucide-react

### 2. Novo estado para entrega

Adicionar estados:
- `deliveryMode`: `'pickup' | 'delivery'` (default: `'pickup'`)
- `address`: string (rua)
- `addressNumber`: string (numero)
- `addressComplement`: string (complemento)

### 3. Layout do Sheet (sidebar direita)

Estrutura do conteudo do Sheet:

```text
[  Seu Pedido                    X ]  <- SheetHeader
[─────────────────────────────────]
[  ITENS DO CARRINHO              ]
[  - foto mini | nome | qtd | R$  ]  <- cada item com controles +/-
[  - foto mini | nome | qtd | R$  ]
[─────────────────────────────────]
[  DADOS DO CLIENTE               ]
[  Nome *          [__________]   ]
[  Telefone        [__________]   ]
[─────────────────────────────────]
[  COMO RECEBER                   ]
[  (o) Retirar no local          ]
[  ( ) Entrega                    ]
[                                 ]
[  Se entrega:                    ]
[  Endereco *      [__________]   ]
[  Numero *        [____]         ]
[  Complemento     [__________]   ]
[─────────────────────────────────]
[  Total         R$ 115,00        ]
[  [=== Confirmar Pedido ====]    ]
```

### 4. Design cinematografico

- Sheet com `side="right"` e largura `max-w-md w-full`
- Fundo com gradiente escuro sutil: `bg-gradient-to-b from-card to-background`
- Titulo "Seu Pedido" com fonte `'Playfair Display'`
- Labels com `'DM Sans'`, `uppercase text-[11px] tracking-widest`
- Inputs com `bg-secondary/50 border-border/60 rounded-xl`
- Itens do carrinho com thumbnail pequena (40x40 rounded), nome, controles +/- inline, e preco
- Secao "Como Receber" com RadioGroup estilizado (pills ou cards pequenos com icones MapPin e Store)
- Campos de endereco aparecem com animacao suave (condicional ao `deliveryMode === 'delivery'`)
- Botao confirmar com `rounded-full bg-accent glow-accent`
- Scroll interno com scrollbar escondida

### 5. Atualizar handleSubmitOrder

- Incluir `delivery_mode`, `address`, `address_number`, `address_complement` no body enviado a edge function (campos opcionais que o backend pode ignorar por enquanto)

### 6. Atualizar handleNewOrder

- Resetar os novos campos de endereco e delivery mode

## Arquivos alterados:
- `src/pages/Cardapio.tsx` -- unico arquivo modificado
