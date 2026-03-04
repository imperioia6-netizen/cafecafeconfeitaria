#!/usr/bin/env node
/**
 * Setup do banco (WhatsApp + IA).
 * Opção 1: Execute no terminal: npx supabase db push
 * Opção 2: Abra o Supabase Dashboard > SQL Editor e rode o arquivo:
 *    supabase/migrations/00_whatsapp_ia_setup_completo.sql
 */
const path = require('path');
const fs = require('fs');

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '00_whatsapp_ia_setup_completo.sql');

console.log('\n=== Setup do banco (WhatsApp + IA) ===\n');

if (!fs.existsSync(sqlPath)) {
  console.log('Arquivo SQL não encontrado:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
console.log('1. Se você tem Supabase CLI instalado, rode:');
console.log('   npx supabase db push\n');
console.log('2. Ou no Supabase Dashboard:');
console.log('   - Acesse seu projeto > SQL Editor > New query');
console.log('   - Cole o conteúdo do arquivo abaixo e execute (Run)\n');
console.log('--- Conteúdo de 00_whatsapp_ia_setup_completo.sql ---\n');
console.log(sql);
console.log('\n--- Fim ---\n');
