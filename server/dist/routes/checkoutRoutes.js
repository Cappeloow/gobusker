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
exports.checkoutRouter = void 0;
const express_1 = require("express");
const stripe_1 = require("../services/stripe");
const supabase_1 = require("../lib/supabase");
exports.checkoutRouter = (0, express_1.Router)();
/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for a given price ID.
 * On success, returns the session URL for frontend redirection.
 */
exports.checkoutRouter.post('/create-session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { priceId, profileId, email, tipId, tipAmount } = req.body;
    if (!profileId) {
        return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: profileId' });
    }
    if (!email) {
        return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: email' });
    }
    // Check if this is a tip payment or regular product purchase
    const isTipPayment = !!tipId && !!tipAmount;
    if (!isTipPayment && !priceId) {
        return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: priceId' });
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/payment/cancel`;
    try {
        let lineItems;
        if (isTipPayment) {
            // For tips, create a custom line item
            lineItems = [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Support Artist Tip',
                            description: 'Thank you for tipping this artist!'
                        },
                        unit_amount: tipAmount, // already in cents
                    },
                    quantity: 1,
                },
            ];
        }
        else {
            // For regular products, use the price ID
            lineItems = [
                {
                    price: priceId,
                    quantity: 1,
                },
            ];
        }
        const session = yield stripe_1.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: email,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: Object.assign({ profileId: profileId }, (isTipPayment && { tipId: tipId })),
        });
        if (!session.url) {
            throw new Error('Could not create Stripe session URL.');
        }
        res.status(200).json({ url: session.url });
    }
    catch (error) {
        console.error('Stripe session creation failed:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ statusCode: 500, message: error.message });
    }
}));
/**
 * GET /api/checkout/session-status
 *
 * Retrieves the status of a Stripe Checkout session to verify payment
 * after the user is redirected from Stripe. Also fetches order details
 * and saves the order to the database.
 */
exports.checkoutRouter.get('/session-status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const sessionId = req.query.session_id;
    if (!sessionId) {
        return res.status(400).json({ message: 'Session ID is missing' });
    }
    try {
        const session = yield stripe_1.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent', 'line_items'],
        });
        const isPaid = session.payment_status === 'paid' ||
            (typeof session.payment_intent === 'object' && ((_a = session.payment_intent) === null || _a === void 0 ? void 0 : _a.status) === 'succeeded');
        if (isPaid) {
            // Fetch full payment intent details to get more information
            const paymentIntent = session.payment_intent;
            const profileId = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.profileId;
            const tipId = (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.tipId;
            const customerEmail = session.customer_email || (paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.receipt_email);
            // If this is a tip payment, update the tip record and increment artist's saldo
            if (tipId) {
                try {
                    const tipAmount = (session.amount_total || 0) / 100; // Convert from cents to dollars
                    // Mark tip as completed
                    const { data: updateResponse, error: tipError } = yield supabase_1.supabase
                        .from('tips')
                        .update({
                        payment_status: 'completed',
                        stripe_session_id: sessionId
                    })
                        .eq('id', tipId)
                        .select();
                    if (tipError) {
                        console.error('Error updating tip payment status:', tipError);
                    }
                    // Get current saldo and increment it
                    const { data: profileData, error: fetchError } = yield supabase_1.supabase
                        .from('profiles')
                        .select('saldo')
                        .eq('id', profileId)
                        .single();
                    if (fetchError) {
                        console.error('Error fetching current saldo:', fetchError);
                    }
                    else {
                        const currentSaldo = (profileData === null || profileData === void 0 ? void 0 : profileData.saldo) || 0;
                        const newSaldo = currentSaldo + tipAmount;
                        const { error: saldoError } = yield supabase_1.supabase
                            .from('profiles')
                            .update({ saldo: newSaldo })
                            .eq('id', profileId);
                        if (saldoError) {
                            console.error('Error updating artist saldo:', saldoError);
                        }
                    }
                }
                catch (err) {
                    console.error('Error processing tip payment:', err);
                }
                return res.json({
                    status: 'complete',
                    type: 'tip',
                    tipId: tipId,
                    message: 'Tip payment successful'
                });
            }
            // Regular product order handling
            const orderData = {
                profile_id: profileId,
                stripe_session_id: sessionId,
                stripe_payment_intent_id: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id,
                customer_email: customerEmail,
                customer_name: (_d = session.customer_details) === null || _d === void 0 ? void 0 : _d.name,
                total_amount: session.amount_total, // in cents
                currency: ((_e = session.currency) === null || _e === void 0 ? void 0 : _e.toUpperCase()) || 'USD',
                payment_status: session.payment_status,
                payment_method: (_f = session.payment_method_types) === null || _f === void 0 ? void 0 : _f[0],
                items: ((_h = (_g = session.line_items) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.map((item) => {
                    var _a;
                    return ({
                        id: item.id,
                        name: item.description,
                        quantity: item.quantity,
                        price: item.amount_total, // in cents
                        product_id: (_a = item.price) === null || _a === void 0 ? void 0 : _a.product
                    });
                })) || [],
                created_at: new Date(session.created * 1000).toISOString(),
            };
            // Save order to database
            try {
                const { error: dbError } = yield supabase_1.supabase
                    .from('orders')
                    .insert([orderData]);
                if (dbError) {
                    console.error('Error saving order to database:', dbError);
                }
            }
            catch (dbError) {
                console.error('Unexpected error saving order:', dbError);
            }
            return res.json(Object.assign({ status: 'complete', type: 'order' }, orderData));
        }
        return res.json({
            status: session.payment_status,
            message: `Payment status: ${session.payment_status}`
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error fetching payment session',
        });
    }
}));
