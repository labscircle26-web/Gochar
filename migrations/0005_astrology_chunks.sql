alter table astrology_book add column if not exists page_count integer;

create table if not exists astrology_chunk (
  id bigserial primary key,
  book_id text not null references astrology_book (id) on delete cascade,
  page integer not null,
  heading text not null default '',
  body text not null
);

create index if not exists astrology_chunk_book_idx on astrology_chunk (book_id);
