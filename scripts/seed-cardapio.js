/**
 * Insere o cardápio completo (03-11) na tabela recipes.
 * Uso: node scripts/seed-cardapio.js
 * Coloque SUPABASE_SERVICE_ROLE_KEY no .env (Supabase Dashboard > Settings > API > service_role)
 */
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://osewboiklhfiunetoxzo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY. Em PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="sua_chave"; node scripts/seed-cardapio.js');
  process.exit(1);
}

const itens = [
  { name: 'Coxinha com Catupiry', category: 'salgado', sale_price: 13, description: 'Tradicional' },
  { name: 'Kibe', category: 'salgado', sale_price: 13, description: 'Tradicional' },
  { name: 'Pão de Batata', category: 'salgado', sale_price: 13, description: 'Tradicional' },
  { name: 'Empada Palmito', category: 'salgado', sale_price: 17 },
  { name: 'Empada Frango com Catupiry', category: 'salgado', sale_price: 17 },
  { name: 'Empada Carne seca com abóbora', category: 'salgado', sale_price: 17 },
  { name: 'Empada 3 Queijos com milho', category: 'salgado', sale_price: 17 },
  { name: 'Quiche Brócolis', category: 'salgado', sale_price: 17 },
  { name: 'Quiche Alho poró', category: 'salgado', sale_price: 17 },
  { name: 'Quiche Queijo', category: 'salgado', sale_price: 17 },
  { name: 'Coxinha', category: 'salgado', sale_price: 15 },
  { name: 'Risoles', category: 'salgado', sale_price: 15 },
  { name: 'Bolinho de carne', category: 'salgado', sale_price: 15 },
  { name: 'Bolinho de carne com ovo', category: 'salgado', sale_price: 15 },
  { name: 'Esfiha de carne', category: 'salgado', sale_price: 15 },
  { name: 'Esfiha de carne com queijo', category: 'salgado', sale_price: 15 },
  { name: 'Esfiha de escarola com queijo branco', category: 'salgado', sale_price: 15 },
  { name: 'Esfiha de frango com Catupiry', category: 'salgado', sale_price: 15 },
  { name: 'Esfiha de calabresa com Catupiry', category: 'salgado', sale_price: 15 },
  { name: 'Esfiha 3 queijos', category: 'salgado', sale_price: 15 },
  { name: 'Enroladinho de presunto e queijo', category: 'salgado', sale_price: 15 },
  { name: 'Hamburgão', category: 'salgado', sale_price: 15 },
  { name: 'Pão de queijo', category: 'salgado', sale_price: 7 },
  { name: 'Pão de queijo com requeijão', category: 'salgado', sale_price: 9.5 },
  { name: 'Pão com manteiga', category: 'salgado', sale_price: 7 },
  { name: 'Pão na chapa com manteiga', category: 'salgado', sale_price: 7.5 },
  { name: 'Pão na chapa com requeijão', category: 'salgado', sale_price: 8.5 },
  { name: 'Pão na chapa com requeijão (saída)', category: 'salgado', sale_price: 9 },
  { name: 'Misto frio', category: 'salgado', sale_price: 12 },
  { name: 'Misto quente', category: 'salgado', sale_price: 13 },
  { name: 'Omelete', category: 'salgado', sale_price: 10.5 },
  { name: 'Omelete com frios', category: 'salgado', sale_price: 14 },
  { name: 'Pão com ovo', category: 'salgado', sale_price: 10 },
  { name: 'Pão com ovo, queijo e bacon', category: 'salgado', sale_price: 14 },
  { name: 'Queijo quente', category: 'salgado', sale_price: 9 },
  { name: 'Queijo quente com requeijão', category: 'salgado', sale_price: 10 },
  { name: 'Mortadela quente', category: 'salgado', sale_price: 9 },
  { name: 'Bauru', category: 'salgado', sale_price: 14 },
  { name: 'Americano (lanche)', category: 'salgado', sale_price: 17 },
  { name: 'Adicional (bacon, ovo, presunto, queijo)', category: 'salgado', sale_price: 3, description: 'Cada' },
  { name: 'Café coado', category: 'bebida', sale_price: 3.5, description: 'Pequeno' },
  { name: 'Café coado grande', category: 'bebida', sale_price: 5.5, description: 'Grande' },
  { name: 'Café coado com leite', category: 'bebida', sale_price: 4.5 },
  { name: 'Café coado com leite grande', category: 'bebida', sale_price: 6, description: 'Grande' },
  { name: 'Café expresso', category: 'bebida', sale_price: 6.5 },
  { name: 'Café expresso grande', category: 'bebida', sale_price: 7.5, description: 'Grande' },
  { name: 'Café expresso com leite', category: 'bebida', sale_price: 8.5 },
  { name: 'Café expresso com leite grande', category: 'bebida', sale_price: 9.5, description: 'Grande' },
  { name: 'Café expresso com Chantilly', category: 'bebida', sale_price: 9.5 },
  { name: 'Café expresso com Chantilly grande', category: 'bebida', sale_price: 10.5, description: 'Grande' },
  { name: 'Chá quente', category: 'bebida', sale_price: 8 },
  { name: 'Cappuccino', category: 'bebida', sale_price: 8 },
  { name: 'Cappuccino grande', category: 'bebida', sale_price: 10.5, description: 'Grande' },
  { name: 'Chocolate quente', category: 'bebida', sale_price: 7.5 },
  { name: 'Chocolate gelado', category: 'bebida', sale_price: 7.5 },
  { name: 'Chocolate batido', category: 'bebida', sale_price: 10 },
  { name: 'Chocolate cremoso', category: 'bebida', sale_price: 12 },
  { name: 'Leite quente', category: 'bebida', sale_price: 3 },
  { name: 'Leite quente grande', category: 'bebida', sale_price: 15, description: 'Jarra - servido 7h às 12h' },
  { name: 'Cheese Burguer Tradicional', category: 'salgado', sale_price: 20 },
  { name: 'Cheese Egg', category: 'salgado', sale_price: 21 },
  { name: 'Cheese Salada', category: 'salgado', sale_price: 21 },
  { name: 'Cheese Bacon', category: 'salgado', sale_price: 24 },
  { name: 'Cheese Egg Salada', category: 'salgado', sale_price: 22 },
  { name: 'Cheese Tudo', category: 'salgado', sale_price: 30 },
  { name: 'Dú Café', category: 'salgado', sale_price: 34.9, description: 'Pão Brioche, 2 burguers, cheddar e maionese da casa' },
  { name: 'Hambúrguer Americano', category: 'salgado', sale_price: 40.9, description: 'Pão Brioche, 2 burguers, cheddar, maionese, ovo e bacon' },
  { name: 'Saladeiro', category: 'salgado', sale_price: 39.9, description: 'Pão Brioche, 2 burguers, alface, tomate, bacon, cheddar, molho barbecue' },
  { name: 'Mix Cocho', category: 'salgado', sale_price: 43.9, description: 'Pão Brioche, 3 burguers, alface, tomate, bacon, cheddar e catupiry' },
  { name: 'Porção de fritas', category: 'salgado', sale_price: 15 },
  { name: 'Açaí com Leite Ninho', category: 'doce', sale_price: 26.9 },
  { name: 'Açaí Chocolate', category: 'doce', sale_price: 26.9 },
  { name: 'Açaí Morango', category: 'doce', sale_price: 26.9 },
  { name: 'Açaí Doce de leite com Paçoca', category: 'doce', sale_price: 28.9 },
  { name: 'Açaí Nutella', category: 'doce', sale_price: 30.9 },
  { name: 'Açaí Nutella com Leite Ninho', category: 'doce', sale_price: 30.9 },
  { name: 'Açaí Ovomaltine', category: 'doce', sale_price: 30.9 },
  { name: 'Milk Shake', category: 'bebida', sale_price: 26.9, description: 'Sabores diversos' },
  { name: 'Bolo pedaço (sabores)', category: 'bolo', sale_price: 25 },
  { name: 'Açaí com granola', category: 'doce', sale_price: 22, description: 'Banana ou morango' },
  { name: 'Adicional açaí', category: 'doce', sale_price: 2, description: 'Cada' },
  { name: 'Tortinha Morango', category: 'torta', sale_price: 15 },
  { name: 'Tortinha Limão', category: 'torta', sale_price: 13 },
  { name: 'Tortinha Brigadeiro', category: 'torta', sale_price: 13 },
  { name: 'Tortinha Uva', category: 'torta', sale_price: 17 },
  { name: 'Tortinha Banoffe', category: 'torta', sale_price: 17 },
  { name: 'Tortinha Nutella', category: 'torta', sale_price: 17 },
  { name: 'Tortinha Nutella com Morango', category: 'torta', sale_price: 17 },
  { name: 'Tortinha Holandesa', category: 'torta', sale_price: 17 },
  { name: 'Tortinha Pudim', category: 'torta', sale_price: 13 },
  { name: 'Refrigerante lata', category: 'bebida', sale_price: 8 },
  { name: 'Schweppes', category: 'bebida', sale_price: 8 },
  { name: 'Refrigerante 600ml', category: 'bebida', sale_price: 13 },
  { name: 'Refrigerante 2 litros', category: 'bebida', sale_price: 20 },
  { name: 'Suco Del Valle 1 litro', category: 'bebida', sale_price: 15 },
  { name: 'Suco de lata', category: 'bebida', sale_price: 7.5 },
  { name: 'Água sem gás', category: 'bebida', sale_price: 5 },
  { name: 'Água com gás', category: 'bebida', sale_price: 6 },
  { name: 'Água Tônica', category: 'bebida', sale_price: 8 },
  { name: 'Água de coco', category: 'bebida', sale_price: 9 },
  { name: 'Toddynho', category: 'bebida', sale_price: 6 },
  { name: 'H2O', category: 'bebida', sale_price: 13 },
  { name: 'Sprite Lemon', category: 'bebida', sale_price: 13 },
  { name: 'Guaraviton', category: 'bebida', sale_price: 6.5 },
  { name: 'Long Neck Heineken', category: 'bebida', sale_price: 12 },
  { name: 'Cerveja Original lata', category: 'bebida', sale_price: 6 },
  { name: 'Budweiser lata', category: 'bebida', sale_price: 6 },
  { name: 'Suco Laranja jarra pequena', category: 'bebida', sale_price: 15 },
  { name: 'Suco Limão jarra pequena', category: 'bebida', sale_price: 15 },
  { name: 'Suco Laranja jarra grande', category: 'bebida', sale_price: 25 },
  { name: 'Suco Limão jarra grande', category: 'bebida', sale_price: 25 },
  { name: 'Bolo Brigadeiro', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Cocada', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Crocante', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Mousse de Limão', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Mousse de Maracujá', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Pêssego com Creme', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Prestígio', category: 'bolo', sale_price: 102, description: 'Preço por kg' },
  { name: 'Bolo Abacaxi com Creme', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Ameixa com Doce de Leite', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Bem Casado', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Morango', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Abacaxi com Doce de Leite', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Bicho de Pé', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Brigadeiro com Mousse de Maracujá', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Casadinho', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Dois Amores', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Floresta Branca', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Floresta Negra', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Merengue', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Mousse de Chocolate', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Sonho de Valsa', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Frutas', category: 'bolo', sale_price: 115, description: 'Preço por kg' },
  { name: 'Bolo Mousse de Chocolate Preto e Branco', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Bicho de Pé com Brigadeiro', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Bicho de Pé com morango', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Chocomix', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Iogurte com Morango', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Limão com chocolate', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Mousse de Chocolate Branco', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Maracujá com Coco', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Nozes', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Olho de sogra', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Paçoca', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Alpes Suiço', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Beehgui', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Ninho', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Ninho com abacaxi', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Letícia', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Trufado', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Trufado branco', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Brigadeiro Branco', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Camafeu de Nozes', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Delícia de Coco', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Ninho com morango', category: 'bolo', sale_price: 129, description: 'Preço por kg' },
  { name: 'Bolo Café', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Ninho com Nutella', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Limão com Brigadeiro Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Sonho de Morango', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Maracujá com Brigadeiro Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Morango com Brigadeiro Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Choconozes', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Trufado Preto de Morango', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Trufado Branco e Preto', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Ouro Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Ovomaltine', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Trufado Branco de Morango', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Nutella com Brigadeiro Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Chocoberry', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Delicia de Mousse Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Trufado de Ninho', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Cappuccino', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Trufado com Crocante', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Duo (Brigadeiro branco e preto)', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Surpresa de Uva', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Napolitano', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Cherry Branco', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Choconinho', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Cherry Preto', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Jufeh', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Bolo Doce Tentação', category: 'bolo', sale_price: 137, description: 'Preço por kg' },
  { name: 'Docinho Brigadeiro (cento)', category: 'doce', sale_price: 190, description: 'Encomenda' },
  { name: 'Docinho Beijinho (cento)', category: 'doce', sale_price: 190, description: 'Encomenda' },
  { name: 'Docinho Bicho de pé (cento)', category: 'doce', sale_price: 190, description: 'Encomenda' },
  { name: 'Docinho Olho de Sogra (cento)', category: 'doce', sale_price: 190, description: 'Encomenda' },
  { name: 'Empada de frango (cento)', category: 'salgado', sale_price: 190, description: 'Encomenda' },
  { name: 'Empada de palmito (cento)', category: 'salgado', sale_price: 190, description: 'Encomenda' },
  { name: 'Bolinho de carne (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Bolinho de queijo (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Coxinha (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Esfiha de carne (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Esfiha de frango (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Esfiha de calabresa (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Kibe (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
  { name: 'Risoles (cento)', category: 'salgado', sale_price: 175, description: 'Encomenda' },
];

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: existing } = await supabase.from('recipes').select('name');
  const existingNames = new Set((existing || []).map((r) => r.name.toLowerCase().trim()));

  const toInsert = itens.filter((i) => !existingNames.has(i.name.toLowerCase().trim()));
  if (toInsert.length === 0) {
    console.log('Nenhum item novo para inserir (todos já existem por nome).');
    return;
  }

  const rows = toInsert.map((i) => ({
    name: i.name,
    category: i.category,
    sale_price: i.sale_price,
    description: i.description || null,
    sells_slice: true,
    sells_whole: false,
    slice_price: i.sale_price,
    slice_weight_g: 250,
    min_stock: 0,
  }));

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { data, error } = await supabase.from('recipes').insert(chunk).select('id');
    if (error) {
      console.error('Erro ao inserir:', error.message);
      process.exit(1);
    }
    inserted += (data || []).length;
    console.log('Inseridos', inserted, '/', rows.length);
  }
  console.log('Cardápio aplicado:', inserted, 'itens novos inseridos.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
