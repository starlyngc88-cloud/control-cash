-- KellyCash v0.1

create table people (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

create table income (
  id uuid default gen_random_uuid() primary key,
  person_id uuid not null references people(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table expenses (
  id uuid default gen_random_uuid() primary key,
  person_id uuid not null references people(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);
