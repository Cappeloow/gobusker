-- Test Events for Sölvesborg, Sweden
-- Run this in Supabase SQL Editor
-- IMPORTANT: Replace 'YOUR_PROFILE_ID_HERE' with your actual profile ID

-- First, let's see your profile ID (run this first to get your profile ID):
-- SELECT id, name, role FROM profiles WHERE user_id = auth.uid();

-- Then use that ID in the INSERT statements below:

INSERT INTO events (
  id,
  profile_id,
  title,
  description,
  start_time,
  end_time,
  place_name,
  latitude,
  longitude,
  status,
  category,
  subcategory,
  event_type,
  max_performers,
  accepting_requests
) VALUES 
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Jazz Night at the Harbor',
  'Smooth jazz evening by the beautiful Sölvesborg harbor with local and visiting musicians',
  '2026-02-28 19:00:00+00',
  '2026-02-28 22:00:00+00',
  'Sölvesborg Harbor',
  56.0498,
  14.5809,
  'scheduled',
  'Music',
  'Jazz',
  'open_mic',
  5,
  true
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Street Music Festival',
  'Annual street music festival in downtown Sölvesborg featuring multiple genres',
  '2026-03-15 13:00:00+00',
  '2026-03-15 18:00:00+00',
  'Stortorget, Sölvesborg',
  56.0515,
  14.5820,
  'scheduled',
  'Music',
  'Folk',
  'venue_booking',
  8,
  true
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Acoustic Guitar Solo',
  'Intimate acoustic guitar performance in the castle courtyard',
  '2026-03-02 16:00:00+00',
  '2026-03-02 17:30:00+00',
  'Sölvesborg Castle Courtyard',
  56.0520,
  14.5850,
  'scheduled',
  'Music',
  'Classical',
  'solo_performance',
  1,
  false
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Comedy Open Mic',
  'Weekly comedy open mic at the local pub - bring your best material!',
  '2026-03-05 20:00:00+00',
  '2026-03-05 23:00:00+00',
  'Pub Krogen, Sölvesborg',
  56.0505,
  14.5830,
  'scheduled',
  'Comedy',
  'Stand-up',
  'open_mic',
  10,
  true
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Magic Show Spectacular',
  'Professional magic show featuring illusions and close-up magic',
  '2026-03-08 19:30:00+00',
  '2026-03-08 21:00:00+00',
  'Sölvesborg Cultural Center',
  56.0530,
  14.5790,
  'scheduled',
  'Magic',
  'Stage',
  'solo_performance',
  1,
  false
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Folk Music Gathering',
  'Traditional Swedish folk music gathering - musicians welcome to join!',
  '2026-03-12 17:00:00+00',
  '2026-03-12 20:00:00+00',
  'Sölvesborg Museum',
  56.0540,
  14.5810,
  'scheduled',
  'Music',
  'Folk',
  'open_mic',
  6,
  true
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Electronic Music Night',
  'DJ sets and electronic music performances at the youth center',
  '2026-03-20 21:00:00+00',
  '2026-03-21 01:00:00+00',
  'Sölvesborg Youth Center',
  56.0485,
  14.5775,
  'scheduled',
  'Music',
  'Electronic',
  'venue_booking',
  4,
  true
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Poetry & Music Evening',
  'Combining spoken word poetry with live musical accompaniment',
  '2026-03-25 18:00:00+00',
  '2026-03-25 21:00:00+00',
  'Sölvesborg Library',
  56.0510,
  14.5770,
  'scheduled',
  'Other',
  '',
  'open_mic',
  8,
  true
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Rock Concert',
  'High-energy rock performance featuring local band',
  '2026-03-28 20:00:00+00',
  '2026-03-28 22:30:00+00',
  'Sölvesborg Arena',
  56.0460,
  14.5840,
  'scheduled',
  'Music',
  'Rock',
  'solo_performance',
  1,
  false
),
(
  gen_random_uuid(),
  'YOUR_PROFILE_ID_HERE', -- Replace with your actual profile ID
  'Spring Arts Festival',
  'Multi-day arts festival seeking diverse performers across all categories',
  '2026-03-30 10:00:00+00',
  '2026-03-30 18:00:00+00',
  'Sölvesborg Park',
  56.0525,
  14.5795,
  'scheduled',
  'Other',
  '',
  'venue_booking',
  15,
  true
);

-- Verify the events were created:
SELECT 
  title, 
  start_time, 
  place_name, 
  event_type,
  max_performers 
FROM events 
WHERE place_name LIKE '%Sölvesborg%' 
ORDER BY start_time;