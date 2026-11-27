alter table astrology_book alter column pdf drop not null;
alter table astrology_book add column if not exists storage_path text;

create table if not exists astrology_page (
  book_id text not null references astrology_book (id) on delete cascade,
  page integer not null,
  source text not null,
  body text not null,
  primary key (book_id, page)
);
