create table if not exists almanac_board (
  id int primary key,
  notice text not null default '',
  footer text not null default '',
  place_label text not null default 'Delhi, India',
  lat double precision not null default 28.6139,
  lon double precision not null default 77.209,
  tz text not null default 'Asia/Kolkata',
  updated_by text,
  updated_at timestamptz not null default now()
);

insert into almanac_board (id)
values (1)
on conflict (id) do nothing;
