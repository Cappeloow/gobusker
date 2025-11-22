# GoBusker Profile Role System

## Overview

The GoBusker platform now implements a comprehensive **role-based profile system** that supports three distinct user types:

1. **Eventmaker** - Organize and host events
2. **Busker** - Musicians, performers, and entertainers
3. **Viewer** - Browse and enjoy events

This system replaces the previous musician-only focus with a more flexible architecture that serves different user needs.

---

## Profile Roles

### 🎵 Busker Profile

**Purpose:** For musicians, comedians, magicians, artists, and other performers.

**Fields:**
- `stage_name` - Performance name (optional)
- `performance_type` - Type of performance (music | comedy | magic | art | other)
- `bio` - Biography or performance description
- `genres` - Array of genres they perform (music performers only)
- `instruments` - Array of instruments they play (music performers only)
- `social_links` - Links to Instagram, YouTube, Spotify, Website
- `avatar_url` - Profile picture

**Example:**
```json
{
  "role": "busker",
  "name": "Jane Smith",
  "stage_name": "Jazz Jane",
  "performance_type": "music",
  "genres": ["Jazz", "Blues"],
  "instruments": ["Saxophone", "Vocals"],
  "bio": "Professional jazz saxophonist performing at local venues"
}
```

---

### 📋 Eventmaker Profile

**Purpose:** For organizations, venues, or individuals who organize and host events.

**Fields:**
- `organization_name` - Name of the organization or venue
- `contact_info` - Email or phone number
- `event_types` - Array of event types they host (e.g., "Concerts", "Street Festivals", "Open Mics")
- `bio` - Organization description or mission
- `avatar_url` - Organization logo or profile picture
- `location` - Primary location (optional)

**Example:**
```json
{
  "role": "eventmaker",
  "name": "Downtown Events Team",
  "organization_name": "Downtown Festival Organizers",
  "contact_info": "info@downtownfestivals.com",
  "event_types": ["Concerts", "Street Festivals", "Community Events"],
  "bio": "Bringing live entertainment to downtown since 2015"
}
```

---

### 👁️ Viewer Profile

**Purpose:** For audience members who browse and attend events.

**Fields:**
- `name` - User's name
- `location` - Their location (optional)
- `avatar_url` - Profile picture

**Example:**
```json
{
  "role": "viewer",
  "name": "John Doe",
  "location": "San Francisco, CA"
}
```

---

## User Flow

### Profile Creation

1. **Step 1: Role Selection**
   - User sees three cards: Eventmaker, Busker, Viewer
   - User selects their primary role
   - Selected role is saved to form state

2. **Step 2: Details Form**
   - Form dynamically renders fields based on selected role
   - Users fill in role-specific information
   - Submit creates profile with role stored in database

### Conditional Form Rendering

The form renders different fields based on the selected `role`:

```typescript
{form.role === 'viewer' && (
  // Show minimal fields: name, location, avatar
)}

{form.role === 'eventmaker' && (
  // Show: organization_name, contact_info, event_types, bio
)}

{form.role === 'busker' && (
  // Show: performance_type, bio, genres (if music), instruments (if music), social_links
)}
```

---

## Database Schema

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Basic Info
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  -- Role
  role profile_role_enum NOT NULL DEFAULT 'viewer',
  profile_type profile_type_enum DEFAULT 'individual',
  
  -- Busker Fields
  stage_name TEXT,
  performance_type performance_type_enum,
  genres TEXT[],
  instruments TEXT[],
  social_links JSONB,
  
  -- Eventmaker Fields
  organization_name TEXT,
  contact_info TEXT,
  event_types TEXT[],
  
  -- Viewer Fields
  location TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Enums

```sql
CREATE TYPE profile_role_enum AS ENUM ('eventmaker', 'busker', 'viewer');
CREATE TYPE performance_type_enum AS ENUM ('music', 'comedy', 'magic', 'art', 'other');
```

---

## Events Table

Events are created by Eventmakers and can include Busker collaborators:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id), -- Eventmaker
  
  title TEXT NOT NULL,
  description TEXT,
  status event_status_enum,
  place_name TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Collaborators Table

Links Buskers to Events created by Eventmakers:

```sql
CREATE TABLE event_collaborators (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id),
  collaborator_id UUID NOT NULL REFERENCES profiles(id),
  
  status collaboration_status_enum, -- 'pending', 'accepted', 'rejected'
  role TEXT, -- 'performer', 'co-host', etc.
  
  invited_at TIMESTAMP,
  responded_at TIMESTAMP
);
```

---

## API Integration

### Creating a Profile

```typescript
const profile = await profileService.createProfile({
  role: 'busker',
  name: 'Jane Smith',
  stage_name: 'Jazz Jane',
  performance_type: 'music',
  genres: ['Jazz', 'Blues'],
  instruments: ['Saxophone', 'Vocals'],
  bio: 'Professional jazz performer',
  social_links: {
    instagram: 'https://instagram.com/jazzjane',
    spotify: 'https://spotify.com/artist/jazzjane'
  }
});
```

### Updating a Profile

```typescript
await profileService.updateProfile(profileId, {
  genres: ['Jazz', 'Blues', 'Soul'],
  bio: 'Now also performing soul!'
});
```

---

## Frontend Components

### CreateProfile.tsx

Two-step form:

1. **Role Selection Screen** (`step === 'role'`)
   - Three button options: Eventmaker, Busker, Viewer
   - User clicks to select their role

2. **Details Form** (`step === 'details'`)
   - Common fields: name, avatar
   - Role-specific fields rendered conditionally
   - Submit button creates profile

**Key Features:**
- Conditional rendering based on `form.role`
- Separate handlers for role-specific arrays (genres, instruments, event_types)
- Ability to change role mid-form via "← Change Role" button

---

## Business Logic

### Busker-Specific Logic

If `performance_type === 'music'`:
- Show genres field
- Show instruments field

If `performance_type !== 'music'`:
- Hide genres and instruments
- Keep bio and social links

### Eventmaker Access

- Can create events
- Can search and invite Buskers as collaborators
- Receives collaboration acceptance/rejection responses

### Busker Access

- Can see all events from Eventmakers
- Can respond to collaboration invitations
- Can build portfolio with genres and instruments

### Viewer Access

- Can browse all events
- Can see event details and performers
- Can potentially RSVP (future feature)

---

## Migration from Old System

If migrating from the previous system:

1. **Old profiles without role:** Set default `role = 'busker'` (maintains backward compatibility)
2. **Update frontend:** Import new CreateProfile component
3. **Update queries:** Ensure role filtering in event listings
4. **Update auth:** Verify role-based access controls

---

## Future Enhancements

- **Profile Types:** 'individual' vs 'band' for Buskers
- **Verification:** Verified badge system for professionals
- **Reviews:** Rating system for Buskers and Eventmakers
- **Messaging:** Direct messaging between Buskers and Eventmakers
- **Analytics:** Performance metrics for Buskers and Events
- **Recommendations:** Algorithm-based suggestions based on role

---

## Security Considerations

All profiles are public and viewable, but:
- Users can only update their own profile (RLS policy)
- Only Eventmakers can create events
- Collaboration responses only visible to involved parties
- Contact info visible only to appropriate roles

---

## Testing

To test the new profile system:

1. **Create a Busker Profile**
   ```
   - Select "Busker" role
   - Fill in: name, stage_name, performance_type, genres, instruments, bio
   - Submit
   ```

2. **Create an Eventmaker Profile**
   ```
   - Select "Eventmaker" role
   - Fill in: name, organization_name, contact_info, event_types, bio
   - Submit
   ```

3. **Create a Viewer Profile**
   ```
   - Select "Viewer" role
   - Fill in: name, location
   - Submit
   ```

---

## TypeScript Definitions

See `src/types/models.ts` for complete interface definitions:

```typescript
export interface Profile {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  role: 'eventmaker' | 'busker' | 'viewer';
  
  // Busker fields
  stage_name?: string;
  performance_type?: 'music' | 'comedy' | 'magic' | 'art' | 'other';
  genres?: string[];
  instruments?: string[];
  social_links?: SocialLinks;
  
  // Eventmaker fields
  organization_name?: string;
  contact_info?: string;
  event_types?: string[];
  
  // Viewer fields
  location?: string;
  
  created_at?: string;
  updated_at?: string;
}
```

---

## Support

For questions or issues with the profile system:
1. Check the Supabase schema in `SUPABASE_SCHEMA.sql`
2. Review the CreateProfile component in `src/components/profile/CreateProfile.tsx`
3. Check TypeScript types in `src/types/models.ts`
4. Review profileService in `src/services/profileService.ts`
