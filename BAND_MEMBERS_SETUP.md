# Band Member Invitation System - Setup Guide

## ✅ What's Ready to Deploy

All code is complete and error-free:
- ✅ Backend invite routes and email service
- ✅ Frontend invite page and band members manager  
- ✅ Database migration SQL ready
- ✅ Authentication middleware
- ✅ Type definitions and error handling

## 🚀 Quick Start

### Step 1: Run SQL Migration in Supabase

Copy this SQL and paste into Supabase → SQL Editor → Execute:

```sql
-- ==========================================
-- MIGRATION: Create profile_invites table for band member management
-- ==========================================

CREATE TABLE IF NOT EXISTS profile_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_share DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  status TEXT NOT NULL DEFAULT 'pending',
  invite_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, invitee_email, status)
);

ALTER TABLE profile_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites they sent" ON profile_invites
  FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Profile members can view pending invites" ON profile_invites
  FOR SELECT USING (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_invites.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Invitees can view their invites" ON profile_invites
  FOR SELECT USING (
    auth.email() = invitee_email OR (invitee_id IS NOT NULL AND auth.uid() = invitee_id)
  );

CREATE POLICY "Owners can create invites" ON profile_invites
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_invites.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can manage invites" ON profile_invites
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_invites.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Invitees can accept invites" ON profile_invites
  FOR UPDATE USING (
    (auth.email() = invitee_email OR (invitee_id IS NOT NULL AND auth.uid() = invitee_id))
    AND status = 'pending'
  );

CREATE INDEX IF NOT EXISTS idx_profile_invites_profile_id ON profile_invites(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_invites_inviter_id ON profile_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_profile_invites_invitee_email ON profile_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_profile_invites_status ON profile_invites(status);
CREATE INDEX IF NOT EXISTS idx_profile_invites_token ON profile_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_profile_invites_expires ON profile_invites(expires_at);

CREATE OR REPLACE FUNCTION update_profile_invites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profile_invites_updated_at
BEFORE UPDATE ON profile_invites
FOR EACH ROW
EXECUTE FUNCTION update_profile_invites_timestamp();
```

### Step 2: (Optional) Configure Email Service

Set these environment variables in `.env`:

```env
# For Gmail - use App Passwords, NOT your regular password
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@gobusker.com
CLIENT_URL=http://localhost:5173  # dev or https://gobusker.com for prod
```

**How to get Gmail App Password:**
1. Enable 2-Factor Authentication on Google Account
2. Go to myaccount.google.com → Security
3. Find "App passwords"
4. Select Mail + Windows Computer
5. Copy the 16-character password
6. Use that in EMAIL_PASSWORD

**Without email configured?** System still works - invites are created, just no email sent. Share links manually.

### Step 3: Install Dependencies (if needed)

```bash
# In server directory
npm install express-async-errors  # if you get async error handling issues
```

### Step 4: Files Modified/Created

**Server:**
- ✅ `server/src/routes/inviteRoutes.ts` - Invite endpoints
- ✅ `server/src/services/emailService.ts` - Email sending
- ✅ `server/src/middleware/auth.ts` - JWT verification
- ✅ `server/src/index.ts` - Route registration
- ✅ `server/migrations/create_invites_table.sql` - Database schema

**Client:**
- ✅ `client/src/pages/InvitePage.tsx` - Invite acceptance page
- ✅ `client/src/components/BandMembersManager.tsx` - Management UI
- ✅ `client/src/components/profile/ProfileDetail.tsx` - Integration
- ✅ `client/src/App.tsx` - Route added

## 🧪 Testing the System

### Test Without Email:
1. Create a profile
2. Go to profile detail page
3. Click "Invite Band Member"
4. Enter email: test@example.com, revenue 50%
5. System responds with invite link
6. Share link manually (in dev, check API response)
7. Non-member clicks link → sees signup prompt
8. Signup → Accept
9. Becomes profile member ✅

### Test With Email:
1. Same as above but...
2. Member gets email with invite link
3. Clicks email link → auto-populates email
4. Signs up & accepts
5. Member added automatically ✅

## 📋 API Endpoints

```
POST   /api/invites/send                 - Send invitation
GET    /api/invites/profile/:profileId   - List pending invites (owner only)
GET    /api/invites/me                   - Get invites for current user
GET    /api/invites/token/:token         - Get invite details (public)
POST   /api/invites/accept               - Accept invitation
POST   /api/invites/reject               - Reject invitation
DELETE /api/invites/:inviteId            - Cancel invitation (owner only)
```

## 🔒 Security Features

- ✅ RLS policies prevent unauthorized access
- ✅ Token-based invite links (don't require login to view)
- ✅ 30-day expiring invites
- ✅ Email verification before accepting
- ✅ Only owners/admins can manage members

## ⚠️ Known Limitations

- Email sending disabled if nodemailer not installed (graceful degradation)
- Manual invite link sharing required if email not configured
- Revenue distribution not yet implemented (next phase)

## 🎯 Next Steps

1. **Revenue Distribution** - When tips arrive, split by revenue_share
2. **Notifications** - Real-time alerts when members join
3. **Role Management** - Let owners change member roles
4. **Bulk Invites** - Send multiple invites at once

---

**Ready to ship!** Run the SQL migration and optionally set up email credentials. System works without email (manual link sharing).
