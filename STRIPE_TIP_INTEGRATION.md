# Stripe Integration for Tip Wall

## Overview
The Tip Wall feature is now fully integrated with Stripe for payment processing.

## How It Works

### User Flow
1. User clicks "Send a Tip" on a profile
2. User enters their name, tip amount, and optional message
3. User clicks "Send Tip"
4. Frontend creates a temporary tip record with status "pending"
5. Frontend redirects to Stripe Checkout
6. User completes payment
7. Stripe webhook confirms payment
8. Backend updates tip status to "completed"
9. Tip appears on the tip wall with verified payment status

### Payment Flow

**Client-side (React):**
- `TipWall.tsx` collects donor name and tip amount
- Sends request to `/api/checkout/create-session` with `tipAmount` and `tipId`
- Redirects to Stripe Checkout URL

**Server-side (Express):**
- `POST /api/checkout/create-session` creates Stripe session with:
  - Custom line item with tip amount
  - Metadata containing `profileId` and `tipId`
  - Redirects user to Stripe Checkout

- `GET /api/checkout/session-status` handles payment confirmation:
  - Checks payment status
  - If tip payment: Updates `tips` table with `payment_status = 'completed'` and `stripe_session_id`
  - If product order: Creates order record as before

## Database Schema

### Tips Table
```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  message TEXT,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  stripe_session_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Environment Variables Needed

Already configured in your `.env.local`:
- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe public API key  
- `FRONTEND_URL` - Frontend URL (default: http://localhost:5173)

## Testing the Integration

1. **Local Testing:**
   ```bash
   # Start both servers
   npm run dev          # Client
   npm run dev          # Server (in separate terminal)
   ```

2. **Test Payment:**
   - Navigate to any profile
   - Click "💰 Tip Wall"
   - Click "Send a Tip"
   - Enter name and amount
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete checkout

3. **Verify Tip:**
   - Check that tip appears on tip wall
   - Verify `payment_status = 'completed'` in database

## Key Features

✅ **Flexible Tipping Amounts** - Quick presets ($1, $5, $10, $20, $50) or custom
✅ **Optional Messages** - Donors can leave up to 150-character messages
✅ **Graffiti-Style Display** - Colorful grid with random colors per tip
✅ **Payment Verification** - Only paid tips show on the wall
✅ **Secure** - Uses Stripe's payment infrastructure
✅ **No Payment Refunds** - Tips cannot be deleted once paid
✅ **Pending Tips** - Temporary tips deleted if payment cancelled

## Migration Steps

1. **Run SQL Migration:**
   ```bash
   # Run the migration against your Supabase database
   psql -h db.XXX.supabase.co -U postgres -d postgres -f server/migrations/add_tips_table.sql
   ```

2. **Verify Tables:**
   ```sql
   SELECT * FROM tips LIMIT 1;
   ```

## Future Enhancements

- [ ] Donor email collection for receipts
- [ ] Tip leaderboards
- [ ] Custom tip rewards/perks
- [ ] Automatic payouts to artist wallet
- [ ] Tip notifications
- [ ] Tax reporting for artists

## Troubleshooting

**Payment redirects to cancel page:**
- Check `FRONTEND_URL` environment variable
- Verify Stripe API keys are correct
- Check browser console for errors

**Tip doesn't appear after payment:**
- Check that `tips` table migration was run
- Verify `payment_status` is updated in database
- Check server logs for errors

**Stripe test card fails:**
- Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC
- Any 5-digit postal code
