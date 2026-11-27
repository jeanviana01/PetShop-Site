-- Execute no SQL Editor do seu projeto Supabase.
-- NÃO coloque chaves privadas ou senhas neste repositório.
-- Após executar, crie um usuário no Auth > Users e insira seu UUID em petshop_admins.
create extension if not exists pgcrypto;

create table if not exists public.petshop_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.petshop_admins enable row level security;
revoke all on public.petshop_admins from anon;
grant select on public.petshop_admins to authenticated;

drop policy if exists petshop_admins_own_profile on public.petshop_admins;
create policy petshop_admins_own_profile on public.petshop_admins
for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.petshop_feedback (
  id uuid primary key default gen_random_uuid(),
  image_path text not null unique check (image_path ~ '^feedbacks/[a-f0-9-]{36}\\.webp$'),
  created_at timestamptz not null default now()
);
alter table public.petshop_feedback enable row level security;
grant select on public.petshop_feedback to anon, authenticated;
grant insert, delete on public.petshop_feedback to authenticated;

drop policy if exists petshop_feedback_public_read on public.petshop_feedback;
create policy petshop_feedback_public_read on public.petshop_feedback
for select to anon, authenticated using (true);

drop policy if exists petshop_feedback_admin_insert on public.petshop_feedback;
create policy petshop_feedback_admin_insert on public.petshop_feedback
for insert to authenticated with check (
  exists (select 1 from public.petshop_admins a where a.user_id = (select auth.uid()))
);

drop policy if exists petshop_feedback_admin_delete on public.petshop_feedback;
create policy petshop_feedback_admin_delete on public.petshop_feedback
for delete to authenticated using (
  exists (select 1 from public.petshop_admins a where a.user_id = (select auth.uid()))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('petshop-feedback', 'petshop-feedback', true, 3145728, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists petshop_storage_admin_select on storage.objects;
create policy petshop_storage_admin_select on storage.objects
for select to authenticated using (
  bucket_id = 'petshop-feedback' and
  exists (select 1 from public.petshop_admins a where a.user_id = (select auth.uid()))
);

drop policy if exists petshop_storage_admin_insert on storage.objects;
create policy petshop_storage_admin_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'petshop-feedback' and
  name ~ '^feedbacks/[a-f0-9-]{36}\\.webp$' and
  exists (select 1 from public.petshop_admins a where a.user_id = (select auth.uid()))
);

drop policy if exists petshop_storage_admin_delete on storage.objects;
create policy petshop_storage_admin_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'petshop-feedback' and
  exists (select 1 from public.petshop_admins a where a.user_id = (select auth.uid()))
);

-- IMPORTANTE: substitua pelo UUID do usuário que você criou em Authentication > Users:
-- insert into public.petshop_admins(user_id) values ('00000000-0000-0000-0000-000000000000');
