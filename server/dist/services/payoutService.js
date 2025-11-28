"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripePayout = createStripePayout;
exports.getPayoutDetails = getPayoutDetails;
exports.listPayouts = listPayouts;
exports.cancelPayout = cancelPayout;
exports.getStripeBalance = getStripeBalance;
exports.createBankAccountToken = createBankAccountToken;
const stripe_1 = require("./stripe");
const supabase_1 = require("../lib/supabase");
/**
 * Create a Stripe payout to an artist's account
 * Supports both direct bank transfers and Stripe Connect
 * Falls back to manual payout if automatic fails
 */
function createStripePayout(request) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Convert to cents (SEK)
            const amountInCents = Math.round(request.amount * 100);
            // Get app's Stripe balance first to verify funds
            const balance = yield stripe_1.stripe.balance.retrieve();
            const sek_balance = balance.available.find(b => b.currency === 'sek');
            const availableBalance = (sek_balance === null || sek_balance === void 0 ? void 0 : sek_balance.amount) || 0;
            if (availableBalance < amountInCents) {
                return {
                    success: false,
                    error: `Insufficient funds in Stripe account. Available: ${(availableBalance / 100).toFixed(2)} SEK, Requested: ${request.amount.toFixed(2)} SEK`
                };
            }
            try {
                // Try to create automatic payout
                const payout = yield stripe_1.stripe.payouts.create({
                    amount: amountInCents,
                    currency: 'sek',
                    method: 'instant',
                    description: `Payout for artist withdrawal`,
                    statement_descriptor: 'GoBusker Artist Payout'
                });
                // Update withdrawal record with payout ID
                yield supabase_1.supabase
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
            }
            catch (payoutErr) {
                // If automatic payout fails, mark as manual payout needed
                const errorMsg = payoutErr.message || 'Automatic payout failed';
                console.warn(`Automatic payout failed, marking for manual transfer: ${errorMsg}`);
                // Still mark the withdrawal as approved, but flag it for manual payout
                yield supabase_1.supabase
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
        }
        catch (err) {
            const errorMessage = err.message || 'Unknown error creating payout';
            console.error('Stripe payout error:', errorMessage);
            // Update withdrawal with error
            yield supabase_1.supabase
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
    });
}
/**
 * Get payout details from Stripe
 */
function getPayoutDetails(payoutId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const payout = yield stripe_1.stripe.payouts.retrieve(payoutId);
            return payout;
        }
        catch (err) {
            console.error('Error retrieving payout:', err);
            throw err;
        }
    });
}
/**
 * Get all payouts for a specific time period
 */
function listPayouts() {
    return __awaiter(this, arguments, void 0, function* (limit = 10, starting_after) {
        try {
            const payouts = yield stripe_1.stripe.payouts.list(Object.assign({ limit }, (starting_after && { starting_after })));
            return payouts.data;
        }
        catch (err) {
            console.error('Error listing payouts:', err);
            throw err;
        }
    });
}
/**
 * Cancel a pending payout
 */
function cancelPayout(payoutId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const payout = yield stripe_1.stripe.payouts.cancel(payoutId);
            console.log(`Payout cancelled: ${payoutId}`);
            return {
                success: true,
                payoutId: payout.id
            };
        }
        catch (err) {
            const errorMessage = err.message || 'Unknown error cancelling payout';
            console.error('Error cancelling payout:', errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }
    });
}
/**
 * Get Stripe account balance
 */
function getStripeBalance() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const balance = yield stripe_1.stripe.balance.retrieve();
            return {
                available: balance.available.map(b => ({ amount: b.amount / 100, currency: b.currency })),
                pending: balance.pending.map(b => ({ amount: b.amount / 100, currency: b.currency })),
                instant_available: ((_a = balance.instant_available) === null || _a === void 0 ? void 0 : _a.map(b => ({ amount: b.amount / 100, currency: b.currency }))) || []
            };
        }
        catch (err) {
            console.error('Error retrieving Stripe balance:', err);
            throw err;
        }
    });
}
/**
 * Create a bank account token for direct transfers
 * This would require collecting bank details securely
 */
function createBankAccountToken(bankDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = yield stripe_1.stripe.tokens.create({
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
        }
        catch (err) {
            console.error('Error creating bank account token:', err);
            throw err;
        }
    });
}
