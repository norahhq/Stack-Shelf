-- stackshelf: optional supabase schema for multi-user mode

create table public.resources (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  url        text,
  url_key    text,                -- normalised url, used to count shared resources
  domain     text default 'general',
  type       text default 'article',
  status     text default 'want' check (status in ('want','learning','done')),
  rating     int  default 0 check (rating between 0 and 5),
  note       text,
  cover      text,
  isbn       text,
  created_at timestamptz default now()
);

create index on public.resources (url_key);

alter table public.resources enable row level security;

-- each user can only see and change their own shelf
create policy "own rows" on public.resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- public leaderboard: counts distinct people per resource, exposes no personal data
create or replace view public.popular_resources
with (security_invoker = false) as
select
  url_key,
  min(title)  as title,
  min(url)    as url,
  min(domain) as domain,
  min(type)   as type,
  min(cover)  as cover,
  min(isbn)   as isbn,
  count(distinct user_id) as n
from public.resources
where url_key is not null
group by url_key
order by n desc
limit 100;

grant select on public.popular_resources to anon, authenticated;
