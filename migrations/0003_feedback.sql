create table if not exists feedback (
  id bigserial primary key,
  message text not null,
  page text not null,
  created_at timestamptz not null default now()
);
