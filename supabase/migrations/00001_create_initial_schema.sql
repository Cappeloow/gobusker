-- Create profiles table
create type profile_type as enum ('individual', 'band');

create table profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  username text unique not null,
  full_name text not null,
  bio text,
  profile_type profile_type not null,
  avatar_url text,
  social_links jsonb default '{}'::jsonb,
  genres text[] default array[]::text[],
  instruments text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add row level security (RLS) to profiles
alter table profiles enable row level security;

-- Create band memberships table
create type membership_status as enum ('pending', 'active', 'rejected');

create table band_memberships (
  id uuid default uuid_generate_v4() primary key,
  band_profile_id uuid references profiles(id) not null,
  member_profile_id uuid references profiles(id) not null,
  role text not null,
  status membership_status not null default 'pending',
  joined_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trigger function to validate band membership
create or replace function validate_band_membership()
returns trigger as $$
begin
  -- Check if band_profile_id refers to a band profile
  if not exists (
    select 1 from profiles
    where id = new.band_profile_id
    and profile_type = 'band'
  ) then
    raise exception 'Band profile must be of type band';
  end if;

  -- Check if member_profile_id refers to an individual profile
  if not exists (
    select 1 from profiles
    where id = new.member_profile_id
    and profile_type = 'individual'
  ) then
    raise exception 'Member profile must be of type individual';
  end if;

  return new;
end;
$$ language plpgsql;

-- Create trigger for band_memberships
create trigger validate_band_membership_trigger
  before insert or update
  on band_memberships
  for each row
  execute function validate_band_membership();

-- Add row level security (RLS) to band_memberships
alter table band_memberships enable row level security;

-- Create posts table
create table posts (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) not null,
  content text not null,
  media_url text[] default array[]::text[],
  media_type text,
  location jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add row level security (RLS) to posts
alter table posts enable row level security;

-- Create events table
create table events (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) not null,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  location jsonb not null,
  status text not null default 'upcoming',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add row level security (RLS) to events
alter table events enable row level security;

-- Create RLS policies

-- Profiles policies
create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id);

-- Band memberships policies
create policy "Band memberships are viewable by everyone"
  on band_memberships for select
  using (true);

create policy "Band owners can create memberships"
  on band_memberships for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = band_profile_id
      and profiles.user_id = auth.uid()
    )
  );

-- Posts policies
create policy "Posts are viewable by everyone"
  on posts for select
  using (true);

create policy "Users can create posts for their profiles"
  on posts for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = profile_id
      and profiles.user_id = auth.uid()
    )
  );

-- Events policies
create policy "Events are viewable by everyone"
  on events for select
  using (true);

create policy "Users can create events for their profiles"
  on events for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = profile_id
      and profiles.user_id = auth.uid()
    )
  );

-- Create functions for managing profiles and memberships

-- Function to create a new profile
create or replace function create_profile(
  p_username text,
  p_full_name text,
  p_bio text,
  p_profile_type profile_type,
  p_avatar_url text default null,
  p_social_links jsonb default '{}'::jsonb,
  p_genres text[] default array[]::text[],
  p_instruments text[] default array[]::text[]
) returns profiles as $$
declare
  v_profile profiles;
begin
  insert into profiles (
    user_id,
    username,
    full_name,
    bio,
    profile_type,
    avatar_url,
    social_links,
    genres,
    instruments
  ) values (
    auth.uid(),
    p_username,
    p_full_name,
    p_bio,
    p_profile_type,
    p_avatar_url,
    p_social_links,
    p_genres,
    p_instruments
  )
  returning * into v_profile;
  
  return v_profile;
end;
$ language plpgsql security invoker;