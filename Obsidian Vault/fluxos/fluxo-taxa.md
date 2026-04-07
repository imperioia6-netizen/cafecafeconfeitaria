FLUXO DE TAXA DE ENTREGA

1. Perguntar endereco completo (rua, numero, bairro, CEP, complemento)
2. Identificar bairro
3. Consultar tabela de taxas no sistema
4. Se bairro esta no sistema: informar taxa exata
5. Se bairro NAO esta no sistema: "Vou verificar com a equipe como fica a entrega pro seu endereco!" + [ALERTA_EQUIPE]
6. Quando equipe retornar: "A equipe me retornou e a taxa pro seu endereco e R$[valor]"
7. Somar taxa ao total do pedido
8. Informar ao cliente: "Seu pedido fica R$[subtotal] + R$[taxa] de entrega = R$[total]"

REGRAS:
- Entrega de bolos: SOMENTE ate 3kg
- Bolos 4kg+: retirada obrigatoria (ou Uber Flash por conta do cliente)
- Pedido minimo delivery: R$50 (sem contar taxa)
- Tempo: 15 a 30 min. Chuva/imprevistos: ate 1h
- Espacar deliverys para destinos distantes