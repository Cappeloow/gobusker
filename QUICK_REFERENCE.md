# GoBusker Role-Based Profile System - Quick Reference

## Files Updated/Created

### Frontend Components
- ✅ **`src/components/profile/CreateProfile.tsx`** - Updated with role selection and conditional form rendering

### Type Definitions
- ✅ **`src/types/models.ts`** - Updated Profile interface with role-based fields

### Database Schema
- ✅ **`SUPABASE_SCHEMA.sql`** - Complete schema with enums, tables, RLS policies, and indexes

### Documentation
- ✅ **`PROFILE_SYSTEM.md`** - Complete system overview and business logic
- ✅ **`MIGRATION_GUIDE.md`** - Step-by-step SQL migration instructions
- ✅ **`QUICK_REFERENCE.md`** - This file

---

## Three User Roles

### 🎵 Busker
**For:** Musicians, comedians, magicians, artists, performers

**Fields:**
- stage_name
- performance_type (music | comedy | magic | art | other)
- genres (array)
- instruments (array) - music only
- bio
- social_links (Instagram, YouTube, Spotify, Website)
- avatar_url

**Example:** Jazz musician looking for performance opportunities

---

### 📋 Eventmaker
**For:** Organizations, venues, event promoters

**Fields:**
- organization_name
- contact_info
- event_types (array)
- bio
- avatar_url
- location

**Example:** Festival organizer looking to book performers

---

### 👁️ Viewer
**For:** Audience members, casual browsers

**Fields:**
- name
- location
- avatar_url

**Example:** Person browsing for live events in their area

---

## Component Flow

```
CreateProfile.tsx
├── Step 1: Role Selection
│   ├── [📋] Eventmaker Button
│   ├── [🎵] Busker Button
│   └── [👁️] Viewer Button
│
└── Step 2: Details Form
    ├── Common Fields
    │   ├── Avatar Upload
    │   └── Name
    │
    ├── Viewer Fields
    │   └── Location
    │
    ├── Eventmaker Fields
    │   ├── Organization Name
    │   ├── Contact Info
    │   ├── Event Types
    │   └── Bio
    │
    └── Busker Fields
        ├── Performance Type (select)
        ├── Bio
        ├── Performance Type === 'music'?
        │   ├── Genres (array)
        │   └── Instruments (array)
        └── Social Links
            ├── Instagram
            ├── YouTube
            ├── Spotify
            └── Website
```

---

## Database Structure

```
Profiles Table
├── id (UUID) - Primary Key
├── name (TEXT) - Required
├── role (profile_role_enum) - Required, Default: 'busker'
├── avatar_url (TEXT)
├── bio (TEXT)
├── profile_type (profile_type_enum)
│
├─── Busker Fields
│   ├── stage_name (TEXT)
│   ├── performance_type (performance_type_enum)
│   ├── genres (TEXT[])
│   ├── instruments (TEXT[])
│   └── social_links (JSONB)
│
├─── Eventmaker Fields
│   ├── organization_name (TEXT)
│   ├── contact_info (TEXT)
│   └── event_types (TEXT[])
│
├─── Viewer Fields
│   └── location (TEXT)
│
└── created_at, updated_at (TIMESTAMPS)

Events Table
├── id (UUID) - Primary Key
├── profile_id (UUID) - Foreign Key to Profiles
├── title (TEXT)
├── description (TEXT)
├── status (event_status_enum)
├── place_name (TEXT)
├── latitude, longitude (DECIMAL)
├── start_time, end_time (TIMESTAMPS)
└── created_at, updated_at

Event Collaborators Table
├── id (UUID) - Primary Key
├── event_id (UUID) - Foreign Key
├── collaborator_id (UUID) - Foreign Key
├── status (collaboration_status_enum) - pending|accepted|rejected
├── role (TEXT)
└── invited_at, responded_at (TIMESTAMPS)
```

---

## Key Features

### ✅ Completed
- Two-step profile creation (role selection → details form)
- Conditional form rendering based on role
- GitHub dark theme styling (tailwind)
- TypeScript type definitions
- Supabase schema with enums and RLS policies
- Backward compatibility (existing profiles default to 'busker')

### 🚀 Ready to Implement
1. Run SQL migrations from `SUPABASE_SCHEMA.sql` or `MIGRATION_GUIDE.md`
2. Deploy updated frontend with new CreateProfile component
3. Test all three role flows

### 📋 Future Enhancements
- Role switching after profile creation
- Profile verification badges
- Busker discovery for Eventmakers
- Messaging between roles
- Reviews and ratings
- Analytics dashboard

---

## Code Snippets

### Creating a Busker Profile

```typescript
const profile = await profileService.createProfile({
  role: 'busker',
  name: 'Jazz Jane',
  stage_name: 'Jazz Jane',
  performance_type: 'music',
  genres: ['Jazz', 'Blues'],
  instruments: ['Saxophone', 'Vocals'],
  bio: 'Professional jazz saxophonist',
  social_links: {
    instagram: 'https://instagram.com/jazzjane',
    spotify: 'https://spotify.com/artist/jazzjane'
  }
});
```

### Creating an Eventmaker Profile

```typescript
const profile = await profileService.createProfile({
  role: 'eventmaker',
  name: 'Downtown Festivals',
  organization_name: 'Downtown Festival Organizers',
  contact_info: 'info@downtownfestivals.com',
  event_types: ['Concerts', 'Street Festivals', 'Community Events'],
  bio: 'Bringing live entertainment to downtown since 2015'
});
```

### Creating a Viewer Profile

```typescript
const profile = await profileService.createProfile({
  role: 'viewer',
  name: 'John Doe',
  location: 'San Francisco, CA'
});
```

---

## Querying by Role

```sql
-- Get all buskers
SELECT * FROM profiles WHERE role = 'busker';

-- Get all eventmakers
SELECT * FROM profiles WHERE role = 'eventmaker';

-- Get buskers in a specific genre
SELECT * FROM profiles 
WHERE role = 'busker' 
AND genres @> ARRAY['Jazz'];

-- Get eventmakers hosting concerts
SELECT * FROM profiles 
WHERE role = 'eventmaker' 
AND event_types @> ARRAY['Concerts'];
```

---

## TypeScript Type

```typescript
interface Profile {
  id: string;
  name: string;
  role: 'eventmaker' | 'busker' | 'viewer';
  
  // Optional fields based on role
  stage_name?: string;
  performance_type?: 'music' | 'comedy' | 'magic' | 'art' | 'other';
  genres?: string[];
  instruments?: string[];
  social_links?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    website?: string;
  };
  
  organization_name?: string;
  contact_info?: string;
  event_types?: string[];
  
  location?: string;
  
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

## Dark Theme Tailwind Classes

All components use GitHub-inspired dark theme:

```
bg-github-bg           #0D1117 (main background)
bg-github-card         #161B22 (card/container)
text-github-text       #F0F6FC (primary text)
text-github-text-secondary  #8B949E (secondary text)
border-github-border   #30363D (borders)
text-github-blue       #58A6FF (accent/links)
```

---

## Installation/Setup

1. **Update Supabase Schema**
   - Run SQL from `SUPABASE_SCHEMA.sql` OR
   - Follow step-by-step guide in `MIGRATION_GUIDE.md`

2. **No Package Changes Needed**
   - All dependencies already installed
   - Uses existing profileService

3. **Environment Variables**
   - No new env vars needed
   - Keep existing VITE_SUPABASE_URL and VITE_SUPABASE_KEY

4. **Test**
   ```bash
   npm run dev
   # Navigate to profile creation page
   # Test all three roles
   ```

---

## Debugging

### Form not showing fields
- Check that `form.role` is set correctly
- Verify conditional rendering logic in CreateProfile.tsx
- Check browser console for errors

### Profile not saving
- Check Supabase connection
- Verify all required fields are filled
- Check RLS policies allow insert
- Check auth token is valid

### Role not appearing in database
- Verify role column exists in profiles table
- Check role enum was created
- Verify migration ran successfully

---

## Support Resources

- **SQL Schema:** `SUPABASE_SCHEMA.sql`
- **Migration Steps:** `MIGRATION_GUIDE.md`
- **Full Documentation:** `PROFILE_SYSTEM.md`
- **Component:** `src/components/profile/CreateProfile.tsx`
- **Types:** `src/types/models.ts`
- **Service:** `src/services/profileService.ts`

---

## Summary

You now have a complete, role-based profile system ready to deploy:

1. ✅ **Frontend Component** - Updated CreateProfile with two-step flow
2. ✅ **Type Definitions** - Updated Profile interface with all role fields
3. ✅ **Database Schema** - Complete SQL with enums, tables, and policies
4. ✅ **Documentation** - Full system overview, migration guide, and references

**Next Step:** Run the SQL migrations and deploy the updated frontend!
