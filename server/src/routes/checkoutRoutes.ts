import { Router, Request, Response } from 'express';
import { stripe } from '../services/stripe';
import { supabase } from '../lib/supabase';

export const checkoutRouter = Router();

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for a given price ID.
 * On success, returns the session URL for frontend redirection.
 */
checkoutRouter.post('/create-session', async (req: Request, res: Response) => {
  const { priceId, profileId, email } = req.body;

  if (!priceId) {
    return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: priceId' });
  }

  if (!profileId) {
    return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: profileId' });
  }

  if (!email) {
    return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: email' });
  }

  // Use environment variables for frontend URLs to support different environments (dev, prod).
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const successUrl = `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendUrl}/payment/cancel`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email, // Capture the customer email
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        profileId: profileId,
      },
    });

    if (!session.url) {
      throw new Error('Could not create Stripe session URL.');
    }

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe session creation failed:', error);
    res.status(500).json({ statusCode: 500, message: error.message });
  }
});

/**
 * GET /api/checkout/session-status
 *
 * Retrieves the status of a Stripe Checkout session to verify payment
 * after the user is redirected from Stripe. Also fetches order details
 * and saves the order to the database.
 */
checkoutRouter.get('/session-status', async (req, res) => {
  const sessionId = req.query.session_id as string;

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is missing' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    });

    const isPaid = 
      session.payment_status === 'paid' ||
      (typeof session.payment_intent === 'object' && session.payment_intent?.status === 'succeeded');

    if (isPaid) {
      // Fetch full payment intent details to get more information
      const paymentIntent = session.payment_intent as any;
      const profileId = session.metadata?.profileId;
      const customerEmail = session.customer_email || paymentIntent?.receipt_email;
      
      console.log('Payment successful - Session details:', {
        sessionId,
        customerEmail,
        profileId,
        totalAmount: session.amount_total,
        currency: session.currency
      });
      
      // Prepare order data
      const orderData = {
        profile_id: profileId,
        stripe_session_id: sessionId,
        stripe_payment_intent_id: paymentIntent?.id,
        customer_email: customerEmail,
        customer_name: session.customer_details?.name,
        total_amount: session.amount_total, // in cents
        currency: session.currency?.toUpperCase() || 'USD',
        payment_status: session.payment_status,
        payment_method: session.payment_method_types?.[0],
        items: session.line_items?.data?.map((item: any) => ({
          id: item.id,
          name: item.description,
          quantity: item.quantity,
          price: item.amount_total, // in cents
          product_id: item.price?.product
        })) || [],
        created_at: new Date(session.created * 1000).toISOString(),
      };

      // Save order to database
      try {
        const { error: dbError } = await supabase
          .from('orders')
          .insert([orderData]);

        if (dbError) {
          console.error('Error saving order to database:', dbError);
        }
      } catch (dbError) {
        console.error('Unexpected error saving order:', dbError);
      }

      return res.json({ 
        status: 'complete',
        ...orderData
      });
    }

    return res.json({
      status: session.payment_status,
      message: `Payment status: ${session.payment_status}`
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error fetching payment session',
    });
  }
});
