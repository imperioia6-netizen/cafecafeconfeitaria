

# Plano: Foto de Perfil para Todos os Usuários

## O que será feito

1. **Criar bucket `avatars`** no Supabase Storage (público) com RLS permitindo que cada usuário faça upload da própria foto e proprietários possam ver todas.

2. **Atualizar a página de Perfil (`Profile.tsx`)** para:
   - Exibir a foto atual (usando `AvatarImage`) em vez de só iniciais
   - Adicionar um botão de câmera/editar sobre o avatar
   - Ao clicar, abrir um input de arquivo (imagem)
   - Fazer upload para `avatars/{user_id}.jpg`, salvar a URL pública em `profiles.photo_url`

3. **Atualizar o `EmployeeSheet.tsx`** — já usa `member.photo_url` com `AvatarImage`, então funcionará automaticamente quando a foto existir no perfil.

## Detalhes Técnicos

### Migration SQL
- Criar bucket `avatars` (público)
- RLS: qualquer autenticado pode fazer SELECT; INSERT/UPDATE apenas onde `(storage.foldername(name))[1] = auth.uid()::text`

### Profile.tsx
- Adicionar estado `photoUrl` carregado do perfil
- Adicionar `<input type="file" accept="image/*">` oculto + botão de overlay no avatar
- No upload: `supabase.storage.from('avatars').upload(path, file, { upsert: true })` → pegar URL pública → `supabase.from('profiles').update({ photo_url })` → atualizar estado
- Mostrar `AvatarImage` quando `photoUrl` existir

