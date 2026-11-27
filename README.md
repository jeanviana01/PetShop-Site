# 🐾 4 Patas — Banho e Tosa

Site do pet shop **4 Patas — Banho e Tosa**.

**🌐 Acesse o site:** https://jeanviana01.github.io/PetShop-Site/

## Melhorias implementadas

- Layout original e fotos preservados.
- Menu expansível e navegação mais acessível em telas pequenas.
- Agendamento assistido: escolha do serviço e mensagem pré-preenchida no WhatsApp.
- Melhoria de carregamento: dimensões nas imagens, decodificação assíncrona e prioridade para a foto principal. **As fotos JPEG originais ainda não foram recomprimidas para WebP.**
- SEO básico: descrição, Open Graph para compartilhamento, URL canônica e favicon.
- Política de segurança de conteúdo no HTML (CSP via `meta`, com limites próprios do GitHub Pages).
- Código público de avaliações preparado para banco e armazenamento na nuvem.
- Painel administrativo em `admin.html` com autenticação, upload e exclusão — **funciona somente após ativar o Supabase**.
- Arquivos enviados no painel são redimensionados e convertidos para WebP no navegador, com limite de tamanho, enquanto o Supabase aplica RLS no servidor.

## Ativar as avaliações de verdade (pendente)

**O GitHub Pages é estático.** Ele não hospeda banco de dados, valida senhas ou protege uploads por si só. Por segurança, o painel começa **desativado** e não usa armazenamento local como se fosse uma publicação real.

1. Crie um projeto no [Supabase](https://supabase.com/) sob controle do proprietário do pet shop.
2. No SQL Editor do Supabase, execute **`supabase/setup.sql`**. Ele cria `petshop_feedback`, `petshop_admins`, um bucket público de imagens e regras de acesso RLS. Confira o resultado antes de usar.
3. Em **Authentication > Users**, crie a conta do responsável. Para uso de uma única conta, restrinja novos cadastros públicos no painel do Supabase.
4. Obtenha o UUID dessa conta e, no SQL Editor, execute **substituindo o UUID de exemplo**:

   ```sql
   insert into public.petshop_admins (user_id)
   values ('SEU-UUID-REAL-AQUI');
   ```

5. Em `assets/config.js`, preencha somente:
   - `supabaseUrl`: URL pública do projeto, por exemplo `https://seu-projeto.supabase.co`.
   - `supabaseAnonKey`: **chave pública (anon/publishable)** do projeto.
6. Salve/commite `assets/config.js`, aguarde o GitHub Pages publicar e acesse [painel de avaliações](https://jeanviana01.github.io/PetShop-Site/admin.html) com a conta autorizada.
7. Faça um upload de teste, confirme que aparece para outro visitante em outra sessão/navegador e teste a exclusão. **O projeto ainda não teve esse teste integrado, porque não há credenciais Supabase conectadas.**

**Nunca inclua no GitHub:** senha de administrador, chave `service_role`, secret key ou tokens de sessão. A chave pública é destinada ao navegador e só é segura com as políticas RLS corretas. Um bucket público torna as imagens publicadas acessíveis por URL; não publique dados pessoais de clientes sem autorização. O administrador deve ocultar telefones, nomes e outros dados antes de enviar os prints.

## Verificações antes de uso comercial

- Validar agendamento, menu, imagens e acessibilidade em Android, iPhone e desktop.
- Confirmar que o Supabase bloqueia upload/exclusão para usuários comuns.
- Confirmar funcionamento dos prints publicados em navegadores diferentes.
- Otimizar os arquivos JPEG existentes quando for possível processar as imagens originais.
- Confirmar desempenho e indicadores reais com Lighthouse ou ferramenta equivalente.
- Para cabeçalhos HTTP adicionais de segurança, usar hospedagem/CDN com configuração de cabeçalhos; a CSP `meta` não substitui todos os headers.

## Arquivos

- `index.html`: site público.
- `assets/site.js`: navegação, agendamento e exibição pública de feedbacks.
- `assets/admin.js`: login e gestão de feedbacks.
- `assets/config.js`: configuração pública do Supabase (inicialmente vazia).
- `admin.html`: painel restrito.
- `supabase/setup.sql`: esquema, bucket e políticas RLS.
- `assets/drive-photo-*.jpg`: fotos originais.

A implantação do front-end ocorre via GitHub Pages na branch `main`.
