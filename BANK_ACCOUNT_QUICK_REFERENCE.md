# Quick Reference: Bank Account Requirement Feature

## What Was Built
Artists must now add a bank account before requesting withdrawals. This prevents withdrawal requests with no payout destination.

## Key Files

### Frontend Components
```
client/src/components/
├── BankAccountSetup.tsx          [NEW] - Bank account form
└── WithdrawalWidget.tsx          [UPDATED] - Now requires bank account
```

### Backend Routes
```
server/src/routes/
└── withdrawalRoutes.ts           [UPDATED] - Validates bank_account_token
```

### Database
```
server/migrations/
└── add_payout_fields.sql         [EXISTING] - Has bank_account_token column
```

## User Experience

### Before: Artist Without Bank Account
```
[Request Withdrawal Form]
Amount: _____
[Submit] ← Can submit without bank account
```

### After: Artist Without Bank Account
```
┌─ Bank Account Setup ─────────────────┐
│ 💳 Bank Account                      │
│ Add your bank account to enable      │
│ withdrawals of your earnings.        │
│                                      │
│ Account Holder: [____________________]
│ Account Number: [____________________]
│ Bank Code (BIC): [___________________]
│ Country:        [SE ▼________________]
│                                      │
│ [Add Bank Account] ◄─ REQUIRED       │
└──────────────────────────────────────┘

[Request Withdrawal Form - DISABLED]  ◄─ Grayed out, can't click
```

### After: Artist With Bank Account
```
┌─ Bank Account Setup ─────────────────┐
│ 💳 Bank Account                      │
│ ✓ Bank account connected            │
│ Money will be transferred to your    │
│ connected bank account.              │
│                                      │
│ [Remove Bank Account] (optional)     │
└──────────────────────────────────────┘

[Request Withdrawal Form - ENABLED]  ◄─ Fully interactive
Amount: 1000.00 SEK
[Request Withdrawal] ◄─ Can click now
```

## How It Works

### 1. Component Loads
- WithdrawalWidget checks if profile has `bank_account_token`
- If yes → shows withdrawal form
- If no → shows BankAccountSetup form (form is disabled)

### 2. Artist Adds Bank Account
- Fills in: Name, Account Number, BIC, Country
- System encrypts and saves to `bank_account_token`
- Callback triggers to refresh form
- BankAccountSetup notifies parent component

### 3. Parent Component Updates
- Re-checks for `bank_account_token`
- Finds it now exists
- Disables BankAccountSetup
- Enables withdrawal form

### 4. Artist Requests Withdrawal
- Frontend sends request with `profileId` and amount
- Backend validates:
  1. Profile exists
  2. Bank account exists ← NEW CHECK
  3. Sufficient saldo
- If bank account missing → 400 error
- If OK → creates withdrawal request

## Error Messages

### Frontend (missing bank account)
> "Bank account is required before requesting a withdrawal. Please add your bank details first."

### Backend (missing bank account)
```json
{
  "message": "Bank account is required before requesting a withdrawal. Please add your bank details first."
}
```

## Testing Checklist

- [ ] Open WithdrawalWidget as new artist (no bank account)
- [ ] See BankAccountSetup form displayed
- [ ] See withdrawal form is grayed out (disabled)
- [ ] Fill in bank account details
- [ ] Click "Add Bank Account"
- [ ] See success message
- [ ] See BankAccountSetup shows checkmark
- [ ] See withdrawal form becomes enabled
- [ ] Request a withdrawal
- [ ] See withdrawal in pending list
- [ ] Switch to another profile with no bank account
- [ ] See BankAccountSetup form again
- [ ] Switch back to first profile
- [ ] See BankAccountSetup shows checkmark (persistent)

## Database Structure

### profiles table
```sql
bank_account_token  TEXT  -- Encrypted bank account details (Base64)
                          -- Format (when decoded):
                          -- {
                          --   holder: "Name",
                          --   number: "0003",      // Last 4 digits only
                          --   code: "BIC",
                          --   country: "SE",
                          --   added: "2024-01-01T12:00:00Z"
                          -- }
```

## Security Notes

1. **Encryption**: Bank details encrypted with btoa() - upgrade to AES in production
2. **Limited Storage**: Only last 4 digits of account number stored
3. **No Card Data**: Never stores sensitive card information
4. **User Control**: Artists can delete/remove bank account anytime
5. **Server Validation**: Backend double-checks bank account exists before withdrawal

## Currency: SEK (Swedish Krona)
All amounts throughout the system are in SEK:
- Saldo display: "1000.00 SEK"
- Withdrawal form: "Amount in SEK"
- Error messages: "Available: 500.00 SEK"

## Integration Points

✅ Automatic Payout Service (payoutService.ts)
- Attempts automatic payout to bank account
- Falls back to manual if automatic fails
- Both work with new bank account requirement

✅ Admin Panel (WithdrawalAdmin.tsx)
- Shows payout status
- Shows manual/automatic payout method
- Works with new requirement

✅ Withdrawal Routes
- Profile query fixed (no email field)
- Bank account validation added
- Currency corrected to SEK

## No Breaking Changes
- Existing withdrawal logic unchanged
- Only blocks NEW withdrawals without bank account
- Old withdrawals unaffected
- Admin workflows still work
