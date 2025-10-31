-- Rename full_name to name and remove username
alter table profiles 
  rename column full_name to name;

alter table profiles
  drop column username;

-- Update the create_profile function to remove username parameter
create or replace function create_profile(
  p_name text,
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
    name,
    bio,
    profile_type,
    avatar_url,
    social_links,
    genres,
    instruments
  ) values (
    auth.uid(),
    p_name,
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
$$ language plpgsql security definer;