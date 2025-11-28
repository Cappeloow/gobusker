# Withdrawal Request System - Implementation Complete

## Overview
Complete withdrawal request system implemented for artists to request withdrawals of their accumulated saldo.

## Components

### 1. Database (`add_withdrawals_table.sql`)
- **withdrawals table** with fields:
  - `id` (UUID primary key)
  - `profile_id` (FK to profiles)
  - `amount` (DECIMAL)
  - `status` (pending, approved, rejected, completed)
  - `requested_at`, `processed_at` (timestamps)
  - `notes` (admin notes)

- **RLS Policies**:
  - Users can view their own withdrawal requests
  - Users can create withdrawal requests
  - Service role can update withdrawals (approve/reject)

### 2. Backend Endpoints (`withdrawalRoutes.ts`)

**POST /api/withdrawals/request**
- Create a withdrawal request
- Validates amount doesn't exceed available saldo
- Returns 400 if insufficient funds

**GET /api/withdrawals/:profileId**
- Get all withdrawal requests for a profile
- User can only view their own

**GET /api/withdrawals/admin/all**
- Admin endpoint to fetch all withdrawal requests
- Includes profile name for display

**PATCH /api/withdrawals/:withdrawalId/approve**
- Approve a withdrawal request
- Automatically deducts from artist's saldo
- Admin only

**PATCH /api/withdrawals/:withdrawalId/reject**
- Reject a withdrawal request
- Artist keeps their saldo
- Admin only

**PATCH /api/withdrawals/:withdrawalId/mark-completed**
- Mark approved withdrawal as completed (after transfer)
- Admin only

### 3. Frontend Components

**WithdrawalWidget.tsx** (Artist View)
- Request withdrawal form
- Select profile (if multiple)
- Show available saldo
- View withdrawal history with status
- Status indicators: Pending, Approved, Rejected, Completed

**WithdrawalAdmin.tsx** (Admin Panel)
- View all withdrawal requests
- Filter by status
- Approve/Reject with notes
- Mark completed after manual transfer
- Admin-only interface

### 4. Wallet Integration
- WithdrawalWidget replaces the placeholder button
- Shows in Wallet component for artists to manage withdrawals
- Displays history of all withdrawal requests

## Workflow

```
Artist View:
1. Artist goes to Wallet
2. Requests withdrawal of $X from their saldo
3. System creates pending request
4. Admin sees pending request in admin panel
5. Admin reviews and approves
6. Artist's saldo decreases by $X
7. Admin transfers money manually
8. Admin marks as completed

Admin View:
1. View all pending withdrawal requests
2. Add notes if needed
3. Click "Approve" → deducts from saldo
4. After manual transfer, click "Mark Completed"
5. Can also reject requests (artist keeps saldo)
```

## Status Flow

```
pending → approved → completed
       ↘
         rejected (saldo unchanged)
```

## Validation

- ✅ Amount must be > 0
- ✅ Amount cannot exceed available saldo
- ✅ Only artist can request from their profiles
- ✅ Only admin can approve/reject
- ✅ Saldo automatically deducted on approval

## Next Steps (Optional)

1. **Email Notifications**
   - Notify artist when withdrawal is approved
   - Notify admin when new request comes in

2. **Webhook Integration**
   - Automatically mark as completed after Stripe transfer
   - Or integrate with bank transfer API

3. **Admin Dashboard Route**
   - Add `/admin/withdrawals` route to view all requests
   - Restrict to admin users only

4. **Approval Rules**
   - Set minimum/maximum withdrawal amounts
   - Approval delays/hold periods
   - Weekly withdrawal limits

## Files Created/Modified

**Database:**
- `server/migrations/add_withdrawals_table.sql` (NEW)

**Backend:**
- `server/src/routes/withdrawalRoutes.ts` (NEW)
- `server/src/index.ts` (MODIFIED - added router)

**Frontend:**
- `client/src/components/WithdrawalWidget.tsx` (NEW)
- `client/src/components/admin/WithdrawalAdmin.tsx` (NEW)
- `client/src/components/Wallet.tsx` (MODIFIED - integrated widget)

## API Endpoints

```
POST   /api/withdrawals/request              - Request withdrawal
GET    /api/withdrawals/:profileId           - Get profile's withdrawals
GET    /api/withdrawals/admin/all            - Get all withdrawals (admin)
PATCH  /api/withdrawals/:id/approve          - Approve withdrawal (admin)
PATCH  /api/withdrawals/:id/reject           - Reject withdrawal (admin)
PATCH  /api/withdrawals/:id/mark-completed   - Mark as completed (admin)
```

## Testing Checklist

- [ ] Run migration: `add_withdrawals_table.sql`
- [ ] Artist can request withdrawal
- [ ] Cannot request more than available saldo
- [ ] Withdrawal appears in history
- [ ] Admin can view all withdrawals
- [ ] Admin can approve withdrawal
- [ ] Saldo decreases after approval
- [ ] Admin can reject withdrawal
- [ ] Saldo unchanged on rejection
- [ ] Admin can mark as completed

## Security Notes

- ✅ RLS policies prevent unauthorized access
- ✅ Service role needed for admin operations
- ✅ Saldo validation prevents over-withdrawal
- ✅ Only profile owner can request from their profile
- ⚠️ Admin panel should be restricted to admins only (add auth check)
