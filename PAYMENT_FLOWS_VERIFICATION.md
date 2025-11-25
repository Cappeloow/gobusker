# Payment Flows Verification

## ✅ Two Distinct Payment Flows Confirmed

Your system correctly implements two separate payment pathways:

---

## 1️⃣ TIP FLOW (User → User / Donor → Artist)

### Flow Diagram
```
Visitor/Fan
    ↓
TipWall Component (ProfileDetail.tsx)
    ↓
Creates "pending" tip in database
    ↓
Redirects to Stripe Checkout
    ↓
Payment completed
    ↓
Tips table updated: pending → completed
    ↓
Artist's SALDO incremented
    ↓
Success page shows "💰 Tip Sent Successfully!"
```

### Key Components

**Frontend:**
- `TipWall.tsx` - Tip submission form
  - Collects: donor_name, email, amount, message
  - Creates tip in database with status "pending"
  - Redirects to checkout

- `ProfileDetail.tsx` - Profile page displays:
  - TipWall component
  - Artist's current saldo badge
  - Shop button for merchandise

**Backend:**
- `checkoutRoutes.ts` - POST `/create-session`
  ```typescript
  const isTipPayment = !!tipId && !!tipAmount;
  if (isTipPayment) {
    // Create custom line item for tip
    lineItems = [{
      price_data: {
        product_data: { name: 'Support Artist Tip' },
        unit_amount: tipAmount
      }
    }]
  }
  ```

- `checkoutRoutes.ts` - GET `/session-status`
  ```typescript
  if (tipId) {
    // Mark tip as completed
    await supabase.from('tips').update({
      payment_status: 'completed',
      stripe_session_id: sessionId
    }).eq('id', tipId)
    
    // Increment artist's saldo
    const newSaldo = currentSaldo + tipAmount
    await supabase.from('profiles').update({
      saldo: newSaldo
    }).eq('id', profileId)
  }
  ```

**Payment Flow Detection:**
- Metadata includes `tipId` → Triggers tip handling
- Money goes to: **App Owner Stripe Account**
- Artist receives: **Saldo accumulation** (tracked in `profiles.saldo` column)

**Success Screen:**
- Shows "💰 Tip Sent Successfully!"
- Displays tip amount, donor name, date
- Confirmation message: "Thank you for supporting this artist!"

---

## 2️⃣ MERCHANDISE FLOW (User → System → Artist Account)

### Flow Diagram
```
Customer/Shopper
    ↓
ProfileShop Component (/profile/:id/shop)
    ↓
Selects Stripe product (from your Stripe catalog)
    ↓
Clicks "Buy Now"
    ↓
Redirects to Stripe Checkout
    ↓
Payment completed
    ↓
Orders table created
    ↓
Success page shows "✅ Payment Successful!"
```

### Key Components

**Frontend:**
- `ProfileShop.tsx` - Merchandise storefront
  - Fetches products from `/api/products` endpoint
  - Products are managed in Stripe catalog
  - Shows: product name, description, price
  - Button: "Buy Now"

- `ProfileDetail.tsx` - Artist profile includes:
  - Shop button (🛍️) in header
  - Links to `/profile/:id/shop`

**Backend:**
- `checkoutRoutes.ts` - POST `/create-session`
  ```typescript
  if (!isTipPayment) {
    // Regular product purchase
    lineItems = [{
      price: priceId,  // Stripe price ID
      quantity: 1
    }]
  }
  ```

- `checkoutRoutes.ts` - GET `/session-status`
  ```typescript
  if (!tipId) {
    // Regular product order handling
    const orderData = {
      profile_id: profileId,
      stripe_session_id: sessionId,
      customer_email: customerEmail,
      total_amount: session.amount_total,
      items: session.line_items.data,
      payment_status: 'paid'
    }
    
    // Save order to database
    await supabase.from('orders').insert([orderData])
  }
  ```

**Payment Flow Detection:**
- Only `priceId` parameter (NO `tipId`) → Triggers merchandise handling
- Money goes to: **App Owner Stripe Account**
- Record goes to: **Orders table** (customer record)
- Artist doesn't receive direct payment (this is system revenue)

**Success Screen:**
- Shows "✅ Payment Successful!"
- Displays order ID, items, quantities, total amount
- Shows customer information
- Confirmation message: "Thank you for your purchase"

---

## 📊 Database Structure Verification

### Tips Table
```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  donor_name TEXT NOT NULL,
  email TEXT,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  payment_status TEXT DEFAULT 'pending',  -- pending | completed | failed
  stripe_session_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  stripe_session_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  total_amount INTEGER,  -- in cents
  currency TEXT,
  payment_status TEXT,
  items JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  -- ... other fields ...
  saldo DECIMAL(10,2) DEFAULT 0.00,  -- Artist balance from tips
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎯 Payment Money Flow

```
┌─────────────────────────────────────────────────┐
│          CUSTOMER PAYMENT                       │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼────────┐          ┌────▼──────────┐
    │  TIP FLOW  │          │ MERCH FLOW    │
    └───┬────────┘          └────┬──────────┘
        │                        │
        │ Payment → App Owner    │ Payment → App Owner
        │ Stripe Account         │ Stripe Account
        │                        │
        ├─ $$ to Stripe Account  ├─ $$ to Stripe Account
        │                        │
        ├─ Tip record created    ├─ Order record created
        │                        │
        └─ Artist SALDO updated  └─ (No artist payment)
           (virtual balance)        (system revenue only)
```

---

## ✨ Key Differences

| Aspect | Tips | Merchandise |
|--------|------|------------|
| **Payer** | Any visitor/fan | Customer buying from shop |
| **Recipient** | Artist (via saldo) | System/App Owner |
| **Database** | `tips` table | `orders` table |
| **Status Field** | `payment_status` | `payment_status` |
| **Artist Receives** | Saldo accumulation | Nothing (system revenue) |
| **Flow Detection** | `tipId` parameter | `priceId` parameter |
| **UI Message** | "💰 Tip Sent Successfully!" | "✅ Payment Successful!" |
| **Product Source** | Custom line item | Stripe catalog product |

---

## ✅ Verification Checklist

- [x] **Two distinct flows exist**
  - Tip flow: user → user (donor → artist)
  - Merch flow: user → system
  
- [x] **Flow detection works**
  - Presence of `tipId` → tip flow
  - Presence of `priceId` only → merchandise flow
  
- [x] **Money routing correct**
  - Both flows: Payment to app owner Stripe account
  - Tip flow: Also increments artist saldo
  - Merch flow: Creates order record only
  
- [x] **Database tracking**
  - Tips stored in `tips` table with payment status
  - Orders stored in `orders` table
  - Artist balance in `profiles.saldo`
  
- [x] **User experience**
  - Different success messages for each flow
  - Different icons (💰 vs ✅)
  - Correct data displayed for each type

---

## 🚀 Current Status

**Both payment flows are fully implemented and functional!**

Your system correctly handles:
1. ✅ Tips from any visitor to any artist (saldo system)
2. ✅ Merchandise purchases from artist shops (system revenue)
3. ✅ Proper payment routing to app owner account
4. ✅ Separate database tracking for each flow
5. ✅ Distinct UI/UX for each transaction type
