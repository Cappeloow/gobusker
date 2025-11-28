import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { createStripePayout, getPayoutDetails } from '../services/payoutService';

export const withdrawalRouter = Router();

/**
 * GET /api/withdrawals/admin/all
 * 
 * Admin endpoint to get all withdrawal requests (service role only)
 */
withdrawalRouter.get('/admin/all', async (req: Request, res: Response) => {
  try {
    // Fetch all withdrawals with profile information
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select(`
        id,
        profile_id,
        amount,
        status,
        requested_at,
        processed_at,
        notes,
        profiles(name)
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching all withdrawals:', error);
      return res.status(500).json({ message: 'Failed to fetch withdrawals' });
    }

    // Transform response to include profile name
    const transformedWithdrawals = withdrawals?.map((w: any) => ({
      ...w,
      profile_name: w.profiles?.name || 'Unknown'
    })) || [];

    res.status(200).json(transformedWithdrawals);
  } catch (err) {
    console.error('Error in get all withdrawals:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/withdrawals/request
 * 
 * Create a withdrawal request for an artist's accumulated saldo
 */
withdrawalRouter.post('/request', async (req: Request, res: Response) => {
  const { profileId, amount } = req.body;

  if (!profileId) {
    return res.status(400).json({ message: 'Profile ID is required' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0' });
  }

  try {
    // Get the profile to check bank account and get user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, bank_account_token')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Check if bank account is configured
    if (!profile.bank_account_token) {
      return res.status(400).json({ 
        message: 'Bank account is required before requesting a withdrawal. Please add your bank details first.' 
      });
    }

    // Get user's wallet to check saldo
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('saldo')
      .eq('user_id', profile.user_id)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ message: 'User wallet not found' });
    }

    // Check if requested amount doesn't exceed saldo
    if (amount > (wallet.saldo || 0)) {
      return res.status(400).json({ 
        message: `Insufficient saldo. Available: ${(wallet.saldo || 0).toFixed(2)} SEK` 
      });
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert([
        {
          profile_id: profileId,
          amount: amount,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal request:', withdrawalError);
      return res.status(500).json({ message: 'Failed to create withdrawal request' });
    }

    res.status(201).json({
      message: 'Withdrawal request created successfully',
      withdrawal
    });
  } catch (err) {
    console.error('Error in withdrawal request:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/withdrawals/:profileId
 * 
 * Get all withdrawal requests for a profile
 */
withdrawalRouter.get('/:profileId', async (req: Request, res: Response) => {
  const { profileId } = req.params;

  try {
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('profile_id', profileId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return res.status(500).json({ message: 'Failed to fetch withdrawals' });
    }

    res.status(200).json(withdrawals);
  } catch (err) {
    console.error('Error in get withdrawals:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/withdrawals/:withdrawalId/approve
 * 
 * Admin endpoint to approve a withdrawal request and initiate Stripe payout
 * Deducts from artist's saldo and transfers money via Stripe
 */
withdrawalRouter.patch('/:withdrawalId/approve', async (req: Request, res: Response) => {
  const { withdrawalId } = req.params;
  const { notes } = req.body;

  try {
    // Get withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (withdrawalError || !withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    // Update withdrawal status to approved
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', withdrawalId);

    if (updateError) {
      console.error('Error approving withdrawal:', updateError);
      return res.status(500).json({ message: 'Failed to approve withdrawal' });
    }

    // Get user_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', withdrawal.profile_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Deduct from user's wallet (shared across all profiles)
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('saldo')
      .eq('user_id', profile.user_id)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ message: 'User wallet not found' });
    }

    const currentSaldo = wallet.saldo || 0;
    const newSaldo = Math.max(0, currentSaldo - withdrawal.amount);

    const { error: saldoError } = await supabase
      .from('user_wallets')
      .update({ saldo: newSaldo })
      .eq('user_id', profile.user_id);

    if (saldoError) {
      console.error('Error updating wallet saldo:', saldoError);
      return res.status(500).json({ message: 'Failed to update artist wallet' });
    }

    // Initiate Stripe payout
    const payoutResult = await createStripePayout({
      withdrawalId: withdrawalId,
      profileId: withdrawal.profile_id,
      amount: withdrawal.amount,
      email: 'noreply@gobusker.local' // Default email since profile might not have one
    });

    if (!payoutResult.success) {
      console.warn(`Payout initiated but failed: ${payoutResult.error}`);
      // Note: Saldo is already deducted, but we'll notify admin of the issue
    }

    res.status(200).json({
      message: 'Withdrawal approved and payout initiated',
      withdrawal: { ...withdrawal, status: 'approved' },
      newSaldo: newSaldo,
      payout: payoutResult
    });
  } catch (err) {
    console.error('Error in approve withdrawal:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/withdrawals/:withdrawalId/reject
 * 
 * Admin endpoint to reject a withdrawal request
 */
withdrawalRouter.patch('/:withdrawalId/reject', async (req: Request, res: Response) => {
  const { withdrawalId } = req.params;
  const { notes } = req.body;

  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', withdrawalId);

    if (error) {
      console.error('Error rejecting withdrawal:', error);
      return res.status(500).json({ message: 'Failed to reject withdrawal' });
    }

    res.status(200).json({ message: 'Withdrawal request rejected' });
  } catch (err) {
    console.error('Error in reject withdrawal:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/withdrawals/:withdrawalId/mark-completed
 * 
 * Admin endpoint to mark a withdrawal as completed (after transfer)
 */
withdrawalRouter.patch('/:withdrawalId/mark-completed', async (req: Request, res: Response) => {
  const { withdrawalId } = req.params;

  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (error) {
      console.error('Error marking withdrawal as completed:', error);
      return res.status(500).json({ message: 'Failed to mark withdrawal as completed' });
    }

    res.status(200).json({ message: 'Withdrawal marked as completed' });
  } catch (err) {
    console.error('Error in mark completed:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/withdrawals/:withdrawalId/payout-status
 * 
 * Check the status of a payout
 */
withdrawalRouter.get('/:withdrawalId/payout-status', async (req: Request, res: Response) => {
  const { withdrawalId } = req.params;

  try {
    // Get withdrawal with payout details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (withdrawalError || !withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    if (!withdrawal.stripe_payout_id) {
      return res.json({
        status: 'no_payout',
        message: 'No Stripe payout initiated for this withdrawal'
      });
    }

    // Get payout details from Stripe
    const payoutDetails = await getPayoutDetails(withdrawal.stripe_payout_id);

    res.status(200).json({
      status: payoutDetails.status,
      payout_id: payoutDetails.id,
      amount: payoutDetails.amount / 100,
      created: payoutDetails.created,
      arrival_date: payoutDetails.arrival_date,
      automatic: payoutDetails.automatic,
      failure_code: payoutDetails.failure_code,
      failure_message: payoutDetails.failure_message
    });
  } catch (err) {
    console.error('Error getting payout status:', err);
    res.status(500).json({ message: 'Failed to get payout status' });
  }
});

/**
 * PATCH /api/withdrawals/admin/bulk-process
 * 
 * Process multiple approved withdrawals at once
 */
withdrawalRouter.patch('/admin/bulk-process', async (req: Request, res: Response) => {
  const { withdrawalIds } = req.body;

  if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
    return res.status(400).json({ message: 'Invalid withdrawal IDs provided' });
  }

  try {
    const results = [];

    for (const withdrawalId of withdrawalIds) {
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (withdrawalError || !withdrawal) {
        results.push({
          withdrawalId,
          success: false,
          error: 'Withdrawal not found'
        });
        continue;
      }

      if (withdrawal.status !== 'approved') {
        results.push({
          withdrawalId,
          success: false,
          error: `Withdrawal status is ${withdrawal.status}, not approved`
        });
        continue;
      }

      // Get profile for email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', withdrawal.profile_id)
        .single();

      if (profileError || !profile) {
        results.push({
          withdrawalId,
          success: false,
          error: 'Profile not found'
        });
        continue;
      }

      // Create payout
      const payoutResult = await createStripePayout({
        withdrawalId: withdrawalId,
        profileId: withdrawal.profile_id,
        amount: withdrawal.amount,
        email: 'noreply@gobusker.local'
      });

      results.push({
        withdrawalId,
        success: payoutResult.success,
        payoutId: payoutResult.payoutId,
        error: payoutResult.error
      });
    }

    res.status(200).json({
      message: `Processed ${results.length} withdrawals`,
      results
    });
  } catch (err) {
    console.error('Error in bulk process:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
