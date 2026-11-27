create table if not exists astrology_book (
  id text primary key,
  title text not null,
  author text not null default '',
  language text not null default '',
  category text not null,
  edition text not null default '',
  notes text not null default '',
  file_name text not null,
  byte_size integer not null,
  status text not null,
  error text,
  pdf bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astrology_book_created_idx on astrology_book (created_at desc);
