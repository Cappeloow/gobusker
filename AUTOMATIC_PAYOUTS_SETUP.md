# Automatic Stripe Payouts System

## Overview
Artists now get paid automatically to their bank account when you approve a withdrawal. The system uses Stripe Payouts API to transfer money directly.

## How It Works

### Complete Payment Flow
1. **Artist receives tips** → Saldo increases
2. **Artist requests withdrawal** → Creates withdrawal request
3. **Admin approves withdrawal** → 
   - Saldo deducted immediately
   - Stripe payout initiated automatically
   - Money transferred from your Stripe account to artist's bank
4. **Payout settles** (typically 1-2 business days) → Status shows "completed"

### Money Flow
```
Customer Payment → Your Stripe Account 
                 → Artist Saldo (in database)
                 → Approved Withdrawal
                 → Automatic Stripe Payout
                 → Artist Bank Account
```

## What Changed

### Backend Files
1. **`server/src/services/payoutService.ts`** (NEW)
   - Creates Stripe payouts
   - Checks your account balance
   - Handles payment errors
   - Supports bulk payouts

2. **`server/src/routes/withdrawalRoutes.ts`** (UPDATED)
   - Approval endpoint now triggers payout
   - New endpoint: `/api/withdrawals/:id/payout-status`
   - New endpoint: `/api/withdrawals/admin/bulk-process`

3. **`server/migrations/add_payout_fields.sql`** (NEW)
   - Adds `stripe_payout_id` field to track payout
   - Adds `payout_error` field for error messages
   - Indexes for performance

### Frontend Files
1. **`client/src/components/admin/WithdrawalAdmin.tsx`** (UPDATED)
   - Shows Stripe payout ID when initiated
   - Displays payout errors if they occur
   - Success message includes payout details

## Database Schema Changes

**New columns in `withdrawals` table:**
```sql
stripe_payout_id TEXT         -- Stripe payout transaction ID
payout_method TEXT            -- 'stripe' or 'manual'
payout_error TEXT             -- Error message if payout fails
```

**New columns in `profiles` table:**
```sql
stripe_connect_account_id TEXT  -- For future Stripe Connect integration
stripe_connect_status TEXT      -- Connection status
payout_email TEXT               -- Artist's payout email
bank_account_token TEXT         -- Encrypted bank details
payout_method TEXT              -- Payout method preference
```

## What You Need to Do

### 1. Run Database Migration
Go to Supabase SQL Editor and run:
```sql
-- Copy contents of: server/migrations/add_payout_fields.sql
```

### 2. Ensure Stripe Balance
- Payouts use your Stripe account balance
- Money must be available in your account
- System automatically checks balance before creating payout

### 3. Use the Admin Panel
- Navigate to `/admin/withdrawals`
- Click "Approve" on withdrawal requests
- Payout initiates automatically
- Watch for "Stripe payout initiated" message

## API Endpoints

### New Endpoints

**GET `/api/withdrawals/:withdrawalId/payout-status`**
- Returns payout status from Stripe
- Shows when money will arrive (arrival_date)
- Displays any failure reasons

**PATCH `/api/withdrawals/admin/bulk-process`**
- Process multiple withdrawals at once
- Body: `{ withdrawalIds: ['id1', 'id2', ...] }`
- Returns results for each withdrawal

## Success States

### Green Success Message Shows:
```
✓ Withdrawal approved! $50.00 deducted from artist's saldo. 
New saldo: $25.00. Stripe payout initiated (po_1234567890)
```

### What This Means:
- Saldo deducted ✅
- Payout ID assigned ✅
- Money transferred from your Stripe account ✅
- Artist will receive funds in 1-2 business days ✅

## Error Handling

### If Payout Fails
- "Insufficient funds" → You don't have enough balance
- "Invalid bank account" → Artist's account info incomplete
- Error displays in red on the admin panel
- Saldo is STILL deducted (you're responsible for the funds)

### Troubleshooting
1. Check your Stripe account balance
2. Verify artist has bank account connected
3. Check withdrawal amount is valid
4. See payout error message in admin panel

## Testing

### Stripe Test Mode
1. Use test API keys in `.env`
2. Payouts work in test mode with test destination accounts
3. No real money transferred in test mode

### Test Cards
- 4242 4242 4242 4242 - Visa (all amounts work)

## Future Enhancements

1. **Stripe Connect** - Let artists connect their own Stripe account
2. **Multiple payout methods** - Bank transfer, PayPal, etc.
3. **Scheduled payouts** - Batch payouts on specific days
4. **Payout notifications** - Email artists when paid
5. **Payout history** - Track all historical payouts
6. **Tax reporting** - Generate 1099s for artists

## Monitoring

### Check Payout Status
Admin panel shows:
- Stripe payout ID
- When payout was initiated
- Whether money was successfully transferred
- Any error messages

### In Supabase
- Query `withdrawals` table for `stripe_payout_id`
- Status should update to "completed" after settlement
