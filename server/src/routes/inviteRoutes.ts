import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { verifyAuth } from '../middleware/auth';

const router = express.Router();

interface SendInviteRequest {
  profileId: string;
  inviteeEmail: string;
  revenuShare?: number;
}

interface AcceptInviteRequest {
  token: string;
}

// Send invite to join a profile/band
router.post('/send', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { profileId, inviteeEmail, revenuShare = 100 } = req.body as SendInviteRequest;
    const inviterId = req.user?.id;

    if (!profileId || !inviteeEmail || !inviterId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify inviter is owner/admin of this profile
    const { data: profileMember, error: pmError } = await supabase
      .from('profile_members')
      .select('role')
      .eq('profile_id', profileId)
      .eq('user_id', inviterId)
      .single();

    if (pmError || !profileMember || !['owner', 'admin'].includes(profileMember.role)) {
      return res.status(403).json({ message: 'Not authorized to invite members to this profile' });
    }

    // Check if user with this email already exists in profile
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userWithEmail = authUsers?.users?.find(u => u.email === inviteeEmail);
    
    if (userWithEmail) {
      const { data: existingMember } = await supabase
        .from('profile_members')
        .select('user_id')
        .eq('profile_id', profileId)
        .eq('user_id', userWithEmail.id)
        .single();

      if (existingMember) {
        return res.status(400).json({ message: 'This user is already a member of this profile' });
      }
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('profile_invites')
      .insert([
        {
          profile_id: profileId,
          inviter_id: inviterId,
          invitee_email: inviteeEmail.toLowerCase(),
          revenue_share: Math.min(100, Math.max(0, revenuShare)),
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (inviteError || !invite) {
      console.error('Error creating invite:', inviteError);
      return res.status(500).json({ message: 'Failed to create invite' });
    }

    // Get profile name for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .single();

    const inviterName = req.user?.user_metadata?.name || 'Someone';
    const profileName = profile?.name || 'a band profile';

    // Send invite email (optional - if email service is configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const { sendInviteEmail } = await import('../services/emailService');
        await sendInviteEmail({
          to: inviteeEmail,
          profileName,
          inviterName,
          inviteToken: invite.invite_token,
          inviteUrl: `${process.env.CLIENT_URL}/invite/${invite.invite_token}`
        });
      } catch (emailError) {
        console.error('Error sending invite email:', emailError);
        // Don't fail the request, invite was created, just email didn't send
        return res.status(201).json({
          ...invite,
          warning: 'Invite created but email failed to send. Share the invite link manually.'
        });
      }
    } else {
      console.warn('Email service not configured. Invite created but email not sent.');
      return res.status(201).json({
        ...invite,
        warning: 'Invite created but email service not configured. Share the invite link manually.'
      });
    }

    res.status(201).json({ ...invite, message: 'Invite sent successfully' });
  } catch (err) {
    console.error('Error sending invite:', err);
    res.status(500).json({ message: 'Failed to send invite' });
  }
});

// Get pending invites for a profile
router.get('/profile/:profileId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const userId = req.user?.id;

    if (!profileId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify user is owner/admin of this profile
    const { data: profileMember, error: pmError } = await supabase
      .from('profile_members')
      .select('role')
      .eq('profile_id', profileId)
      .eq('user_id', userId)
      .single();

    if (pmError || !profileMember || !['owner', 'admin'].includes(profileMember.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all non-expired invites
    const { data: invites, error: invitesError } = await supabase
      .from('profile_invites')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitesError) {
      return res.status(500).json({ message: 'Failed to fetch invites' });
    }

    res.json(invites);
  } catch (err) {
    console.error('Error fetching invites:', err);
    res.status(500).json({ message: 'Failed to fetch invites' });
  }
});

// Get invites for current user
router.get('/me', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(400).json({ message: 'Not authenticated' });
    }

    // Get invites sent to this user's email or user_id
    const { data: invites, error: invitesError } = await supabase
      .from('profile_invites')
      .select(`
        *,
        profiles:profile_id (id, name, description)
      `)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .or(`invitee_email.eq.${userEmail},invitee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (invitesError) {
      return res.status(500).json({ message: 'Failed to fetch invites' });
    }

    res.json(invites);
  } catch (err) {
    console.error('Error fetching user invites:', err);
    res.status(500).json({ message: 'Failed to fetch invites' });
  }
});

// Get invite details by token (for public invite link)
router.get('/token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Missing token' });
    }

    const { data: invite, error } = await supabase
      .from('profile_invites')
      .select(`
        *,
        profiles:profile_id (id, name, description, image_url),
        inviter:inviter_id (id, user_metadata->>'name' as name)
      `)
      .eq('invite_token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invite) {
      return res.status(404).json({ message: 'Invite not found or expired' });
    }

    res.json(invite);
  } catch (err) {
    console.error('Error fetching invite:', err);
    res.status(500).json({ message: 'Failed to fetch invite' });
  }
});

// Accept invite
router.post('/accept', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { token } = req.body as AcceptInviteRequest;
    const userId = req.user?.id;

    if (!token || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('profile_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ message: 'Invite not found or expired' });
    }

    // Verify the invite is for this user's email
    if (invite.invitee_email !== req.user?.email?.toLowerCase()) {
      return res.status(403).json({ message: 'This invite was not sent to your email' });
    }

    // Start a transaction: update invite, add to profile_members
    // Update invite status
    const { error: updateInviteError } = await supabase
      .from('profile_invites')
      .update({
        status: 'accepted',
        invitee_id: userId,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (updateInviteError) {
      console.error('Error updating invite:', updateInviteError);
      return res.status(500).json({ message: 'Failed to accept invite' });
    }

    // Add user to profile_members
    const { data: profileMember, error: memberError } = await supabase
      .from('profile_members')
      .insert([
        {
          profile_id: invite.profile_id,
          user_id: userId,
          revenue_share: invite.revenue_share,
          role: 'member'
        }
      ])
      .select()
      .single();

    if (memberError) {
      // If member insert fails, try to revert the invite update
      console.error('Error adding profile member:', memberError);
      await supabase
        .from('profile_invites')
        .update({ status: 'pending', invitee_id: null, accepted_at: null })
        .eq('id', invite.id);
      return res.status(500).json({ message: 'Failed to accept invite' });
    }

    res.json({
      message: 'Invite accepted successfully',
      profileId: invite.profile_id,
      profileMember
    });
  } catch (err) {
    console.error('Error accepting invite:', err);
    res.status(500).json({ message: 'Failed to accept invite' });
  }
});

// Reject invite
router.post('/reject', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };
    const userEmail = req.user?.email;

    if (!token || !userEmail) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('profile_invites')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString()
      })
      .eq('invite_token', token)
      .eq('invitee_email', userEmail.toLowerCase())
      .eq('status', 'pending');

    if (error) {
      return res.status(500).json({ message: 'Failed to reject invite' });
    }

    res.json({ message: 'Invite rejected' });
  } catch (err) {
    console.error('Error rejecting invite:', err);
    res.status(500).json({ message: 'Failed to reject invite' });
  }
});

// Cancel invite (by owner/admin)
router.delete('/:inviteId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.id;

    if (!inviteId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get invite
    const { data: invite, error: getError } = await supabase
      .from('profile_invites')
      .select('profile_id, status')
      .eq('id', inviteId)
      .single();

    if (getError || !invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    // Verify user is owner/admin of profile
    const { data: profileMember } = await supabase
      .from('profile_members')
      .select('role')
      .eq('profile_id', invite.profile_id)
      .eq('user_id', userId)
      .single();

    if (!profileMember || !['owner', 'admin'].includes(profileMember.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Cancel invite
    const { error: deleteError } = await supabase
      .from('profile_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);

    if (deleteError) {
      return res.status(500).json({ message: 'Failed to cancel invite' });
    }

    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    console.error('Error cancelling invite:', err);
    res.status(500).json({ message: 'Failed to cancel invite' });
  }
});

export default router;
