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
    } else {
      // For regular products, use the price ID
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        profileId: profileId,
        ...(isTipPayment && { tipId: tipId })
      },
    });

    if (!session.url) {
      throw new Error('Could not create Stripe session URL.');
    }
    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe session creation failed:', error.message);
    console.error('Full error:', error);
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
      const tipId = session.metadata?.tipId;
      const customerEmail = session.customer_email || paymentIntent?.receipt_email;

      // If this is a tip payment, update the tip record and increment artist's saldo
      if (tipId) {
        try {
          const tipAmount = (session.amount_total || 0) / 100; // Convert from cents to dollars
          
          // Mark tip as completed
          const { data: updateResponse, error: tipError } = await supabase
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
          const { data: profileData, error: fetchError } = await supabase
            .from('profiles')
            .select('saldo')
            .eq('id', profileId)
            .single();

          if (fetchError) {
            console.error('Error fetching current saldo:', fetchError);
          } else {
            const currentSaldo = profileData?.saldo || 0;
            const newSaldo = currentSaldo + tipAmount;

            const { error: saldoError } = await supabase
              .from('profiles')
              .update({ saldo: newSaldo })
              .eq('id', profileId);

            if (saldoError) {
              console.error('Error updating artist saldo:', saldoError);
            }
          }
        } catch (err) {
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
        type: 'order',
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
