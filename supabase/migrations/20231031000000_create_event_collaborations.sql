-- Enable the moddatetime extension
create extension if not exists moddatetime schema extensions;

-- Create event_collaborations table
create table if not exists public.event_collaborations (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    status text check (status in ('pending', 'accepted', 'rejected')) not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(event_id, profile_id)
);

-- Enable RLS
alter table public.event_collaborations enable row level security;

-- Grant access to authenticated users
grant all on public.event_collaborations to authenticated;

-- RLS policies
create policy "Users can view event collaborations"
    on public.event_collaborations
    for select
    using (true);

create policy "Event owners can manage collaborations"
    on public.event_collaborations
    for all
    using (
        exists (
            select 1 from public.events
            where events.id = event_collaborations.event_id
            and events.profile_id = auth.uid()
        )
    );

create policy "Users can manage their own collaboration status"
    on public.event_collaborations
    for update
    using (profile_id = auth.uid())
    with check (profile_id = auth.uid());

-- Add triggers for updated_at
create trigger handle_updated_at before update on public.event_collaborations
    for each row execute procedure moddatetime (updated_at);