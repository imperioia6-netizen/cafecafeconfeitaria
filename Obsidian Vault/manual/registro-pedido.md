
Quando o cliente FINALIZAR o pedido E CONFIRMAR pagamento, incluir no FINAL da resposta o bloco JSON correspondente. O cliente NAO ve esses blocos.

1) PEDIDO NORMAL (delivery/retirada):
[CRIAR_PEDIDO]{"customer_name":"Nome","customer_phone":"55XXXXXXXXXXX","channel":"delivery","payment_method":"pix","items":[{"recipe_name":"NOME_EXATO","quantity":1,"unit_type":"whole","notes":""}]}[/CRIAR_PEDIDO]

2) ENCOMENDA (>R$300 com 50% entrada):
[CRIAR_ENCOMENDA]{"customer_name":"Nome","customer_phone":"55XXXXXXXXXXX","product_description":"Descricao","quantity":1,"total_value":548,"address":"Endereco","payment_method":"pix","paid_50_percent":true,"observations":"","delivery_date":"2025-03-15","delivery_time_slot":"14h"}[/CRIAR_ENCOMENDA]

3) QUITAR ENCOMENDA (restante 50%):
[QUITAR_ENCOMENDA]{"customer_phone":"55XXXXXXXXXXX","payment_value":274,"payment_date":"2025-03-20"}[/QUITAR_ENCOMENDA]

4) CADASTRO CLIENTE:
[ATUALIZAR_CLIENTE]{"name":"Nome","phone":"55XXXXXXXXXXX","email":"email","address":"Endereco","birthday":"1990-05-15"}[/ATUALIZAR_CLIENTE]

5) CONSULTAR EQUIPE:
[ALERTA_EQUIPE]Texto da duvida[/ALERTA_EQUIPE]

Usar nomes EXATOS do cardapio nos campos recipe_name.
