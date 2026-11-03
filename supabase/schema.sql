-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.rsvps (
  id          bigint generated always as identity primary key,
  full_name   text not null check (char_length(trim(full_name)) between 2 and 80),
  guest_count int  not null check (guest_count between 1 and 20),
  created_at  timestamptz not null default now()
);

-- Organizers allowed to see the guest list. Replace with your real email(s);
-- each must also exist as a user under Authentication → Users.
create table if not exists public.admins (
  email text primary key
);
insert into public.admins (email) values ('organizer@example.com')
  on conflict do nothing;

alter table public.rsvps  enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins where email = auth.jwt() ->> 'email');
$$;

-- Guests (anonymous key): may only add an RSVP, never read the list.
drop policy if exists "guests can rsvp" on public.rsvps;
create policy "guests can rsvp" on public.rsvps
  for insert to anon, authenticated
  with check (true);

-- Organizers: read and delete (e.g. duplicates).
drop policy if exists "admins read" on public.rsvps;
create policy "admins read" on public.rsvps
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admins delete" on public.rsvps;
create policy "admins delete" on public.rsvps
  for delete to authenticated
  using (public.is_admin());

-- Live updates on the dashboard.
do $$
begin
  alter publication supabase_realtime add table public.rsvps;
exception when duplicate_object then null;
end $$;
