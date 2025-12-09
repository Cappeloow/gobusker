# Band Member Invitation System - Implementation Guide

## Overview
Complete system for adding band members to a profile with email invitations, revenue sharing, and automatic notifications.

## What's Been Created

### 1. Database (SQL Migration)
**File:** `server/migrations/create_invites_table.sql`

**Tables:**
- `profile_invites` - Manages invitation lifecycle
  - Tracks inviter, invitee email, status (pending/accepted/rejected/cancelled)
  - Stores revenue_share percentage
  - Auto-expires after 30 days
  - RLS policies for security
  - Unique invite tokens for shareable links

**Features:**
- Only profile owners/admins can create invites
- Invitees can accept their own invites
- Automatic timestamp tracking
- Indexes for performance

### 2. Backend API Endpoints
**File:** `server/src/routes/inviteRoutes.ts`

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/invites/send` | Send invitation email |
| GET | `/api/invites/profile/:profileId` | List pending invites for profile |
| GET | `/api/invites/me` | Get invites for current user |
| GET | `/api/invites/token/:token` | Get invite details (public) |
| POST | `/api/invites/accept` | Accept invitation |
| POST | `/api/invites/reject` | Reject invitation |
| DELETE | `/api/invites/:inviteId` | Cancel invitation (owner only) |

**Key Logic:**
- Validates owner/admin permissions
- Checks for duplicate invites
- Sends email notifications
- Handles user signup flow
- Atomic accept operation (updates invite + adds to profile_members)

### 3. Email Service
**File:** `server/src/services/emailService.ts`

**Functions:**
- `sendInviteEmail()` - Invitation with accept link
- `sendWelcomeEmail()` - Confirmation after accepting

**Features:**
- HTML + text email templates
- Branded with profile info
- 30-day expiry notice
- Configurable via environment variables

**Required Environment Variables:**
```
EMAIL_SERVICE=gmail  # or other nodemailer service
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@gobusker.com
CLIENT_URL=http://localhost:5173
```

### 4. Authentication Middleware
**File:** `server/src/middleware/auth.ts`

**Functions:**
- `verifyAuth()` - Requires valid JWT token
- `optionalAuth()` - Token optional (for public routes)

**Validates:**
- Bearer token format
- Token with Supabase
- Attaches user info to request

### 5. Client Components

#### InvitePage
**File:** `client/src/pages/InvitePage.tsx`

**Features:**
- Display invitation details (profile name, description, revenue share)
- Show inviter information
- Accept/Reject buttons
- Signup prompt if not logged in
- Email pre-filled for non-members
- Beautiful invitation card UI

**Flow:**
1. User clicks invite link
2. If not signed up → Shows signup prompt with pre-filled email
3. If signed up → Can accept directly
4. On accept → Becomes profile member, redirected to profile

#### BandMembersManager
**File:** `client/src/components/BandMembersManager.tsx`

**Features:**
- List current members with roles and revenue shares
- List pending invitations
- Send new member invitations
- Cancel pending invitations
- Revenue share slider (1-100%)
- Copy invite link to clipboard
- Informational help text

**Permissions:**
- Only profile owners can send/cancel invites
- All members can view member list
- Members cannot invite others (configurable)

### 6. Router Configuration
**File:** `client/src/App.tsx`

**New Route:**
- `/invite/:token` → InvitePage component

## Database Flow

```
1. Owner invites member@example.com
   → profile_invites record created (pending status)
   → Email sent with invite link

2. Member clicks link (not signed up)
   → InvitePage shows signup prompt
   → Redirects to /signup with email pre-filled

3. Member signs up & accepts
   → Updates profile_invites.status = 'accepted'
   → Creates profile_members record
   → Redirects to profile page

4. As member of profile
   → Sees all band members
   → Receives notifications for tips
   → Can withdraw earnings independently
```

## Money Flow (Not Yet Implemented)

When a tip comes in to a band profile:
1. Tip amount = 100 SEK
2. Revenue shares: Member A (30%), Member B (35%), Member C (35%)
3. Distribution:
   - Member A's user_wallet: +30 SEK
   - Member B's user_wallet: +35 SEK
   - Member C's user_wallet: +35 SEK
4. Each member withdraws independently from their user_wallet

## Configuration Needed

### Environment Variables (Server)

```env
# Email Service (Gmail example - requires app password, not regular password)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app_specific_password
EMAIL_FROM=noreply@gobusker.com

# Client URL for invitation links
CLIENT_URL=http://localhost:5173  # dev
CLIENT_URL=https://gobusker.com   # production
```

### To Run Migrations

1. Copy `server/migrations/create_invites_table.sql` contents
2. Paste into Supabase SQL editor
3. Execute

## Usage Example

**As Profile Owner:**
1. Go to profile settings
2. Click "Invite Band Member"
3. Enter email: `musician@example.com`
4. Set revenue share: 35%
5. Send invitation
6. Email sent automatically

**As Invited Member:**
1. Receive email: "You're invited to join Band Name on Gobusker!"
2. Click "Accept Invitation"
3. If not signed up → Sign up page with email pre-filled
4. If signed up → Accept directly
5. Automatically added as profile member
6. Now sees profile notifications

## Next Steps

1. **Deploy migrations** to production Supabase
2. **Set up email service** (Google Gmail or SendGrid)
3. **Add to ProfileDetail** - Show BandMembersManager component
4. **Implement revenue distribution** - When tips arrive, split by revenue_share
5. **Add notifications** - Real-time alerts when band members join
6. **Role management** - Let owners change member roles (owner → admin → member)

## Testing Checklist

- [ ] Send invitation via API
- [ ] Check email delivered
- [ ] Click invite link (not signed up)
- [ ] Signup with pre-filled email
- [ ] Accept invitation
- [ ] Verify added to profile_members
- [ ] Check member appears in band members list
- [ ] Test rejection flow
- [ ] Test invite expiration (after 30 days)
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Test revenue share slider in UI

## Security Notes

- ✅ RLS policies prevent unauthorized profile access
- ✅ Only owners/admins can create/cancel invites
- ✅ Token-based public invite links (no user login required to view)
- ✅ Email verification for acceptance
- ✅ Expiring tokens (30 days)
- ⚠️ TODO: Rate limiting on invitation sending
- ⚠️ TODO: Spam detection for email addresses

## Troubleshooting

**Emails not sending?**
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- If using Gmail, must use app-specific password (not regular password)
- Check Gmail "Less secure apps" isn't blocking (use app passwords instead)

**Invitation link not working?**
- Verify CLIENT_URL matches your domain
- Check invite_token is valid in database
- Check expires_at timestamp hasn't passed
- Verify status is 'pending'

**Member not added after accepting?**
- Check profile_members table for duplicate entry
- Verify transaction completed (no database errors)
- Check RLS policies allow insert

## File Structure

```
server/
├── migrations/
│   └── create_invites_table.sql
├── src/
│   ├── routes/
│   │   └── inviteRoutes.ts
│   ├── services/
│   │   └── emailService.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── index.ts (updated)

client/
├── src/
│   ├── pages/
│   │   └── InvitePage.tsx
│   ├── components/
│   │   └── BandMembersManager.tsx
│   └── App.tsx (updated)
```

---

**Ready to deploy! Run migrations in Supabase first, then set up email service.** 🚀
