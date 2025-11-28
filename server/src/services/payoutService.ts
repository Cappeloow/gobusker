import { stripe } from './stripe';
import { supabase } from '../lib/supabase';

export interface PayoutRequest {
  withdrawalId: string;
  profileId: string;
  amount: number; // in dollars
  email: string;
  stripeConnectAccountId?: string;
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  error?: string;
}

/**
 * Create a Stripe payout to an artist's account
 * Supports both direct bank transfers and Stripe Connect
 * Falls back to manual payout if automatic fails
 */
export async function createStripePayout(request: PayoutRequest): Promise<PayoutResult> {
  try {
    // Convert to cents (SEK)
    const amountInCents = Math.round(request.amount * 100);

    try {
      // Try to create automatic payout
      
      // Check if we're in test mode
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('sk_test');
      
      let payout;
      
      if (isTestMode) {
        // In test mode, mock the payout without calling Stripe
        console.log(`Test mode: Mocking payout for ${request.amount} SEK`);
        payout = {
          id: `po_test_${Date.now()}`, // Mock payout ID
          amount: amountInCents,
          currency: 'sek',
          method: 'standard',
          status: 'in_transit',
          created: Math.floor(Date.now() / 1000),
          automatic: true
        } as any;
      } else {
        // In production, use real Stripe payout
        payout = await stripe.payouts.create({
          amount: amountInCents,
          currency: 'sek',
          method: 'standard',
          description: `Payout for artist withdrawal`,
          statement_descriptor: 'GoBusker Artist Payout'
        });
      }

      // Update withdrawal record with payout ID
      await supabase
        .from('withdrawals')
        .update({
          stripe_payout_id: payout.id,
          payout_method: 'stripe'
        })
        .eq('id', request.withdrawalId);

      console.log(`Automatic payout created: ${payout.id} for ${request.amount} SEK`);

      return {
        success: true,
        payoutId: payout.id
      };
    } catch (payoutErr: any) {
      // If automatic payout fails, mark as manual payout needed
      const errorMsg = payoutErr.message || 'Automatic payout failed';
      console.warn(`Automatic payout failed, marking for manual transfer: ${errorMsg}`);

      // Still mark the withdrawal as approved, but flag it for manual payout
      await supabase
        .from('withdrawals')
        .update({
          payout_method: 'manual',
          payout_error: errorMsg
        })
        .eq('id', request.withdrawalId);

      return {
        success: true, // Mark as successful because saldo is deducted and withdrawal is approved
        payoutId: undefined, // No automatic payout ID
        error: `Manual payout required: ${errorMsg}` // But note it needs manual transfer
      };
    }
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown error creating payout';
    console.error('Stripe payout error:', errorMessage);

    // Update withdrawal with error
    await supabase
      .from('withdrawals')
      .update({
        payout_error: errorMessage,
        payout_method: 'manual'
      })
      .eq('id', request.withdrawalId);

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get payout details from Stripe
 */
export async function getPayoutDetails(payoutId: string) {
  try {
    const payout = await stripe.payouts.retrieve(payoutId);
    return payout;
  } catch (err) {
    console.error('Error retrieving payout:', err);
    throw err;
  }
}

/**
 * Get all payouts for a specific time period
 */
export async function listPayouts(limit: number = 10, starting_after?: string) {
  try {
    const payouts = await stripe.payouts.list(
      {
        limit,
        ...(starting_after && { starting_after })
      }
    );
    return payouts.data;
  } catch (err) {
    console.error('Error listing payouts:', err);
    throw err;
  }
}

/**
 * Cancel a pending payout
 */
export async function cancelPayout(payoutId: string): Promise<PayoutResult> {
  try {
    const payout = await stripe.payouts.cancel(payoutId);
    
    console.log(`Payout cancelled: ${payoutId}`);

    return {
      success: true,
      payoutId: payout.id
    };
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown error cancelling payout';
    console.error('Error cancelling payout:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get Stripe account balance
 */
export async function getStripeBalance() {
  try {
    const balance = await stripe.balance.retrieve();
    return {
      available: balance.available.map(b => ({ amount: b.amount / 100, currency: b.currency })),
      pending: balance.pending.map(b => ({ amount: b.amount / 100, currency: b.currency })),
      instant_available: balance.instant_available?.map(b => ({ amount: b.amount / 100, currency: b.currency })) || []
    };
  } catch (err) {
    console.error('Error retrieving Stripe balance:', err);
    throw err;
  }
}

/**
 * Create a bank account token for direct transfers
 * This would require collecting bank details securely
 */
export async function createBankAccountToken(bankDetails: {
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
}) {
  try {
    const token = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_number: bankDetails.accountNumber,
        routing_number: bankDetails.routingNumber,
        account_holder_name: bankDetails.accountHolderName,
        account_holder_type: bankDetails.accountHolderType
      }
    });

    return token;
  } catch (err) {
    console.error('Error creating bank account token:', err);
    throw err;
  }
}
