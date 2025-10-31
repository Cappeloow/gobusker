-- Add event_collaborations table
create type collaboration_status as enum ('pending', 'accepted', 'rejected');

create table event_collaborations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) not null,
  profile_id uuid references profiles(id) not null,
  status collaboration_status not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure no duplicate collaborations for the same event and profile
  unique(event_id, profile_id)
);

-- Add RLS policies for event_collaborations
alter table event_collaborations enable row level security;

create policy "Event collaborations are viewable by everyone"
  on event_collaborations for select
  using (true);

create policy "Event owners can manage collaborations"
  on event_collaborations for all
  using (
    exists (
      select 1 from events
      where events.id = event_id
      and events.profile_id = auth.uid()
    )
  );

create policy "Users can update their own collaboration status"
  on event_collaborations for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = profile_id
      and profiles.user_id = auth.uid()
    )
  )
  with check (
    status in ('accepted', 'rejected')
  );

-- Add trigger for updating updated_at
create trigger handle_updated_at before update on event_collaborations
  for each row execute function moddatetime (updated_at);