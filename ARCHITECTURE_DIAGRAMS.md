# GoBusker Profile System - Visual Architecture

## User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                  New User Visits App                         │
│                   /profile/create                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
       ┌─────────────────────────────────────┐
       │     STEP 1: ROLE SELECTION          │
       │  "What's your role on GoBusker?"    │
       │                                     │
       │  ┌──────────┬──────────┬──────────┐ │
       │  │📋 Event- │🎵 Busker │👁️ Viewer│ │
       │  │maker     │          │          │ │
       │  └──────────┴──────────┴──────────┘ │
       └──────────┬──────────┬─────────────────┘
                  │          │
        ┌─────────┘          └──────────┐
        │                               │
        ▼                               ▼
    ┌─────────────────┐        ┌─────────────────┐
    │ Select Role     │        │ Select Role     │
    │ = 'eventmaker'  │        │ = 'busker'      │
    └────────┬────────┘        └────────┬────────┘
             │                         │
             ▼                         ▼
      ┌──────────────────────┐  ┌──────────────────────┐
      │ STEP 2: FORM RENDER  │  │ STEP 2: FORM RENDER  │
      │ Eventmaker Fields    │  │ Busker Fields        │
      └──────────────────────┘  └──────────────────────┘
```

---

## Form Rendering Logic

```
CreateProfile Component
│
├─ Step === 'role'?
│  └─ YES: Show Role Selection Screen
│     ├─ 📋 Eventmaker Card → onSelect('eventmaker')
│     ├─ 🎵 Busker Card → onSelect('busker')
│     └─ 👁️ Viewer Card → onSelect('viewer')
│
└─ Step === 'details'?
   └─ YES: Show Details Form
      │
      ├─ Common Fields (All Roles)
      │  ├─ Avatar Upload
      │  ├─ Name *
      │  └─ Bio (optional)
      │
      ├─ form.role === 'viewer'?
      │  └─ Show: Location
      │
      ├─ form.role === 'eventmaker'?
      │  ├─ Show: Organization Name
      │  ├─ Show: Contact Info
      │  ├─ Show: Event Types (+ array buttons)
      │  └─ Show: Bio
      │
      └─ form.role === 'busker'?
         ├─ Show: Performance Type (select)
         ├─ Show: Bio
         ├─ form.performance_type === 'music'?
         │  ├─ Show: Genres (+ array buttons)
         │  └─ Show: Instruments (+ array buttons)
         │
         └─ Show: Social Links
            ├─ Instagram
            ├─ YouTube
            ├─ Spotify
            └─ Website
```

---

## Database Schema Relationships

```
┌──────────────────────────────────────────┐
│              PROFILES                    │
│  ──────────────────────────────────────  │
│  id (UUID) [PK]                          │
│  name (TEXT) [Required]                  │
│  role (profile_role_enum) [Required]     │
│  avatar_url (TEXT)                       │
│  bio (TEXT)                              │
│  created_at, updated_at                  │
│                                          │
│  ── Busker Fields ──                     │
│  stage_name (TEXT)                       │
│  performance_type (enum)                 │
│  genres (TEXT[])                         │
│  instruments (TEXT[])                    │
│  social_links (JSONB)                    │
│                                          │
│  ── Eventmaker Fields ──                 │
│  organization_name (TEXT)                │
│  contact_info (TEXT)                     │
│  event_types (TEXT[])                    │
│                                          │
│  ── Viewer Fields ──                     │
│  location (TEXT)                         │
└──────────────────┬───────────────────────┘
                   │ (1 to Many)
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────────┐    ┌──────────────────────────┐
│    EVENTS        │    │ EVENT_COLLABORATORS      │
│  ──────────────  │    │  ──────────────────────  │
│  id (UUID) [PK]  │    │  id (UUID) [PK]          │
│  profile_id [FK] ├─┐  │  event_id [FK]           │
│  title (TEXT)    │ │  │  collaborator_id [FK] ──┼──→ Back to PROFILES
│  description     │ │  │  status (enum)           │    (Busker)
│  status (enum)   │ │  │  role (TEXT)             │
│  location        │ │  │  invited_at              │
│  start_time      │ │  │  responded_at            │
│  end_time        │ │  └──────────────────────────┘
│  created_at      │ │         ▲
│  updated_at      │ │         │
└──────────────────┘ └─────────┘
       ▲                │
       │         (Many) │
       └─────────────────┘
```

---

## Role Permissions Matrix

```
┌────────────────────┬──────────┬──────────┬────────────┐
│      Action        │ Eventmaker│ Busker  │  Viewer    │
├────────────────────┼──────────┼──────────┼────────────┤
│ Create Profile     │    ✅    │   ✅    │     ✅     │
│ View All Profiles  │    ✅    │   ✅    │     ✅     │
│ Update Own Profile │    ✅    │   ✅    │     ✅     │
│ Create Events      │    ✅    │   ❌    │     ❌     │
│ Invite Buskers     │    ✅    │   ❌    │     ❌     │
│ View Events        │    ✅    │   ✅    │     ✅     │
│ Respond to Invite  │    ❌    │   ✅    │     ❌     │
│ Browse Performers  │    ✅    │   ❌    │     ❌     │
│ Browse Events      │    ✅    │   ✅    │     ✅     │
│ Attend Events      │    ✅    │   ✅    │     ✅     │
└────────────────────┴──────────┴──────────┴────────────┘
```

---

## Data Flow - Profile Creation

```
User Input (Step 1: Role Selection)
          │
          ▼
     setStep('details')
     setForm(role: 'busker')
          │
          ▼
User Input (Step 2: Form Fields)
    ├─ name: 'Jane Smith'
    ├─ stage_name: 'Jazz Jane'
    ├─ performance_type: 'music'
    ├─ genres: ['Jazz', 'Blues']
    ├─ instruments: ['Saxophone']
    └─ social_links: {...}
          │
          ▼
  handleSubmit() triggered
          │
          ▼
profileService.createProfile({
    role: 'busker',
    name: 'Jane Smith',
    ...
})
          │
          ▼
  Supabase INSERT
    profiles table
          │
          ▼
  Profile created
  with role_id
          │
          ▼
navigate('/dashboard')
```

---

## Busker Form Flow (Performance Type Logic)

```
Performance Type Select
│
├─ performance_type === 'music'?
│  │
│  ├─ YES:
│  │  ├─ Show Genres field (+Add/Remove)
│  │  ├─ Show Instruments field (+Add/Remove)
│  │  ├─ Show Social Links
│  │  │
│  │  ▼ User Input
│  │  {
│  │    genres: ['Jazz', 'Blues'],
│  │    instruments: ['Saxophone', 'Vocals']
│  │  }
│  │
│  └─ NO:
│     ├─ Hide Genres
│     ├─ Hide Instruments
│     ├─ Keep Social Links
│     │
│     ▼ User Input
│     {
│       performance_type: 'comedy'
│       social_links: {...}
│     }
│
└─ Submit Form → Create Profile
```

---

## Database Query Examples by Role

```
BUSKERS
└─ Find all jazz musicians
   SELECT * FROM profiles
   WHERE role = 'busker'
   AND genres @> ARRAY['Jazz']

EVENTMAKERS
└─ Find all concert organizers
   SELECT * FROM profiles
   WHERE role = 'eventmaker'
   AND event_types @> ARRAY['Concerts']

VIEWERS
└─ Find viewers in SF
   SELECT * FROM profiles
   WHERE role = 'viewer'
   AND location ILIKE '%San Francisco%'

COLLABORATION
└─ Get all pending invitations for busker
   SELECT * FROM event_collaborators
   WHERE collaborator_id = 'BUSKER_ID'
   AND status = 'pending'
```

---

## Component Hierarchy

```
App
└─ Routes
   └─ /profile/create
      └─ CreateProfile Component
         ├─ Step 1 (role === '')
         │  └─ RoleSelectionScreen
         │     ├─ EventmakerCard (onClick → handleRoleSelect)
         │     ├─ BuskerCard
         │     └─ ViewerCard
         │
         └─ Step 2 (role !== '')
            └─ DetailsForm
               ├─ CommonFields
               │  ├─ AvatarUpload
               │  ├─ NameInput
               │  └─ BioTextarea
               │
               ├─ RoleSpecificFields
               │  ├─ ViewerFields (if role === 'viewer')
               │  │  └─ LocationInput
               │  │
               │  ├─ EventmakerFields (if role === 'eventmaker')
               │  │  ├─ OrganizationInput
               │  │  ├─ ContactInput
               │  │  ├─ EventTypesArray
               │  │  └─ BioTextarea
               │  │
               │  └─ BuskerFields (if role === 'busker')
               │     ├─ PerformanceTypeSelect
               │     ├─ BioTextarea
               │     ├─ GenresArray (if music)
               │     ├─ InstrumentsArray (if music)
               │     └─ SocialLinksInputs
               │
               └─ SubmitButton
```

---

## Enum Values

```
Profile Roles
├─ 'eventmaker'    (📋 Event Organizer)
├─ 'busker'        (🎵 Performer)
└─ 'viewer'        (👁️ Audience Member)

Performance Types (Busker Only)
├─ 'music'         (🎵 Musician)
├─ 'comedy'        (🎭 Comedian)
├─ 'magic'         (✨ Magician)
├─ 'art'           (🎨 Artist)
└─ 'other'         (🎪 Other)

Event Status
├─ 'scheduled'     (📅 Upcoming)
├─ 'ongoing'       (🔴 Live)
├─ 'completed'     (✅ Past)
└─ 'cancelled'     (❌ Cancelled)

Collaboration Status
├─ 'pending'       (⏳ Awaiting Response)
├─ 'accepted'      (✅ Confirmed)
└─ 'rejected'      (❌ Declined)
```

---

## State Management

```
CreateProfile State
│
├─ form: {
│    role: 'busker' | 'eventmaker' | 'viewer' | '',
│    name: string,
│    bio: string,
│    avatar_url: string,
│    performance_type: 'music' | 'comedy' | 'magic' | 'art' | 'other',
│    genres: string[],
│    instruments: string[],
│    organization_name: string,
│    contact_info: string,
│    event_types: string[],
│    location: string,
│    social_links: {
│      instagram: string,
│      youtube: string,
│      spotify: string,
│      website: string
│    }
│  }
│
├─ step: 'role' | 'details'
│
├─ isLoading: boolean
│
└─ error: string
```

---

## Styling - Dark Theme Classes

```
Backgrounds
├─ bg-github-bg           (#0D1117)  - Main background
├─ bg-github-card         (#161B22)  - Cards, containers
└─ bg-github-bg/50        (50% opacity)

Text
├─ text-github-text       (#F0F6FC)  - Primary text
├─ text-github-text-secondary (#8B949E) - Secondary text
├─ text-github-placeholder (#6E7681)    - Placeholder text
└─ text-github-text-input (#C9D1D9) - Input text

Borders
├─ border-github-border   (#30363D)  - Card borders
└─ border-github-blue     (On hover)

Accents
├─ text-github-blue       (#58A6FF)  - Links, focus
└─ bg-github-blue         (Buttons)
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         Production Environment              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    Frontend (React/TypeScript)      │   │
│  │  ────────────────────────────────   │   │
│  │  - CreateProfile.tsx (updated)      │   │
│  │  - Profile type (updated)           │   │
│  │  - tailwind.config.js (dark theme)  │   │
│  └─────────────────┬───────────────────┘   │
│                    │ HTTPS API calls       │
│                    ▼                       │
│  ┌─────────────────────────────────────┐   │
│  │    Supabase Backend                 │   │
│  │  ────────────────────────────────   │   │
│  │  - PostgreSQL Database              │   │
│  │  - Auth (JWT)                       │   │
│  │  - Profiles table with enums        │   │
│  │  - Events table                     │   │
│  │  - Event Collaborators table        │   │
│  │  - RLS Policies                     │   │
│  │  - Storage (Avatars)                │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Implementation Timeline

```
Timeline                Task                    Status
├─ 0% ────────────────────────────────────────
├─ 20% ─ Frontend Component Updates ────── ✅ Done
├─ 40% ─ Type Definitions Updates ─────── ✅ Done
├─ 60% ─ Documentation Creation ────────── ✅ Done
├─ 70% ─ Database Schema Creation ─────── ✅ Done
├─ 80% ─ Migration Guide ───────────────── ✅ Done
├─ 90% ─ Implementation Checklist ─────── ✅ Done
├─ 95% ─ Testing & QA ─────────────────── 🔄 Ready
└─100% ─ Production Deployment ────────── ⏳ Next
```

---

**Ready for deployment! Follow the IMPLEMENTATION_CHECKLIST.md**
