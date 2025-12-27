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
  alias?: string;
  description?: string;
  specialty?: string;
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

    // Count current members to calculate default equal revenue share
    const { data: currentMembers, error: countError } = await supabase
      .from('profile_members')
      .select('id')
      .eq('profile_id', profileId);

    if (countError) {
      console.error('Error counting members:', countError);
      return res.status(500).json({ message: 'Failed to count members' });
    }

    // Use provided revenue share, or default to equal distribution
    const totalMembersAfterAccept = (currentMembers?.length || 0) + 1;
    const defaultShare = 100 / totalMembersAfterAccept;
    const finalShare = revenuShare || defaultShare;

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('profile_invites')
      .insert([
        {
          profile_id: profileId,
          inviter_id: inviterId,
          invitee_email: inviteeEmail.toLowerCase(),
          revenue_share: finalShare,
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

    console.log('Fetching invites for user:', userEmail, userId);

    if (!userId || !userEmail) {
      return res.status(400).json({ message: 'Not authenticated' });
    }

    // Get invites sent to this user's email or user_id
    const { data: invites, error: invitesError } = await supabase
      .from('profile_invites')
      .select(`
        id,
        invite_token,
        invitee_email,
        revenue_share,
        expires_at,
        inviter_id,
        profiles:profile_id (
          id,
          name
        )
      `)
      .eq('status', 'pending')
      .eq('invitee_email', userEmail.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Error fetching invites:', invitesError);
      return res.status(500).json({ message: 'Failed to fetch invites', error: invitesError.message });
    }

    console.log('Found invites:', invites?.length || 0);
    
    // For each invite, fetch the inviter's name separately
    const transformedInvites = await Promise.all((invites || []).map(async (invite) => {
      const { data: inviterData } = await supabase.auth.admin.getUserById(invite.inviter_id);
      return {
        ...invite,
        inviter: {
          name: inviterData?.user?.user_metadata?.name || 'Someone'
        }
      };
    }));

    res.json(transformedInvites);
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
        id,
        invite_token,
        invitee_email,
        revenue_share,
        expires_at,
        inviter_id,
        profiles:profile_id (id, name)
      `)
      .eq('invite_token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invite) {
      return res.status(404).json({ message: 'Invite not found or expired' });
    }

    // Fetch inviter data separately
    const { data: inviterData } = await supabase.auth.admin.getUserById(invite.inviter_id);
    
    const response = {
      ...invite,
      inviter: {
        id: invite.inviter_id,
        name: inviterData?.user?.user_metadata?.name || 'Someone'
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Error fetching invite:', err);
    res.status(500).json({ message: 'Failed to fetch invite' });
  }
});

// Accept invite
router.post('/accept', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { token, alias, description, specialty } = req.body as AcceptInviteRequest;
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

    // Use the revenue_share from the invitation (respects manual adjustments)
    const newMemberShare = invite.revenue_share;

    // Get current members to adjust their shares
    const { data: currentMembers, error: countError } = await supabase
      .from('profile_members')
      .select('id, user_id, revenue_share')
      .eq('profile_id', invite.profile_id);

    if (countError) {
      console.error('Error fetching members:', countError);
      return res.status(500).json({ message: 'Failed to fetch members' });
    }

    // Calculate total current share
    const totalCurrentShare = currentMembers?.reduce((sum, m) => sum + Number(m.revenue_share), 0) || 0;
    
    // Calculate new total after adding new member
    const newTotal = totalCurrentShare + newMemberShare;
    
    // If new total exceeds 100%, proportionally reduce existing members
    if (newTotal > 100 && currentMembers && currentMembers.length > 0) {
      const reductionFactor = (100 - newMemberShare) / totalCurrentShare;
      
      for (const member of currentMembers) {
        const adjustedShare = Number(member.revenue_share) * reductionFactor;
        await supabase
          .from('profile_members')
          .update({ revenue_share: adjustedShare })
          .eq('id', member.id);
      }
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

    // Add user to profile_members with the specified share from invitation
    const { data: profileMember, error: memberError } = await supabase
      .from('profile_members')
      .insert([
        {
          profile_id: invite.profile_id,
          user_id: userId,
          revenue_share: newMemberShare,
          role: 'member',
          alias: alias || null,
          description: description || null,
          specialty: specialty || null
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

    // Check if user is profile owner OR owner/admin in profile_members
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', invite.profile_id)
      .single();

    const isProfileOwner = profile?.user_id === userId;

    // Also check profile_members
    const { data: profileMember } = await supabase
      .from('profile_members')
      .select('role')
      .eq('profile_id', invite.profile_id)
      .eq('user_id', userId)
      .maybeSingle();

    const isMemberAdmin = profileMember && ['owner', 'admin'].includes(profileMember.role);

    if (!isProfileOwner && !isMemberAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete invite (instead of updating status to avoid unique constraint issues)
    const { error: deleteError } = await supabase
      .from('profile_invites')
      .delete()
      .eq('id', inviteId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return res.status(500).json({ message: 'Failed to cancel invite' });
    }

    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    console.error('Error cancelling invite:', err);
    res.status(500).json({ message: 'Failed to cancel invite' });
  }
});

export default router;
