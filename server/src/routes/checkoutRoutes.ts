import { Router, Request, Response } from 'express';
import { stripe } from '../services/stripe';

export const checkoutRouter = Router();

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for a given price ID.
 * On success, returns the session URL for frontend redirection.
 */
checkoutRouter.post('/create-session', async (req: Request, res: Response) => {
  const { priceId } = req.body;

  if (!priceId) {
    return res.status(400).json({ statusCode: 400, message: 'Missing required parameter: priceId' });
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
      mode: 'payment', // Use 'subscription' for recurring payments
      success_url: successUrl,
      cancel_url: cancelUrl,
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
 * after the user is redirected from Stripe.
 */
checkoutRouter.get('/session-status', async (req, res) => {
  const sessionId = req.query.session_id as string;

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is missing' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const isPaid = 
      session.payment_status === 'paid' ||
      session.payment_intent?.status === 'succeeded';

    if (isPaid) {
      return res.json({ status: 'complete' });
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
