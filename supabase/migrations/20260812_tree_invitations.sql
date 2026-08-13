-- Invitaciones seguras para colaboradores y viewers.
-- Ejecutar después de 20260812_multi_tree_roles.sql.

create extension if not exists pgcrypto;

create table if not exists public.tree_invitations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  email text not null,
  role public.tree_role not null check (role in ('editor', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  message text not null default '',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tree_invitations_one_pending_idx
  on public.tree_invitations (tree_id, lower(email)) where status = 'pending';
create index if not exists tree_invitations_tree_id_idx on public.tree_invitations (tree_id, created_at desc);
create index if not exists tree_invitations_email_idx on public.tree_invitations (lower(email), status);

alter table public.tree_invitations enable row level security;

drop policy if exists tree_invitations_select_owner on public.tree_invitations;
drop policy if exists tree_invitations_update_owner on public.tree_invitations;

create policy tree_invitations_select_owner on public.tree_invitations
  for select to authenticated
  using ((select public.is_tree_owner(tree_id)));

create policy tree_invitations_update_owner on public.tree_invitations
  for update to authenticated
  using ((select public.is_tree_owner(tree_id)))
  with check ((select public.is_tree_owner(tree_id)));

create or replace function public.create_tree_invitation(
  invitation_tree_id uuid,
  invitation_email text,
  invitation_role public.tree_role,
  invitation_message text default ''
)
returns table (id uuid, token text, tree_id uuid, email text, role public.tree_role, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  normalized_email text := lower(trim(invitation_email));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  new_invitation public.tree_invitations;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_tree_owner(invitation_tree_id) then raise exception 'Only the tree owner can invite collaborators'; end if;
  if normalized_email is null or normalized_email = '' or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'A valid email is required'; end if;
  if invitation_role not in ('editor', 'viewer') then raise exception 'Only editor or viewer invitations are allowed'; end if;
  if exists (select 1 from public.tree_memberships m join auth.users u on u.id = m.user_id where m.tree_id = invitation_tree_id and lower(u.email) = normalized_email) then
    raise exception 'This email already has access to the tree';
  end if;

  update public.tree_invitations
    set status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
    where tree_id = invitation_tree_id and lower(email) = normalized_email and status = 'pending';

  insert into public.tree_invitations (tree_id, email, role, token_hash, invited_by, message)
  values (invitation_tree_id, normalized_email, invitation_role, encode(digest(raw_token, 'sha256'), 'hex'), auth.uid(), coalesce(invitation_message, ''))
  returning * into new_invitation;

  return query select new_invitation.id, raw_token, new_invitation.tree_id, new_invitation.email, new_invitation.role, new_invitation.expires_at;
end;
$$;

create or replace function public.revoke_tree_invitation(invitation_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  update public.tree_invitations
  set status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
  where id = invitation_id and status = 'pending' and public.is_tree_owner(tree_id);
  return found;
end;
$$;

create or replace function public.accept_tree_invitation(invitation_token text)
returns table (tree_id uuid, role public.tree_role)
language plpgsql security definer set search_path = public
as $$
declare
  invitation public.tree_invitations;
  current_email text := lower(coalesce((select email from auth.users where id = auth.uid()), ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into invitation from public.tree_invitations
    where token_hash = encode(digest(trim(invitation_token), 'sha256'), 'hex') and status = 'pending'
    for update;
  if not found then raise exception 'Invitation is invalid, revoked, or already used'; end if;
  if invitation.expires_at <= now() then
    update public.tree_invitations set status = 'expired', updated_at = now() where id = invitation.id;
    raise exception 'Invitation has expired';
  end if;
  if current_email <> lower(invitation.email) then raise exception 'Sign in with the invited email address'; end if;

  insert into public.tree_memberships (tree_id, user_id, role)
  values (invitation.tree_id, auth.uid(), invitation.role)
  on conflict (tree_id, user_id) do update set role = case when public.tree_memberships.role = 'owner' then 'owner' else excluded.role end, updated_at = now();

  update public.tree_invitations set status = 'accepted', accepted_at = now(), accepted_by = auth.uid(), updated_at = now() where id = invitation.id;
  return query select invitation.tree_id, (select role from public.tree_memberships where tree_id = invitation.tree_id and user_id = auth.uid());
end;
$$;

revoke all on function public.create_tree_invitation(uuid, text, public.tree_role, text) from public, anon;
revoke all on function public.revoke_tree_invitation(uuid) from public, anon;
revoke all on function public.accept_tree_invitation(text) from public, anon;
grant execute on function public.create_tree_invitation(uuid, text, public.tree_role, text) to authenticated;
grant execute on function public.revoke_tree_invitation(uuid) to authenticated;
grant execute on function public.accept_tree_invitation(text) to authenticated;

